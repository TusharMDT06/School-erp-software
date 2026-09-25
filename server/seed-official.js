/**
 * Seed Official School Data
 * Populates complete realistic data for St. Xavier's Public School (Official)
 * Run with: node seed-official.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const School = require("./src/models/School.model");
const User = require("./src/models/User.model");
const Teacher = require("./src/models/Teacher.model");
const ClassSection = require("./src/models/ClassSection.model");
const Student = require("./src/models/Student.model");
const Attendance = require("./src/models/Attendance.model");
const FeeStructure = require("./src/models/FeeStructure.model");
const FeeTransaction = require("./src/models/FeeTransaction.model");
const Exam = require("./src/models/Exam.model");
const Result = require("./src/models/Result.model");

const seedOfficialSchool = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // 1. Locate Official School
    let officialSchool = await School.findOne({ contactEmail: "tusharrajput857@gmail.com" });
    if (!officialSchool) {
      officialSchool = await School.create({
        name: "St. Xavier's Public School (Official)",
        address: "Main Institutional Campus, New Delhi - 110001",
        contactEmail: "tusharrajput857@gmail.com",
        contactPhone: "+91 98765 43210",
        logoUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80",
        isActive: true,
      });
      console.log("🏫 Created Official School:", officialSchool.name);
    } else {
      console.log("🏫 Found Official School:", officialSchool.name, officialSchool._id);
    }

    // Ensure Tushar's user is linked to official school
    await User.findOneAndUpdate(
      { email: "tusharrajput857@gmail.com" },
      { schoolId: officialSchool._id, role: "superadmin" }
    );

    // 2. Clean existing official school data to prevent duplicate seeds
    console.log("🧹 Cleaning old official school collections...");
    const existingClasses = await ClassSection.find({ schoolId: officialSchool._id }).select("_id");
    const classIds = existingClasses.map((c) => c._id);

    const existingTeachersUsers = await User.find({ schoolId: officialSchool._id, email: { $ne: "tusharrajput857@gmail.com" } }).select("_id");
    const teacherUserIds = existingTeachersUsers.map((u) => u._id);

    const existingFeeStructures = await FeeStructure.find({ schoolId: officialSchool._id }).select("_id");
    const feeStructureIds = existingFeeStructures.map((f) => f._id);

    const existingExams = await Exam.find({ schoolId: officialSchool._id }).select("_id");
    const examIds = existingExams.map((e) => e._id);

    await Promise.all([
      FeeTransaction.deleteMany({ $or: [{ feeStructureId: { $in: feeStructureIds } }, { receiptNumber: { $regex: "^OFF-REC" } }] }),
      Result.deleteMany({ examId: { $in: examIds } }),
      Student.deleteMany({ classId: { $in: classIds } }),
      Teacher.deleteMany({ userId: { $in: teacherUserIds } }),
      User.deleteMany({ _id: { $in: teacherUserIds } }),
      Attendance.deleteMany({ classId: { $in: classIds } }),
      FeeStructure.deleteMany({ schoolId: officialSchool._id }),
      Exam.deleteMany({ schoolId: officialSchool._id }),
      ClassSection.deleteMany({ schoolId: officialSchool._id }),
    ]);
    console.log("✨ Cleaned existing official school data.");

    // 3. Create Teachers
    console.log("👩‍🏫 Creating Official Teachers...");
    const teacherData = [
      {
        name: "Vikramaditya Verma",
        email: "vikramaditya.maths@official.edu",
        phone: "+91 98111 22334",
        empId: "EMP-OFF-001",
        subjects: ["Mathematics", "Statistics"],
        qualifications: ["M.Sc Mathematics", "B.Ed"],
        salary: 82000,
      },
      {
        name: "Dr. Sunita Mehra",
        email: "sunita.science@official.edu",
        phone: "+91 98222 33445",
        empId: "EMP-OFF-002",
        subjects: ["Physics", "Chemistry"],
        qualifications: ["Ph.D Physics", "B.Ed"],
        salary: 85000,
      },
      {
        name: "Ananya Sen",
        email: "ananya.english@official.edu",
        phone: "+91 98333 44556",
        empId: "EMP-OFF-003",
        subjects: ["English Literature", "Grammar"],
        qualifications: ["M.A English", "B.Ed"],
        salary: 74000,
      },
      {
        name: "Rohan Joshi",
        email: "rohan.cs@official.edu",
        phone: "+91 98444 55667",
        empId: "EMP-OFF-004",
        subjects: ["Computer Science", "Artificial Intelligence"],
        qualifications: ["M.Tech Computer Science"],
        salary: 88000,
      },
    ];

    const teacherDocs = [];
    for (const t of teacherData) {
      const u = await User.create({
        name: t.name,
        email: t.email,
        password: "Password@123",
        role: "teacher",
        schoolId: officialSchool._id,
        phone: t.phone,
        isActive: true,
      });

      const teacherDoc = await Teacher.create({
        userId: u._id,
        employeeId: t.empId,
        subjects: t.subjects,
        qualifications: t.qualifications,
        joiningDate: new Date("2023-04-10"),
        salary: t.salary,
        assignedClasses: [],
      });
      teacherDocs.push(teacherDoc);
    }

    // 4. Create Classes & Sections
    console.log("📚 Creating Classes & Sections...");
    const class10A = await ClassSection.create({
      schoolId: officialSchool._id,
      className: "10",
      section: "A",
      classTeacherId: teacherDocs[0]._id,
      academicYear: "2026-2027",
    });

    const class10B = await ClassSection.create({
      schoolId: officialSchool._id,
      className: "10",
      section: "B",
      classTeacherId: teacherDocs[1]._id,
      academicYear: "2026-2027",
    });

    const class9A = await ClassSection.create({
      schoolId: officialSchool._id,
      className: "9",
      section: "A",
      classTeacherId: teacherDocs[2]._id,
      academicYear: "2026-2027",
    });

    const class12A = await ClassSection.create({
      schoolId: officialSchool._id,
      className: "12",
      section: "A",
      classTeacherId: teacherDocs[3]._id,
      academicYear: "2026-2027",
    });

    // Link classes back to teachers
    await Teacher.findByIdAndUpdate(teacherDocs[0]._id, { assignedClasses: [class10A._id, class9A._id] });
    await Teacher.findByIdAndUpdate(teacherDocs[1]._id, { assignedClasses: [class10B._id] });
    await Teacher.findByIdAndUpdate(teacherDocs[2]._id, { assignedClasses: [class9A._id] });
    await Teacher.findByIdAndUpdate(teacherDocs[3]._id, { assignedClasses: [class12A._id] });

    // 5. Create Parents
    console.log("👨‍👩‍👧 Creating Parents...");
    const parent1 = await User.create({
      name: "Rajesh Malhotra",
      email: "parent1.official@school.edu",
      password: "Password@123",
      role: "parent",
      schoolId: officialSchool._id,
      phone: "+91 99887 76655",
      isActive: true,
    });

    const parent2 = await User.create({
      name: "Kavita Deshmukh",
      email: "parent2.official@school.edu",
      password: "Password@123",
      role: "parent",
      schoolId: officialSchool._id,
      phone: "+91 99887 76656",
      isActive: true,
    });

    // 6. Create Students
    console.log("🎓 Creating Students...");
    const studentsToCreate = [
      {
        name: "Aarav Malhotra",
        email: "aarav.official@school.edu",
        admissionNumber: "ADM-OFF-001",
        dob: "2010-04-12",
        gender: "male",
        classId: class10A._id,
        rollNumber: "01",
        bloodGroup: "O+",
        address: "Flat 402, Royal Palms, New Delhi",
        guardian: parent1._id,
        isAccountActivated: true,
      },
      {
        name: "Diya Sengupta",
        email: "diya.official@school.edu",
        admissionNumber: "ADM-OFF-002",
        dob: "2010-07-25",
        gender: "female",
        classId: class10A._id,
        rollNumber: "02",
        bloodGroup: "A+",
        address: "B-12, Green Park Extension, New Delhi",
        guardian: parent2._id,
        isAccountActivated: true,
      },
      {
        name: "Rohan Verma",
        email: "rohan.official@school.edu",
        admissionNumber: "ADM-OFF-003",
        dob: "2010-01-18",
        gender: "male",
        classId: class10A._id,
        rollNumber: "03",
        bloodGroup: "B+",
        address: "C-45, Vasant Kunj, New Delhi",
        guardian: parent1._id,
        isAccountActivated: true,
      },
      {
        name: "Ananya Roy",
        email: "ananya.official@school.edu",
        admissionNumber: "ADM-OFF-004",
        dob: "2010-11-09",
        gender: "female",
        classId: class10A._id,
        rollNumber: "04",
        bloodGroup: "AB+",
        address: "Tower 2, DLF Phase 5, Gurugram",
        guardian: parent2._id,
        isAccountActivated: true,
      },
      {
        name: "Kabir Singhania",
        email: "kabir.official@school.edu",
        admissionNumber: "ADM-OFF-005",
        dob: "2010-03-30",
        gender: "male",
        classId: class10A._id,
        rollNumber: "05",
        bloodGroup: "O-",
        address: "88, Golf Links, New Delhi",
        guardian: parent1._id,
        isAccountActivated: true,
      },
      {
        name: "Pooja Sharma",
        email: "pooja.official@school.edu",
        admissionNumber: "ADM-OFF-006",
        dob: "2010-09-15",
        gender: "female",
        classId: class10B._id,
        rollNumber: "01",
        bloodGroup: "B+",
        address: "Pocket A, Mayur Vihar, Delhi",
        guardian: parent1._id,
        isAccountActivated: true,
      },
      {
        name: "Siddharth Mehra",
        email: "siddharth.official@school.edu",
        admissionNumber: "ADM-OFF-007",
        dob: "2010-06-21",
        gender: "male",
        classId: class10B._id,
        rollNumber: "02",
        bloodGroup: "A-",
        address: "14, Ring Road, Lajpat Nagar, Delhi",
        guardian: parent2._id,
        isAccountActivated: true,
      },
      {
        name: "Ishaan Patel",
        email: "ishaan.official@school.edu",
        admissionNumber: "ADM-OFF-008",
        dob: "2011-02-14",
        gender: "male",
        classId: class9A._id,
        rollNumber: "01",
        bloodGroup: "O+",
        address: "G-10, Saket, New Delhi",
        guardian: parent1._id,
        isAccountActivated: true,
      },
      {
        name: "Tanvi Saxena",
        email: "tanvi.official@school.edu",
        admissionNumber: "ADM-OFF-009",
        dob: "2011-08-03",
        gender: "female",
        classId: class9A._id,
        rollNumber: "02",
        bloodGroup: "AB-",
        address: "House 204, Greater Kailash 1, Delhi",
        guardian: parent2._id,
        isAccountActivated: true,
      },
      {
        name: "Neha Joshi",
        email: null,
        admissionNumber: "ADM-OFF-010",
        dob: "2010-06-18",
        gender: "female",
        classId: class10A._id,
        rollNumber: "06",
        bloodGroup: "B+",
        address: "A-54, Hauz Khas, New Delhi",
        guardian: parent1._id,
        isAccountActivated: false,
      },
      {
        name: "Vivek Khurana",
        email: null,
        admissionNumber: "ADM-OFF-011",
        dob: "2009-12-05",
        gender: "male",
        classId: class12A._id,
        rollNumber: "01",
        bloodGroup: "O+",
        address: "Plot 19, Sector 14, Dwarka, Delhi",
        guardian: parent2._id,
        isAccountActivated: false,
      },
    ];

    const studentDocs = [];
    for (const s of studentsToCreate) {
      let linkedUser = null;
      if (s.isAccountActivated && s.email) {
        linkedUser = await User.create({
          name: s.name,
          email: s.email,
          password: "Password@123",
          role: "student",
          schoolId: officialSchool._id,
          isActive: true,
        });
      }

      const st = await Student.create({
        name: s.name,
        userId: linkedUser ? linkedUser._id : null,
        isAccountActivated: s.isAccountActivated,
        admissionNumber: s.admissionNumber,
        dob: new Date(s.dob),
        gender: s.gender,
        classId: s.classId,
        rollNumber: s.rollNumber,
        bloodGroup: s.bloodGroup,
        address: s.address,
        guardianIds: [s.guardian],
        admissionDate: new Date("2026-04-01"),
        status: "active",
      });
      studentDocs.push(st);
    }

    // 7. Generate Attendance
    console.log("📅 Generating Attendance Records...");
    const dates = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(9, 0, 0, 0);
      dates.push(d);
    }

    for (const st of studentDocs) {
      for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
        const d = dates[dayIdx];
        let randStatus = "present";
        if (st.rollNumber === "01") {
          randStatus = dayIdx === 5 ? "late" : "present";
        } else if (st.rollNumber === "02") {
          randStatus = dayIdx === 8 ? "leave" : "present";
        } else {
          randStatus = dayIdx % 5 === 0 ? "absent" : dayIdx % 7 === 0 ? "late" : "present";
        }

        await Attendance.create({
          studentId: st._id,
          classId: st.classId,
          date: d,
          status: randStatus,
          remarks: randStatus === "late" ? "Late by 10 mins" : null,
          markedBy: teacherDocs[0]._id,
        });
      }
    }

    // 8. Create Fee Structures & Transactions
    console.log("💰 Creating Fee Structures...");
    const fee10 = await FeeStructure.create({
      schoolId: officialSchool._id,
      classId: class10A._id,
      academicYear: "2026-2027",
      term: "quarterly",
      feeHeads: [
        { name: "Tuition Fee", amount: 20000 },
        { name: "Computer & Science Lab", amount: 4000 },
        { name: "Library & Sports", amount: 2000 },
      ],
      totalAmount: 26000,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    });

    const fee10B = await FeeStructure.create({
      schoolId: officialSchool._id,
      classId: class10B._id,
      academicYear: "2026-2027",
      term: "quarterly",
      feeHeads: [
        { name: "Tuition Fee", amount: 20000 },
        { name: "Computer & Science Lab", amount: 4000 },
        { name: "Library & Sports", amount: 2000 },
      ],
      totalAmount: 26000,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    });

    await FeeTransaction.create({
      studentId: studentDocs[0]._id,
      feeStructureId: fee10._id,
      amountDue: 26000,
      amountPaid: 26000,
      paymentMode: "online",
      status: "paid",
      paidOn: new Date(),
      receiptNumber: "OFF-REC-2026-001",
    });

    await FeeTransaction.create({
      studentId: studentDocs[1]._id,
      feeStructureId: fee10._id,
      amountDue: 26000,
      amountPaid: 26000,
      paymentMode: "cash",
      status: "paid",
      paidOn: new Date(),
      receiptNumber: "OFF-REC-2026-002",
    });

    await FeeTransaction.create({
      studentId: studentDocs[2]._id,
      feeStructureId: fee10._id,
      amountDue: 26000,
      amountPaid: 13000,
      paymentMode: "online",
      status: "partial",
      paidOn: new Date(),
      receiptNumber: "OFF-REC-2026-003",
    });

    await FeeTransaction.create({
      studentId: studentDocs[3]._id,
      feeStructureId: fee10._id,
      amountDue: 26000,
      amountPaid: 0,
      paymentMode: "online",
      status: "overdue",
    });

    // 9. Create Exams & Results
    console.log("📝 Creating Exams & Results...");
    const exam10A = await Exam.create({
      schoolId: officialSchool._id,
      classId: class10A._id,
      examName: "Mid-Term Examination 2026",
      academicYear: "2026-2027",
      subjects: [
        { subjectName: "Mathematics", maxMarks: 100, passingMarks: 35 },
        { subjectName: "Science", maxMarks: 100, passingMarks: 35 },
        { subjectName: "English", maxMarks: 100, passingMarks: 35 },
      ],
      resultPublished: true,
    });

    for (let i = 0; i < 5; i++) {
      const st = studentDocs[i];
      const baseMark = 85 - i * 6;
      const m1 = baseMark + 2;
      const m2 = baseMark - 1;
      const m3 = baseMark + 4;
      const totalObt = m1 + m2 + m3;
      const pct = Math.round((totalObt / 300) * 100);
      let grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : "C";

      await Result.create({
        studentId: st._id,
        examId: exam10A._id,
        marksObtained: [
          { subjectName: "Mathematics", marks: m1 },
          { subjectName: "Science", marks: m2 },
          { subjectName: "English", marks: m3 },
        ],
        totalMarksObtained: totalObt,
        totalMaxMarks: 300,
        percentage: pct,
        grade,
        overallStatus: "pass",
        remarks: "Consistent academic performance.",
        enteredBy: teacherDocs[0]._id,
      });
    }

    console.log("🎉 Official School seeded successfully with 4 Classes, 4 Teachers, 11 Students, Attendance, Fees, and Exams!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seedOfficialSchool();
