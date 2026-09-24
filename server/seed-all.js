/**
 * Comprehensive Mock Data Seeder for School ERP
 * ─────────────────────────────────────────────
 * Seeds realistic data across all models:
 * - School & Superadmin / Admin / Accountant
 * - Teachers & Classes
 * - Students & Parents
 * - Attendance (Last 14 days including today)
 * - Fee Structures & Transactions (Paid + Partial + Overdue + Pending)
 * - Exams & Evaluated Results (Mid-Term & Mock Exams)
 *
 * Run with: node seed-all.js
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

const seedDatabase = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    console.log("🧹 Cleaning up old collections...");
    await Promise.all([
      School.deleteMany({}),
      User.deleteMany({}),
      Teacher.deleteMany({}),
      ClassSection.deleteMany({}),
      Student.deleteMany({}),
      Attendance.deleteMany({}),
      FeeStructure.deleteMany({}),
      FeeTransaction.deleteMany({}),
      Exam.deleteMany({}),
      Result.deleteMany({}),
    ]);
    console.log("✨ Collections cleared.");

    // ── 1. Create School ─────────────────────────────────────────────────────
    console.log("🏫 Creating School...");
    const school = await School.create({
      name: "St. Xavier's International Academy",
      address: "Sector 42, Institutional Area, New Delhi - 110001",
      contactEmail: "contact@stxaviers.edu",
      contactPhone: "+91 11 2345 6789",
      logoUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80",
      isActive: true,
    });

    // ── 2. Create Staff Users (Superadmin, Principal, Accountant) ────────────
    console.log("👑 Creating Administrative Users...");
    const superadmin = await User.create({
      name: "Super Admin",
      email: "admin@school.edu",
      password: "Admin@123",
      role: "superadmin",
      schoolId: school._id,
      phone: "+91 98765 43210",
      profileImage: "https://res.cloudinary.com/yiuiauvg/image/upload/v1790093339/school_erp/profiles/superadmin_rajesh.jpg",
      isActive: true,
    });

    const superadminTushar = await User.create({
      name: "Tushar Rajput",
      email: "tusharrajput857@gmail.com",
      password: "Admin@123",
      role: "superadmin",
      schoolId: school._id,
      phone: "+91 98765 43210",
      profileImage: "https://res.cloudinary.com/yiuiauvg/image/upload/v1790093339/school_erp/profiles/superadmin_rajesh.jpg",
      isActive: true,
    });

    const principal = await User.create({
      name: "Dr. Rajeshwar Sharma",
      email: "principal@school.edu",
      password: "Admin@123",
      role: "admin",
      schoolId: school._id,
      phone: "+91 98765 43211",
      profileImage: "https://res.cloudinary.com/yiuiauvg/image/upload/v1790093343/school_erp/profiles/admin_principal_rajeshwar.jpg",
      isActive: true,
    });

    const accountant = await User.create({
      name: "Manoj Goyal (Accountant)",
      email: "accountant@school.edu",
      password: "Password@123",
      role: "accountant",
      schoolId: school._id,
      phone: "+91 98765 43212",
      profileImage: "https://res.cloudinary.com/yiuiauvg/image/upload/v1790093347/school_erp/profiles/accountant_manoj.jpg",
      isActive: true,
    });

    // ── 3. Create Teachers ───────────────────────────────────────────────────
    console.log("👩‍🏫 Creating Teachers...");
    const teacherData = [
      {
        name: "Vikram Malhotra",
        email: "vikram.maths@school.edu",
        phone: "+91 98111 22334",
        empId: "EMP-2026-001",
        subjects: ["Mathematics", "Statistics"],
        qualifications: ["M.Sc Mathematics", "B.Ed"],
        salary: 75000,
      },
      {
        name: "Sunita Verma",
        email: "sunita.science@school.edu",
        phone: "+91 98222 33445",
        empId: "EMP-2026-002",
        subjects: ["Physics", "Chemistry"],
        qualifications: ["M.Sc Physics", "B.Ed"],
        salary: 72000,
      },
      {
        name: "Ananya Deshmukh",
        email: "ananya.english@school.edu",
        phone: "+91 98333 44556",
        empId: "EMP-2026-003",
        subjects: ["English Literature", "Grammar"],
        qualifications: ["M.A English", "B.Ed"],
        salary: 68000,
      },
      {
        name: "Rohan Kulkarni",
        email: "rohan.cs@school.edu",
        phone: "+91 98444 55667",
        empId: "EMP-2026-004",
        subjects: ["Computer Science", "Information Tech"],
        qualifications: ["M.Tech Computer Science"],
        salary: 80000,
      },
    ];

    const teacherDocs = [];
    for (const t of teacherData) {
      const u = await User.create({
        name: t.name,
        email: t.email,
        password: "Password@123",
        role: "teacher",
        schoolId: school._id,
        phone: t.phone,
        isActive: true,
      });

      const teacherDoc = await Teacher.create({
        userId: u._id,
        employeeId: t.empId,
        subjects: t.subjects,
        qualifications: t.qualifications,
        joiningDate: new Date("2022-06-15"),
        salary: t.salary,
        assignedClasses: [],
      });
      teacherDocs.push(teacherDoc);
    }

    // ── 4. Create Classes & Sections ─────────────────────────────────────────
    console.log("📚 Creating Classes & Sections...");
    const class10A = await ClassSection.create({
      schoolId: school._id,
      className: "10",
      section: "A",
      classTeacherId: teacherDocs[0]._id,
      academicYear: "2026-2027",
    });

    const class10B = await ClassSection.create({
      schoolId: school._id,
      className: "10",
      section: "B",
      classTeacherId: teacherDocs[1]._id,
      academicYear: "2026-2027",
    });

    const class9A = await ClassSection.create({
      schoolId: school._id,
      className: "9",
      section: "A",
      classTeacherId: teacherDocs[2]._id,
      academicYear: "2026-2027",
    });

    const class12A = await ClassSection.create({
      schoolId: school._id,
      className: "12",
      section: "A",
      classTeacherId: teacherDocs[3]._id,
      academicYear: "2026-2027",
    });

    // Link assigned classes back to teachers
    await Teacher.findByIdAndUpdate(teacherDocs[0]._id, { assignedClasses: [class10A._id, class9A._id] });
    await Teacher.findByIdAndUpdate(teacherDocs[1]._id, { assignedClasses: [class10B._id] });
    await Teacher.findByIdAndUpdate(teacherDocs[2]._id, { assignedClasses: [class9A._id] });
    await Teacher.findByIdAndUpdate(teacherDocs[3]._id, { assignedClasses: [class12A._id] });

    // ── 5. Create Parents & Students ─────────────────────────────────────────
    console.log("🎓 Creating Students & Parents...");

    // Parents
    const parent1 = await User.create({
      name: "Suresh Sharma",
      email: "parent@school.edu",
      password: "Password@123",
      role: "parent",
      schoolId: school._id,
      phone: "+91 99887 76655",
      profileImage: "https://res.cloudinary.com/yiuiauvg/image/upload/v1790093364/school_erp/profiles/parent_suresh.jpg",
      isActive: true,
    });

    const parent2 = await User.create({
      name: "Meenakshi Sengupta",
      email: "parent2@school.edu",
      password: "Password@123",
      role: "parent",
      schoolId: school._id,
      phone: "+91 99887 76656",
      profileImage: "https://res.cloudinary.com/yiuiauvg/image/upload/v1790093365/school_erp/profiles/parent_meenakshi.jpg",
      isActive: true,
    });

    const studentsToCreate = [
      // Class 10-A Students (Active & Activated)
      {
        name: "Aarav Sharma",
        email: "aarav.student@school.edu",
        admissionNumber: "ADM-2026-001",
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
        email: "diya.student@school.edu",
        admissionNumber: "ADM-2026-002",
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
        name: "Rohan Mehta",
        email: "rohan.student@school.edu",
        admissionNumber: "ADM-2026-003",
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
        name: "Ananya Iyer",
        email: "ananya.student@school.edu",
        admissionNumber: "ADM-2026-004",
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
        name: "Kabir Khan",
        email: "kabir.student@school.edu",
        admissionNumber: "ADM-2026-005",
        dob: "2010-03-30",
        gender: "male",
        classId: class10A._id,
        rollNumber: "05",
        bloodGroup: "O-",
        address: "88, Golf Links, New Delhi",
        guardian: parent1._id,
        isAccountActivated: true,
      },

      // Class 10-B Students
      {
        name: "Pooja Hegde",
        email: "pooja.student@school.edu",
        admissionNumber: "ADM-2026-006",
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
        name: "Siddharth Rao",
        email: "siddharth.student@school.edu",
        admissionNumber: "ADM-2026-007",
        dob: "2010-06-21",
        gender: "male",
        classId: class10B._id,
        rollNumber: "02",
        bloodGroup: "A-",
        address: "14, Ring Road, Lajpat Nagar, Delhi",
        guardian: parent2._id,
        isAccountActivated: true,
      },

      // Class 9-A Students
      {
        name: "Ishaan Verma",
        email: "ishaan.student@school.edu",
        admissionNumber: "ADM-2026-008",
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
        email: "tanvi.student@school.edu",
        admissionNumber: "ADM-2026-009",
        dob: "2011-08-03",
        gender: "female",
        classId: class9A._id,
        rollNumber: "02",
        bloodGroup: "AB-",
        address: "House 204, Greater Kailash 1, Delhi",
        guardian: parent2._id,
        isAccountActivated: true,
      },

      // PENDING ACTIVATION Students (To test student self-signup flow!)
      {
        name: "Neha Joshi",
        email: null,
        admissionNumber: "ADM-2026-010",
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
        name: "Vivek Malhotra",
        email: null,
        admissionNumber: "ADM-2026-011",
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
          schoolId: school._id,
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

    // ── 6. Create Attendance (Last 14 Days + Today) ───────────────────────────
    console.log("📅 Generating Attendance Records for all active students...");
    const attendanceStatuses = ["present", "present", "present", "present", "late", "absent", "leave"];
    const dates = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(9, 0, 0, 0);
      dates.push(d);
    }

    // Mark attendance for all active classes across past 14 days
    for (const st of studentDocs) {
      for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
        const d = dates[dayIdx];
        let randStatus = "present";

        if (st.rollNumber === "01") {
          // Top student -> mostly present, 1 late
          randStatus = dayIdx === 5 ? "late" : "present";
        } else if (st.rollNumber === "02") {
          // Good student -> present, 1 leave
          randStatus = dayIdx === 8 ? "leave" : "present";
        } else if (st.rollNumber === "03") {
          // Average student
          randStatus = dayIdx % 4 === 0 ? "absent" : dayIdx % 6 === 0 ? "late" : "present";
        } else {
          randStatus = attendanceStatuses[(dayIdx + parseInt(st.rollNumber || "1", 10)) % attendanceStatuses.length];
        }

        await Attendance.create({
          studentId: st._id,
          classId: st.classId,
          date: d,
          status: randStatus,
          remarks:
            randStatus === "late"
              ? "15 mins bus delay"
              : randStatus === "leave"
              ? "Approved medical leave"
              : randStatus === "absent"
              ? "Absent without prior intimation"
              : null,
          markedBy: teacherDocs[0]._id,
        });
      }
    }

    // ── 7. Create Fee Structures & Transactions ──────────────────────────────
    console.log("💰 Creating Fee Structures & Transactions...");
    const fee10 = await FeeStructure.create({
      schoolId: school._id,
      classId: class10A._id,
      academicYear: "2026-2027",
      term: "quarterly",
      feeHeads: [
        { name: "Tuition Fee", amount: 18000 },
        { name: "Computer & Science Lab", amount: 4000 },
        { name: "Library & Sports", amount: 2000 },
      ],
      totalAmount: 24000,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days in future
    });

    const fee10B = await FeeStructure.create({
      schoolId: school._id,
      classId: class10B._id,
      academicYear: "2026-2027",
      term: "quarterly",
      feeHeads: [
        { name: "Tuition Fee", amount: 18000 },
        { name: "Computer & Science Lab", amount: 4000 },
        { name: "Library & Sports", amount: 2000 },
      ],
      totalAmount: 24000,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    });

    const fee9 = await FeeStructure.create({
      schoolId: school._id,
      classId: class9A._id,
      academicYear: "2026-2027",
      term: "quarterly",
      feeHeads: [
        { name: "Tuition Fee", amount: 15000 },
        { name: "Development Fee", amount: 3000 },
      ],
      totalAmount: 18000,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    });

    // Student 0: Aarav Sharma -> Fully Paid
    await FeeTransaction.create({
      studentId: studentDocs[0]._id,
      feeStructureId: fee10._id,
      amountDue: 24000,
      amountPaid: 24000,
      paymentMode: "online",
      razorpayOrderId: "order_mock_9918231",
      razorpayPaymentId: "pay_mock_8819231",
      status: "paid",
      paidOn: new Date(),
      receiptNumber: "REC-2026-001",
    });

    // Student 1: Diya Sengupta -> Fully Paid (Cash)
    await FeeTransaction.create({
      studentId: studentDocs[1]._id,
      feeStructureId: fee10._id,
      amountDue: 24000,
      amountPaid: 24000,
      paymentMode: "cash",
      status: "paid",
      paidOn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      receiptNumber: "REC-2026-002",
    });

    // Student 2: Rohan Mehta -> Partial Payment
    await FeeTransaction.create({
      studentId: studentDocs[2]._id,
      feeStructureId: fee10._id,
      amountDue: 24000,
      amountPaid: 12000,
      paymentMode: "online",
      status: "partial",
      paidOn: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      receiptNumber: "REC-2026-003",
    });

    // Student 3: Ananya Iyer -> Overdue Defaulter
    await FeeTransaction.create({
      studentId: studentDocs[3]._id,
      feeStructureId: fee10._id,
      amountDue: 24000,
      amountPaid: 0,
      paymentMode: "online",
      status: "overdue",
    });

    // Student 4: Kabir Khan -> Pending
    await FeeTransaction.create({
      studentId: studentDocs[4]._id,
      feeStructureId: fee10._id,
      amountDue: 24000,
      amountPaid: 0,
      paymentMode: "online",
      status: "pending",
    });

    // Class 10B & 9A Fee Transactions
    await FeeTransaction.create({
      studentId: studentDocs[5]._id,
      feeStructureId: fee10B._id,
      amountDue: 24000,
      amountPaid: 24000,
      paymentMode: "online",
      status: "paid",
      paidOn: new Date(),
      receiptNumber: "REC-2026-004",
    });

    await FeeTransaction.create({
      studentId: studentDocs[7]._id,
      feeStructureId: fee9._id,
      amountDue: 18000,
      amountPaid: 18000,
      paymentMode: "online",
      status: "paid",
      paidOn: new Date(),
      receiptNumber: "REC-2026-005",
    });

    // ── 8. Create Exams & Results ────────────────────────────────────────────
    console.log("🏆 Creating Exams & Publishing Results...");
    const midTermExam10A = await Exam.create({
      schoolId: school._id,
      classId: class10A._id,
      examName: "Mid-Term Examination 2026",
      academicYear: "2026-2027",
      resultPublished: true,
      subjects: [
        { subjectName: "Mathematics", maxMarks: 100, passingMarks: 35, examDate: new Date("2026-08-10") },
        { subjectName: "Physics", maxMarks: 100, passingMarks: 35, examDate: new Date("2026-08-12") },
        { subjectName: "Chemistry", maxMarks: 100, passingMarks: 35, examDate: new Date("2026-08-14") },
        { subjectName: "English", maxMarks: 100, passingMarks: 35, examDate: new Date("2026-08-16") },
        { subjectName: "Computer Science", maxMarks: 100, passingMarks: 35, examDate: new Date("2026-08-18") },
      ],
    });

    const preBoardExam10A = await Exam.create({
      schoolId: school._id,
      classId: class10A._id,
      examName: "Pre-Board Mock Exam 2026",
      academicYear: "2026-2027",
      resultPublished: true,
      subjects: [
        { subjectName: "Mathematics", maxMarks: 100, passingMarks: 35, examDate: new Date("2026-09-01") },
        { subjectName: "Science", maxMarks: 100, passingMarks: 35, examDate: new Date("2026-09-03") },
        { subjectName: "English", maxMarks: 100, passingMarks: 35, examDate: new Date("2026-09-05") },
      ],
    });

    // Enter marks and results for class 10A students for Mid-Term Exam
    const class10AStudents = studentDocs.filter((s) => s.classId.toString() === class10A._id.toString());
    const mockScores10A = [
      { marks: [95, 92, 88, 90, 98], remarks: "Outstanding academic performance throughout the term. Excellent problem solving skills!" },
      { marks: [88, 85, 91, 94, 89], remarks: "Excellent grasp of concepts and consistent dedication in both theory and practicals." },
      { marks: [74, 68, 72, 80, 75], remarks: "Good performance with steady improvement. Keep practicing numerical exercises." },
      { marks: [62, 58, 65, 71, 64], remarks: "Fair attempt. Can achieve much higher with focused revision in Sciences." },
      { marks: [82, 79, 84, 88, 85], remarks: "Very good analytical skills and active class participation." },
    ];

    for (let idx = 0; idx < Math.min(class10AStudents.length, mockScores10A.length); idx++) {
      const st = class10AStudents[idx];
      const scoreData = mockScores10A[idx];
      const subjects = ["Mathematics", "Physics", "Chemistry", "English", "Computer Science"];

      const marksObtained = subjects.map((sub, sIdx) => ({
        subjectName: sub,
        marks: scoreData.marks[sIdx],
      }));

      const totalObtained = scoreData.marks.reduce((a, b) => a + b, 0);
      const totalMax = 500;
      const pct = Math.round((totalObtained / totalMax) * 100);

      let grade = "C";
      if (pct >= 90) grade = "A+";
      else if (pct >= 80) grade = "A";
      else if (pct >= 70) grade = "B";
      else if (pct >= 60) grade = "C";

      await Result.create({
        studentId: st._id,
        examId: midTermExam10A._id,
        marksObtained,
        totalMarksObtained: totalObtained,
        totalMaxMarks: totalMax,
        percentage: pct,
        grade,
        overallStatus: "pass",
        remarks: scoreData.remarks,
        enteredBy: teacherDocs[0]._id,
      });
    }

    // Add Pre-Board Mock Exam Result for Aarav
    await Result.create({
      studentId: class10AStudents[0]._id,
      examId: preBoardExam10A._id,
      marksObtained: [
        { subjectName: "Mathematics", marks: 98 },
        { subjectName: "Science", marks: 94 },
        { subjectName: "English", marks: 92 },
      ],
      totalMarksObtained: 284,
      totalMaxMarks: 300,
      percentage: 95,
      grade: "A+",
      overallStatus: "pass",
      remarks: "Exemplary performance! Ready for board exams with full confidence.",
      enteredBy: teacherDocs[0]._id,
    });

    console.log("\n========================================================");
    console.log("🎉 ALL MOCK DATA SEEDED SUCCESSFULLY WITHOUT ANY ERRORS!");
    console.log("========================================================");
    console.log("\n🔑 Test Accounts & Logins:");
    console.log("────────────────────────────────────────────────────────");
    console.log("👑 Super Admin:  admin@school.edu       / Admin@123");
    console.log("👑 Super Admin:  tusharrajput857@gmail.com / Admin@123");
    console.log("🏫 Principal:    principal@school.edu   / Admin@123");
    console.log("💼 Accountant:   accountant@school.edu  / Password@123");
    console.log("👨‍🏫 Teacher:      vikram.maths@school.edu / Password@123");
    console.log("👨‍👩‍👦 Parent 1:     parent@school.edu      / Password@123  (Guardian of Aarav & Rohan)");
    console.log("👨‍👩‍👧 Parent 2:     parent2@school.edu     / Password@123  (Guardian of Diya & Ananya)");
    console.log("🎓 Student (Aarav): aarav.student@school.edu / Password@123 (Class 10-A, 100% Attendance, A+ Grade, Fee Paid)");
    console.log("🎓 Student (Diya):  diya.student@school.edu  / Password@123 (Class 10-A, A Grade)");
    console.log("🎓 Student (Rohan): rohan.student@school.edu / Password@123 (Class 10-A, B Grade, Partial Fee)");
    console.log("\n🧪 Self-Signup Test Credentials (Not yet activated):");
    console.log("────────────────────────────────────────────────────────");
    console.log("1. Student Name: Neha Joshi");
    console.log("   Admission No: ADM-2026-010");
    console.log("   Date of Birth: 2010-06-18");
    console.log("\n2. Student Name: Vivek Malhotra");
    console.log("   Admission No: ADM-2026-011");
    console.log("   Date of Birth: 2009-12-05");
    console.log("========================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();
