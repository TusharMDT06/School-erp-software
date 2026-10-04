require("dotenv").config();
const { initRedis, safeSet, safeGet, getCacheHealth } = require("./src/config/redis");

async function test() {
  console.log("==========================================");
  console.log("   UPSTASH REDIS CONNECTION DIAGNOSTIC   ");
  console.log("==========================================");
  console.log("Current REDIS_URL in .env:", process.env.REDIS_URL ? "Configured (Hidden for security)" : "NOT SET");
  
  if (!process.env.REDIS_URL && !process.env.UPSTASH_REDIS_URL) {
    console.log("\n❌ REDIS_URL is missing in server/.env!");
    console.log("Please add your Upstash connection string to server/.env:");
    console.log('REDIS_URL="rediss://default:<YOUR_PASSWORD>@tough-tadpole-325142.upstash.io:6379"');
    process.exit(1);
  }

  console.log("\nConnecting to Redis...");
  const client = await initRedis();

  if (!client) {
    console.log("\n❌ Failed to connect to Redis. Check your password or network connection.");
    process.exit(1);
  }

  console.log("\nWriting test key to Upstash Redis: 'school_erp:test_ping'...");
  await safeSet("school_erp:test_ping", { message: "Hello from School ERP!", timestamp: new Date().toISOString() }, 120);

  console.log("Reading test key back from Upstash Redis...");
  const data = await safeGet("school_erp:test_ping");
  console.log("Value retrieved:", data);

  const health = await getCacheHealth();
  console.log("\n✅ Redis Health Status:", JSON.stringify(health, null, 2));
  console.log("\n🎉 Upstash Redis is active and functioning perfectly!");
  process.exit(0);
}

test().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
