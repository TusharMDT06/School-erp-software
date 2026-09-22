require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User.model");
const Student = require("./src/models/Student.model");
const ClassSection = require("./src/models/ClassSection.model");
const Attendance = require("./src/models/Attendance.model");

async function diagnose() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.\n");

  // Find all student-role users
  const studentUsers = await User.find({ role: "student" }).select("name email _id");
  console.log("=== Student-role Users in DB ===");
  for (const u of studentUsers) {
    const student = await Student.findOne({ userId: u._id })
      .populate("classId", "className section");
    console.log(`  User: ${u.name} (${u.email}) | _id: ${u._id}`);
    if (student) {
      console.log(`  ✅ Linked Student: ${student.name} | Class: ${student.classId?.className}-${student.classId?.section} | Roll: ${student.rollNumber}`);
    } else {
      console.log(`  ❌ NO STUDENT RECORD linked to this userId!`);
    }
    console.log();
  }

  // Find students with no userId
  const unlinked = await Student.find({ $or: [{ userId: null }, { userId: { $exists: false } }] })
    .populate("classId", "className section");
  console.log(`=== Students with NO userId (unlinked) ===`);
  unlinked.forEach(s => {
    console.log(`  Student: ${s.name} | Class: ${s.classId?.className}-${s.classId?.section}`);
  });

  await mongoose.disconnect();
  process.exit(0);
}

diagnose().catch(console.error);
