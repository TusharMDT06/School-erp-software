const mongoose = require("mongoose");
const dns = require("dns");
const net = require("net");

/**
 * Configure RFC 6052 NAT64 compatibility for MongoDB Atlas on IPv6/NAT64 networks
 * (e.g. Jio/Airtel cellular or fiber networks where direct IPv4 port 27017 drops packets).
 */
function toNat64(ipv4) {
  const parts = ipv4.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return ipv4;
  const hex =
    ((parts[0] << 8) | parts[1]).toString(16).padStart(4, "0") +
    ":" +
    ((parts[2] << 8) | parts[3]).toString(16).padStart(4, "0");
  return `64:ff9b::${hex}`;
}

let isNat64Enabled = false;
let nat64Checked = false;

const checkNat64Support = () => {
  if (nat64Checked) return Promise.resolve(isNat64Enabled);
  return new Promise((resolve) => {
    const socket = net.createConnection(
      { host: "64:ff9b::225d:1993", port: 27017, timeout: 1500 },
      () => {
        isNat64Enabled = true;
        nat64Checked = true;
        socket.destroy();
        resolve(true);
      }
    );
    socket.on("error", () => {
      nat64Checked = true;
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      nat64Checked = true;
      resolve(false);
    });
  });
};

// Hook dns.lookup specifically for mongodb.net domains so IPv4 addresses are safely translated
// to NAT64 IPv6 addresses on networks where direct IPv4 to port 27017 is not routable.
const origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  origLookup(hostname, options, (err, address, family) => {
    if (!err && isNat64Enabled && hostname && hostname.includes("mongodb.net")) {
      if (Array.isArray(address)) {
        address = address.map((a) =>
          a.family === 4 ? { address: toNat64(a.address), family: 6 } : a
        );
      } else if (family === 4) {
        address = toNat64(address);
        family = 6;
      }
    }
    callback(err, address, family);
  });
};

// Global connection event listeners
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ [MongoDB] Connection lost. Automatic reconnection in progress...");
});
mongoose.connection.on("reconnected", () => {
  console.log("✅ [MongoDB] Reconnected successfully.");
});
mongoose.connection.on("error", (err) => {
  console.warn("⚠️ [MongoDB] Connection warning:", err.message);
});

/**
 * Connect to MongoDB with retry logic and resilient pooling options.
 * Exits the process if connection fails after retries.
 */
const connectDB = async (retries = 5) => {
  await checkNat64Support();

  while (retries > 0) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
        heartbeatFrequencyMS: 10000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      retries -= 1;
      console.error(`❌ MongoDB connection failed. Retries left: ${retries}`);
      console.error(error.message);

      if (retries === 0) {
        console.error("MongoDB connection failed after all retries. Exiting.");
        process.exit(1);
      }
      // Wait 3 seconds before retrying
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
};

module.exports = connectDB;
