require("dotenv").config();
const mongoose = require("mongoose");

// Load all needed models
require("./src/models/FeeStructure.model");
require("./src/models/FeeTransaction.model");
require("./src/models/Student.model");
require("./src/models/User.model");
require("./src/models/ClassSection.model");
require("./src/models/CallLog.model");

const { makeCall } = require("./src/services/voiceCall.service");
const { sendSMS } = require("./src/services/sms.service");
const { sendWhatsApp } = require("./src/services/whatsapp.service");

// ─── CONFIG ────────────────────────────────────────────────────────────────
// ⚠️ IMPORTANT: Twilio trial account mein sirf "Verified" numbers ko call/SMS ho sakta hai
// Apna verified number yahan daalein (Twilio Console > Verified Caller IDs mein add karein)
const TEST_PHONE = "+919027805934"; // <-- aapka verified number

const DUMMY_USER_ID = new mongoose.Types.ObjectId();
const DUMMY_ENTITY_ID = new mongoose.Types.ObjectId();

const testMessage =
  "नमस्ते। यह स्कूल ईआरपी से स्वचालित कॉल है। आपके बच्चे रवि शर्मा की फीस पाँच हज़ार रुपये बकाया है। कृपया जल्द से जल्द भुगतान करें। धन्यवाद।";

async function runDemo() {
  console.log("=".repeat(55));
  console.log("📞 TWILIO MULTI-CHANNEL ALERT — LIVE DEMO");
  console.log("=".repeat(55));
  console.log(`\n📱 Target : ${TEST_PHONE}`);
  console.log(`🔑 SID    : ${(process.env.TWILIO_ACCOUNT_SID || "").slice(0, 12)}...`);
  console.log(`📡 From   : ${process.env.TWILIO_PHONE_NUMBER}`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected\n");

  // ─── TEST 1: Voice Call (main demo) ────────────────────────────────────────
  console.log("─".repeat(55));
  console.log("📞 TEST 1: Voice Call (Amazon Polly.Aditi Hindi TTS)");
  console.log("   Aapke phone par 5-15 sec mein ring aayegi...");
  console.log("   ⚠️  IMPORTANT (Trial Account): Phone pick karne par jab English me");
  console.log("   'Press any key...' bole, turant keypad par '1' dabayein!");
  console.log("   Key press karte hi Hindi me Polly.Aditi bolna shuru karegi.\n");

  const callLog = await makeCall({
    parentUserId: DUMMY_USER_ID,
    parentPhone: TEST_PHONE,
    message: testMessage,
    reason: "fee_overdue",
    relatedEntityId: DUMMY_ENTITY_ID,
  });

  if (callLog.callStatus === "initiated") {
    console.log(`✅ CALL INITIATED SUCCESSFULLY!`);
    console.log(`   Twilio Call SID: ${callLog.twilioCallSid}`);
    console.log(`   📱 Phone pick karke '1' press karein aur Hindi message sunein!`);
  } else {
    console.log(`❌ Call Status: ${callLog.callStatus}`);
    console.log(`   SMS Fallback: ${callLog.smsFallbackStatus}`);
    console.log(`   WA Fallback : ${callLog.whatsappFallbackStatus}`);
  }

  // ─── TEST 2: SMS ───────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(55));
  console.log("📱 TEST 2: SMS (Indian DLT restrictions apply for trial)");
  const smsResult = await sendSMS({ to: TEST_PHONE, message: testMessage });
  if (smsResult.success) {
    console.log(`✅ SMS Sent! SID: ${smsResult.sid}`);
  } else {
    console.log(`⚠️  SMS Error: ${smsResult.error}`);
    console.log(`   [India mein trial account SMS ke liye DLT registration chahiye]`);
  }

  // ─── TEST 3: WhatsApp ─────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(55));
  console.log("💬 TEST 3: WhatsApp (Sandbox)");
  console.log("   Pehle apne WhatsApp se +14155238886 par");
  console.log(`   'join <your-sandbox-keyword>' message bhejein`);
  const waResult = await sendWhatsApp({ to: TEST_PHONE, message: testMessage });
  if (waResult.success) {
    console.log(`✅ WhatsApp Sent! SID: ${waResult.sid}`);
  } else {
    console.log(`⚠️  WhatsApp Error: ${waResult.error}`);
  }

  await mongoose.disconnect();

  console.log("\n" + "=".repeat(55));
  console.log("✅ DEMO COMPLETE");
  console.log("=".repeat(55));
  console.log("\n📌 Trial Account Limitations:");
  console.log("   • Voice: Sirf verified numbers ko call hogi (Twilio Console mein verify karein)");
  console.log("   • SMS: India mein DLT template registration zaroori hai");
  console.log("   • WhatsApp: Sandbox join keyword chahiye");
  console.log("   • Paid account upgrade karein to remove all limits\n");
}

runDemo().catch((err) => {
  console.error("❌ Demo error:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
