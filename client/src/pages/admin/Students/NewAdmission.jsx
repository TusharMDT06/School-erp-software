import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  GraduationCap,
  User,
  ShieldCheck,
  Camera,
  Upload,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Ticket,
  Printer,
  Sparkles,
  Phone,
  Mail,
  Home,
  AlertCircle,
  Users,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react";
import { createStudent, fetchStudents } from "../../../features/student/studentSlice";
import { fetchClasses } from "../../../features/class/classSlice";
import StudentIDCardModal from "./StudentIDCardModal";

export default function NewAdmission() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { classes } = useSelector((s) => s.class);
  const { students } = useSelector((s) => s.student);

  // Form Fields
  const [name, setName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [classId, setClassId] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [admissionDate, setAdmissionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [address, setAddress] = useState("");

  // Guardian Details
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("Father");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Photos (Base64)
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [guardianPhoto, setGuardianPhoto] = useState(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [cardModalTab, setCardModalTab] = useState("idcard");

  const studentPhotoInputRef = useRef(null);
  const guardianPhotoInputRef = useRef(null);

  // Load classes and recent students
  useEffect(() => {
    dispatch(fetchClasses({ limit: 100 }));
    dispatch(fetchStudents({ page: 1, limit: 10 }));
  }, [dispatch]);

  // Set default class if available and generate admission number
  useEffect(() => {
    if (classes.length > 0 && !classId) {
      setClassId(classes[0]._id);
    }
  }, [classes, classId]);

  useEffect(() => {
    generateAdmissionNumber();
  }, [students]);

  const generateAdmissionNumber = () => {
    const year = new Date().getFullYear();
    const count = (students?.length || 0) + 1 + Math.floor(Math.random() * 10);
    const seq = String(count).padStart(3, "0");
    setAdmissionNumber(`ADM-${year}-${seq}`);
  };

  // Photo handlers
  const handlePhotoUpload = (e, setPhoto) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image file size should be less than 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const selectedClass = classes.find((c) => c._id === classId);
  const classNameDisplay = selectedClass
    ? `Class ${selectedClass.className}-${selectedClass.section}`
    : "Select Class";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter the student's full name.");
      return;
    }
    if (!dob) {
      toast.error("Please enter the student's date of birth.");
      return;
    }
    if (!admissionNumber.trim()) {
      toast.error("Admission number is required.");
      return;
    }
    if (!classId) {
      toast.error("Please select an enrolled class.");
      return;
    }

    const payload = {
      name: name.trim(),
      admissionNumber: admissionNumber.trim().toUpperCase(),
      dob,
      gender,
      bloodGroup,
      classId,
      rollNumber: rollNumber.trim() || undefined,
      admissionDate,
      address: address.trim() || undefined,
      guardianName: guardianName.trim() || undefined,
      guardianRelation: guardianRelation || undefined,
      guardianPhone: guardianPhone.trim() || undefined,
      guardianEmail: guardianEmail.trim() || undefined,
      emergencyContact: emergencyPhone.trim()
        ? { name: guardianName || "Guardian", phone: emergencyPhone.trim() }
        : undefined,
      profileImage: studentPhoto || undefined,
      guardianPhoto: guardianPhoto || undefined,
    };

    setSubmitting(true);
    try {
      const res = await dispatch(createStudent(payload));
      if (createStudent.fulfilled.match(res)) {
        toast.success("Student admission registered successfully!");
        setCreatedStudent(res.payload);
      } else {
        toast.error(res.payload || "Failed to register admission.");
      }
    } catch {
      toast.error("An unexpected error occurred during admission registration.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName("");
    setDob("");
    setGender("male");
    setBloodGroup("O+");
    setRollNumber("");
    setAddress("");
    setGuardianName("");
    setGuardianPhone("");
    setGuardianEmail("");
    setEmergencyPhone("");
    setStudentPhoto(null);
    setGuardianPhoto(null);
    setCreatedStudent(null);
    generateAdmissionNumber();
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="hover:text-slate-800 transition-colors"
            >
              Admin
            </button>
            <span>/</span>
            <button
              onClick={() => navigate("/admin/students")}
              className="hover:text-slate-800 transition-colors"
            >
              Students
            </button>
            <span>/</span>
            <span className="text-[#1F4E79] font-semibold">New Admission</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/students")}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Back to Students"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
              New Student Admission
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Academic Session 2026-27
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Official student registration and gate-pass security verification profile.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Reset Form
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/students")}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            All Students
          </button>
        </div>
      </div>

      {/* Post-Registration Success View */}
      {createdStudent ? (
        <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-xl shadow-emerald-500/5 max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800">
            Admission Successfully Registered!
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Student record for{" "}
            <span className="font-bold text-slate-800">
              {createdStudent.name || name}
            </span>{" "}
            has been created with permanent Admission No.{" "}
            <span className="font-mono font-bold text-[#1F4E79]">
              {createdStudent.admissionNumber || admissionNumber}
            </span>
            .
          </p>

          {/* Student Profile Card Summary */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4 text-left">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-300">
              {createdStudent.profileImage || studentPhoto ? (
                <img
                  src={createdStudent.profileImage || studentPhoto}
                  alt="Student"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 truncate">
                {createdStudent.name || name}
              </h4>
              <p className="text-xs text-[#1F4E79] font-medium">
                {classNameDisplay}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span>
                  Adm:{" "}
                  <strong className="text-slate-700">
                    {createdStudent.admissionNumber || admissionNumber}
                  </strong>
                </span>
                <span>
                  Roll:{" "}
                  <strong className="text-slate-700">
                    {createdStudent.rollNumber || rollNumber || "—"}
                  </strong>
                </span>
                <span>
                  Blood:{" "}
                  <strong className="text-slate-700">{bloodGroup}</strong>
                </span>
              </div>
            </div>
            {(createdStudent.guardianPhoto || guardianPhoto) && (
              <div className="text-center pl-3 border-l border-slate-200 flex-shrink-0">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 mx-auto">
                  <img
                    src={createdStudent.guardianPhoto || guardianPhoto}
                    alt="Guardian"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  Guardian
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCardModalTab("idcard");
                setShowIdCardModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1F4E79] text-white rounded-xl text-sm font-semibold hover:bg-[#183e60] transition-colors shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              Generate Official ID Card
            </button>
            <button
              type="button"
              onClick={() => {
                setCardModalTab("gatepass");
                setShowIdCardModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition-colors"
            >
              <Ticket className="w-4 h-4 text-slate-600" />
              Issue Security Gate Pass
            </button>
            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Admit Another Student
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── Left Side: Form Details (8 Columns) ── */}
            <div className="lg:col-span-8 space-y-6">
              {/* Section 1: Photos & Recognition Uploads */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#1F4E79]" />
                      Biometric Recognition & Photographs
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload clear photos for Student Identity Card, attendance, and guardian gate clearance.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1F4E79]">
                    Security Verification
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* 1A: Student Photo Upload */}
                  <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col items-center text-center">
                    <span className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-sky-600" />
                      Student Passport Photo
                    </span>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Required for Student ID Card & Academic Records
                    </p>

                    <div className="relative group mb-3">
                      <div className="w-28 h-32 rounded-2xl overflow-hidden border-2 border-slate-300 bg-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-102">
                        {studentPhoto ? (
                          <img
                            src={studentPhoto}
                            alt="Student preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                            <User className="w-10 h-10 text-slate-300 mb-1" />
                            <span className="text-[10px] font-medium text-slate-400">
                              No photo selected
                            </span>
                          </div>
                        )}
                      </div>

                      {studentPhoto && (
                        <button
                          type="button"
                          onClick={() => setStudentPhoto(null)}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <input
                      ref={studentPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, setStudentPhoto)}
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => studentPhotoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F4E79] text-white rounded-lg text-xs font-medium hover:bg-[#1a4368] transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {studentPhoto ? "Change Photo" : "Upload Student Photo"}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2">
                      JPG, PNG or WebP (Max 4MB)
                    </span>
                  </div>

                  {/* 1B: Guardian Recognition Photo */}
                  <div className="p-4 rounded-xl border border-amber-200/90 bg-amber-50/20 flex flex-col items-center text-center">
                    <span className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      Guardian / Pickup Photo
                    </span>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Required for campus gate security & pickup recognition
                    </p>

                    <div className="relative group mb-3">
                      <div className="w-28 h-32 rounded-2xl overflow-hidden border-2 border-amber-300/80 bg-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-102">
                        {guardianPhoto ? (
                          <img
                            src={guardianPhoto}
                            alt="Guardian preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                            <ShieldCheck className="w-10 h-10 text-amber-300 mb-1" />
                            <span className="text-[10px] font-medium text-slate-400">
                              Upload Guardian Photo
                            </span>
                          </div>
                        )}
                      </div>

                      {guardianPhoto && (
                        <button
                          type="button"
                          onClick={() => setGuardianPhoto(null)}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
                          title="Remove Guardian Photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <input
                      ref={guardianPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, setGuardianPhoto)}
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => guardianPhotoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {guardianPhoto ? "Change Guardian" : "Upload Guardian Photo"}
                      </button>
                    </div>
                    <span className="text-[10px] text-amber-700/70 mt-2 font-medium">
                      Student with Parent / Authorized Pickup
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-blue-50/60 rounded-xl text-xs text-blue-900 border border-blue-100">
                  <ShieldCheck className="w-4 h-4 text-[#1F4E79] flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Security Verification Guarantee:</strong> Having both the student
                    photo and authorized guardian photo prevents unauthorized pickup at school gates
                    and automatically embeds the guardian match on digital gate passes.
                  </p>
                </div>
              </div>

              {/* Section 2: Personal Student Details */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-[#1F4E79]" />
                    Student Personal Information
                  </h3>
                  <span className="text-xs text-slate-400">* Required fields</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Student Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    >
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Admission Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Admission Date
                    </label>
                    <input
                      type="date"
                      value={admissionDate}
                      onChange={(e) => setAdmissionDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Flat 402, Sunshine Towers, Sector 14, Gurugram"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Academic Enrollment */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#1F4E79]" />
                    Academic Enrollment & Class Allocation
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Admission Number */}
                  <div className="sm:col-span-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Admission No <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generateAdmissionNumber}
                        className="text-[10px] text-[#1F4E79] hover:underline flex items-center gap-1 font-medium"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Regenerate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>

                  {/* Class & Section */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    >
                      <option value="">— Select Class —</option>
                      {classes.map((c) => (
                        <option key={c._id} value={c._id}>
                          Class {c.className}-{c.section} ({c.academicYear})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Roll Number */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Class Roll No
                    </label>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Parent & Guardian Details */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#1F4E79]" />
                    Guardian / Authorized Pickup Contact
                  </h3>
                  <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200/60">
                    Emergency & Gate Clearance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Guardian Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Guardian / Parent Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Relationship to Student
                    </label>
                    <select
                      value={guardianRelation}
                      onChange={(e) => setGuardianRelation(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Uncle/Aunt">Uncle / Aunt</option>
                    </select>
                  </div>

                  {/* Guardian Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Guardian Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                      />
                    </div>
                  </div>

                  {/* Guardian Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Guardian Email (Portal & Reports)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={guardianEmail}
                        onChange={(e) => setGuardianEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                      />
                    </div>
                  </div>

                  {/* Alternate Emergency Contact */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Secondary Emergency Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="Alternate contact phone number"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Side: Live Identity Card & Security Preview (4 Columns) ── */}
            <div className="lg:col-span-4 space-y-6 sticky top-6">
              {/* Realtime ID Card Badge Preview */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold tracking-wide uppercase">
                      Live Identity Card Preview
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    REALTIME
                  </span>
                </div>

                <div className="p-4 bg-slate-100/70 flex justify-center">
                  {/* Simulated Card Visual */}
                  <div className="w-full max-w-xs bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-slate-800">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#1F4E79] to-[#2b6ba5] px-3 py-2 text-white text-center">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider">
                        Delhi Public Global School
                      </h4>
                      <p className="text-[8px] text-white/80">Affiliated to CBSE</p>
                      <div className="mt-1 inline-block px-2 py-0.5 bg-amber-400 text-slate-900 rounded-full text-[8px] font-bold uppercase">
                        Student ID Card 2026-27
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 space-y-2">
                      <div className="flex gap-3 items-center">
                        {/* Student Photo */}
                        <div className="w-16 h-20 rounded-lg border border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
                          {studentPhoto ? (
                            <img
                              src={studentPhoto}
                              alt="Student"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-1">
                              <User className="w-6 h-6 text-slate-300 mx-auto" />
                              <span className="text-[8px] text-slate-400 font-bold block mt-0.5">
                                PHOTO
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Student Details */}
                        <div className="min-w-0 flex-1 space-y-0.5 text-left">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {name || "Student Name"}
                          </h4>
                          <p className="text-[11px] font-bold text-[#1F4E79]">
                            {classNameDisplay}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Adm: <span className="font-mono font-bold">{admissionNumber}</span>
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Roll: <span className="font-semibold">{rollNumber || "—"}</span>
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Blood: <span className="font-bold text-red-600">{bloodGroup}</span>
                          </p>
                        </div>
                      </div>

                      {/* Guardian Security Section on Card */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2.5 bg-slate-50 p-1.5 rounded-lg">
                        <div className="w-9 h-11 rounded border border-amber-300 bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                          {guardianPhoto ? (
                            <img
                              src={guardianPhoto}
                              alt="Guardian"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-amber-700 block">
                            Authorized Guardian
                          </span>
                          <p className="text-[10px] font-bold text-slate-800 truncate">
                            {guardianName || "Guardian Name"} ({guardianRelation})
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {guardianPhone || "+91 9XXXXXXXXX"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-100 px-3 py-1 text-center text-[7px] text-slate-400">
                      Digital Security Pass & Biometric Gate Recognition
                    </div>
                  </div>
                </div>

                {/* Pre-flight Checklist */}
                <div className="p-4 space-y-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Admission Checklist
                  </span>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        name ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {name ? "✓" : "○"}
                    </span>
                    <span>Student Full Name</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        classId ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {classId ? "✓" : "○"}
                    </span>
                    <span>Class & Section Assigned</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        studentPhoto ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {studentPhoto ? "✓" : "!"}
                    </span>
                    <span>
                      {studentPhoto ? "Student Photo Attached" : "Student Photo (Recommended)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        guardianPhoto ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {guardianPhoto ? "✓" : "!"}
                    </span>
                    <span>
                      {guardianPhoto
                        ? "Guardian Recognition Attached"
                        : "Guardian Photo (Gate Security)"}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="p-4 pt-0">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-[#1F4E79] hover:bg-[#183e60] disabled:bg-slate-400 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Registering Admission...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Complete Student Admission
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Creates student record and updates class roster immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ID Card / Gate Pass Modal on successful admission */}
      {showIdCardModal && createdStudent && (
        <StudentIDCardModal
          isOpen={showIdCardModal}
          onClose={() => setShowIdCardModal(false)}
          students={[createdStudent]}
          initialStudent={createdStudent}
          initialTab={cardModalTab}
        />
      )}
    </div>
  );
}
