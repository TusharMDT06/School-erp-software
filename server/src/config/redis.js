/**
 * redis.js — Lightweight Redis/Upstash client wrapper.
 * Falls back gracefully if REDIS_URL is not configured.
 */

let client = null;

const initRedis = async () => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (!redisUrl) {
    console.warn("[Redis] No REDIS_URL configured — caching disabled.");
    return null;
  }

  try {
    const Redis = require("ioredis");
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    await client.connect();
    console.log("[Redis] Connected.");
    return client;
  } catch (err) {
    console.warn("[Redis] Connection failed — caching disabled:", err.message);
    client = null;
    return null;
  }
};

const getRedis = () => client;

const safeGet = async (key) => {
  try {
    if (!client) return null;
    return await client.get(key);
  } catch { return null; }
};

const safeSet = async (key, value, ttlSeconds = 60) => {
  try {
    if (!client) return;
    await client.set(key, value, "EX", ttlSeconds);
  } catch { /* silent */ }
};

const safeDel = async (...keys) => {
  try {
    if (!client) return;
    await client.del(...keys);
  } catch { /* silent */ }
};

module.exports = { initRedis, getRedis, safeGet, safeSet, safeDel };
