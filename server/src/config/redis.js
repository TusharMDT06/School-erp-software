/**
 * redis.js — Enterprise-grade Redis Client & Dual-Tier Cache Manager.
 * 
 * Features:
 * 1. Primary: Redis (ioredis) connecting via REDIS_URL / UPSTASH_REDIS_URL.
 * 2. Secondary / Fallback: In-Memory TTL Cache (zero crashes if Redis is offline/unconfigured).
 * 3. Automatic JSON serialization & deserialization.
 * 4. Pattern-based cache invalidation (SCAN & unlink).
 * 5. Safe operations (safeGet, safeSet, safeDel, clearCachePattern).
 */

const Redis = require("ioredis");

let client = null;
let isConnected = false;

// In-Memory Fallback Cache Store
const memoryStore = new Map();

// Periodic cleanup of expired in-memory items (every 60s)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memoryStore.entries()) {
    if (v.expiresAt && v.expiresAt < now) {
      memoryStore.delete(k);
    }
  }
}, 60000).unref();

/**
 * Initializes the Redis connection.
 * Falls back seamlessly to In-Memory cache if REDIS_URL is not set or unreachable.
 */
const initRedis = async () => {
  if (client && isConnected) return client;

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

  if (!redisUrl) {
    console.log("ℹ️ [Cache Engine] REDIS_URL not configured — running with High-Speed In-Memory Cache Fallback.");
    isConnected = false;
    return null;
  }

  try {
    console.log("🔄 [Redis] Connecting to Redis instance...");
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 7000,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 5) {
          console.warn("⚠️ [Redis] Reconnect retry limit reached. Falling back to In-Memory cache.");
          isConnected = false;
          return null;
        }
        return Math.min(times * 300, 3000);
      },
    });

    client.on("connect", () => {
      isConnected = true;
      console.log("⚡ [Redis] Connected successfully to Redis server.");
    });

    client.on("ready", () => {
      isConnected = true;
      console.log("✅ [Redis] Ready to accept cache commands.");
    });

    client.on("error", (err) => {
      isConnected = false;
      console.warn("⚠️ [Redis] Connection warning (using in-memory fallback):", err.message);
    });

    client.on("close", () => {
      isConnected = false;
      console.log("⏸️ [Redis] Connection closed.");
    });

    await client.connect();
    return client;
  } catch (err) {
    console.warn("⚠️ [Redis] Initial connection failed (In-Memory cache active):", err.message);
    isConnected = false;
    return null;
  }
};

/**
 * Returns active Redis client if connected, otherwise null.
 */
const getRedis = () => (isConnected ? client : null);

/**
 * Returns true if Redis connection is currently healthy and active.
 */
const isRedisConnected = () => isConnected;

/**
 * Retrieve a value from cache (Redis or Memory Fallback).
 * Automatically parses JSON if possible.
 */
const safeGet = async (key) => {
  if (!key) return null;

  // 1. Try Redis first if connected
  if (isConnected && client) {
    try {
      const raw = await client.get(key);
      if (raw !== null) {
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
    } catch (err) {
      console.warn(`[Redis safeGet Warning] key=${key}:`, err.message);
    }
  }

  // 2. Check In-Memory fallback
  const mem = memoryStore.get(key);
  if (mem) {
    if (!mem.expiresAt || mem.expiresAt > Date.now()) {
      return mem.value;
    }
    memoryStore.delete(key);
  }

  return null;
};

/**
 * Set a key-value pair in cache with expiration in seconds.
 * Automatically serializes objects/arrays to JSON.
 */
const safeSet = async (key, value, ttlSeconds = 60) => {
  if (!key || value === undefined || value === null) return;

  const serialized = typeof value === "object" ? JSON.stringify(value) : String(value);
  const ttl = Math.max(1, parseInt(ttlSeconds, 10) || 60);

  // 1. Set in In-Memory fallback store
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });

  // 2. Set in Redis if connected
  if (isConnected && client) {
    try {
      await client.set(key, serialized, "EX", ttl);
    } catch (err) {
      console.warn(`[Redis safeSet Warning] key=${key}:`, err.message);
    }
  }
};

/**
 * Delete one or more specific keys from cache.
 */
const safeDel = async (...keys) => {
  if (!keys || keys.length === 0) return;

  // 1. Delete from memory store
  for (const k of keys) {
    if (k) memoryStore.delete(k);
  }

  // 2. Delete from Redis if connected
  if (isConnected && client) {
    try {
      const validKeys = keys.filter(Boolean);
      if (validKeys.length > 0) {
        await client.del(...validKeys);
      }
    } catch (err) {
      console.warn("[Redis safeDel Warning]:", err.message);
    }
  }
};

/**
 * Invalidate all keys matching a wildcard pattern (e.g. "dashboard:*", "classes:*").
 */
const clearCachePattern = async (pattern) => {
  if (!pattern) return;

  try {
    // 1. Clear matching keys from In-Memory cache
    const regexPattern = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of memoryStore.keys()) {
      if (regexPattern.test(key)) {
        memoryStore.delete(key);
      }
    }

    // 2. Clear matching keys from Redis using non-blocking SCAN
    if (isConnected && client) {
      const stream = client.scanStream({
        match: pattern,
        count: 100,
      });

      stream.on("data", async (keys) => {
        if (keys.length > 0) {
          const pipeline = client.pipeline();
          keys.forEach((k) => pipeline.unlink(k));
          await pipeline.exec().catch(() => {});
        }
      });
    }
  } catch (err) {
    console.warn(`[Cache clearCachePattern Warning] pattern=${pattern}:`, err.message);
  }
};

/**
 * Returns cache system health & statistics.
 */
const getCacheHealth = async () => {
  let redisStats = null;

  if (isConnected && client) {
    try {
      const info = await client.info("memory");
      redisStats = { connected: true, infoSample: info.substring(0, 150) };
    } catch {
      redisStats = { connected: false };
    }
  }

  return {
    engine: isConnected ? "Redis" : "In-Memory LRU (Fallback)",
    isRedisConnected: isConnected,
    memoryCacheKeysCount: memoryStore.size,
    redis: redisStats,
  };
};

module.exports = {
  initRedis,
  getRedis,
  isRedisConnected,
  safeGet,
  safeSet,
  safeDel,
  clearCachePattern,
  getCacheHealth,
};
