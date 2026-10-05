import { useState, useEffect, useRef } from "react";
import {
  X,
  CreditCard,
  Ticket,
  Printer,
  GraduationCap,
  ShieldCheck,
  User,
  Calendar,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";

const StudentIDCardModal = ({
  isOpen,
  onClose,
  students = [],
  initialStudent = null,
  initialTab = "idcard",
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedStudentId, setSelectedStudentId] = useState(
    initialStudent?._id || (students.length > 0 ? students[0]._id : "")
  );

  useEffect(() => {
    if (!selectedStudentId && students && students.length > 0) {
      setSelectedStudentId(initialStudent?._id || students[0]._id);
    }
  }, [students, initialStudent, selectedStudentId]);

  const [gatePassReason, setGatePassReason] = useState("Medical Appointment");
  const [gatePassTime, setGatePassTime] = useState("01:30 PM");
  const [accompaniedBy, setAccompaniedBy] = useState("Parent / Guardian");

  const printRef = useRef(null);

  if (!isOpen) return null;

  const currentStudent =
    students.find((s) => s._id === selectedStudentId) ||
    initialStudent ||
    students[0];

  const userInfo = currentStudent?.userId || currentStudent?.userInfo;
  const cls = currentStudent?.classId;
  const studentName = currentStudent?.name || userInfo?.name || "Student Name";
  const admNo = currentStudent?.admissionNumber || "ADM-2026-001";
  const rollNo = currentStudent?.rollNumber || "01";
  const className = cls ? `Class ${cls.className}-${cls.section}` : "Class 10 - A";
  const academicYear = cls?.academicYear || "2026-2027";
  const dob = currentStudent?.dob
    ? new Date(currentStudent.dob).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "14 Aug 2011";
  const bloodGroup = currentStudent?.bloodGroup || "O+";
  const studentPhoto = currentStudent?.profileImage || userInfo?.profileImage;
  const guardianPhoto = currentStudent?.guardianPhoto;
  const guardianName = currentStudent?.guardianName || currentStudent?.parents?.[0]?.name || "Rajesh Sharma";
  const guardianPhone = currentStudent?.guardianPhone || currentStudent?.emergencyContact?.phone || userInfo?.phone || "+91 98765 43210";
  const guardianRelation = currentStudent?.guardianRelation || "Parent / Guardian";
  const fatherName = guardianName;
  const phone = guardianPhone;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center">
              {activeTab === "idcard" ? (
                <CreditCard className="w-5 h-5" />
              ) : (
                <Ticket className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {activeTab === "idcard" ? "Student Identity Card" : "Student Gate Pass"}
              </h3>
              <p className="text-xs text-slate-500">
                Official school document preview & high-res print
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F4E79] text-white rounded-lg text-xs font-semibold hover:bg-[#1a4268] transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab & Student Selector Controls */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("idcard")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "idcard"
                  ? "bg-white text-[#1F4E79] shadow-xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              ID Card
            </button>
            <button
              onClick={() => setActiveTab("gatepass")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "gatepass"
                  ? "bg-white text-[#1F4E79] shadow-xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              Gate Pass
            </button>
          </div>

          {/* Student Selector */}
          {students.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Select Student:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
              >
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name || s.userId?.name || "Student"} ({s.admissionNumber || "—"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modal Body / Document Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 flex flex-col items-center justify-center">
          {activeTab === "idcard" ? (
            /* ── ID Card Preview ── */
            <div
              ref={printRef}
              className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden text-slate-800"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-[#1F4E79] via-[#245889] to-[#2c6aa3] px-4 py-3 text-white text-center relative">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider leading-none">
                      Delhi Public Global School
                    </h4>
                    <p className="text-[9px] text-white/80 font-medium mt-0.5">
                      Affiliated to CBSE | New Delhi
                    </p>
                  </div>
                </div>
                <div className="mt-2 inline-block px-3 py-0.5 bg-amber-400 text-slate-900 rounded-full text-[9px] font-bold tracking-wider uppercase">
                  Student Identity Card ({academicYear})
                </div>
              </div>

              {/* Card Center: Photo & Info */}
              <div className="p-4 space-y-3">
                <div className="flex gap-4 items-center">
                  {/* Photo Frame */}
                  <div className="w-20 h-24 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0 shadow-2xs">
                    {studentPhoto ? (
                      <img
                        src={studentPhoto}
                        alt={studentName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sky-400 to-sky-600 flex flex-col items-center justify-center text-white">
                        <User className="w-8 h-8 opacity-80" />
                        <span className="text-[10px] font-bold mt-1">PHOTO</span>
                      </div>
                    )}
                  </div>

                  {/* Core details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {studentName}
                    </h3>
                    <p className="text-xs font-semibold text-[#1F4E79]">
                      {className}
                    </p>
                    <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                      <p>
                        <span className="text-slate-400">Adm No:</span>{" "}
                        <span className="font-mono font-bold text-slate-800">
                          {admNo}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-400">Roll No:</span>{" "}
                        <span className="font-semibold text-slate-800">
                          {rollNo}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-400">Blood Grp:</span>{" "}
                        <span className="font-bold text-rose-600">
                          {bloodGroup}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional details */}
                <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Father's Name:</span>
                    <span className="font-medium text-slate-700">{fatherName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date of Birth:</span>
                    <span className="font-medium text-slate-700">{dob}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Emergency Phone:</span>
                    <span className="font-medium text-slate-700">{phone}</span>
                  </div>
                </div>

                {/* Barcode & Signature */}
                <div className="border-t border-dashed border-slate-200 pt-3 flex items-end justify-between">
                  <div>
                    {/* Simulated Barcode */}
                    <div className="font-mono text-[9px] text-slate-400 tracking-widest text-center">
                      ||| | | |||| | ||| |||| |
                    </div>
                    <span className="font-mono text-[8px] text-slate-400">
                      *{admNo}*
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-serif italic text-slate-600">
                      Principal
                    </div>
                    <div className="w-16 border-t border-slate-400 mt-0.5"></div>
                    <span className="text-[8px] text-slate-400 uppercase">
                      Authorized Sign
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="bg-slate-50 border-t border-slate-100 px-4 py-1.5 text-center text-[8px] text-slate-400">
                If found, please return to Delhi Public Global School Campus, Ring Road.
              </div>
            </div>
          ) : (
            /* ── Gate Pass Preview ── */
            <div
              ref={printRef}
              className="w-full max-w-md bg-white rounded-2xl shadow-md border-2 border-slate-200 p-5 text-slate-800 space-y-4"
            >
              {/* Gate Pass Header */}
              <div className="border-b-2 border-slate-800 pb-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <GraduationCap className="w-5 h-5 text-[#1F4E79]" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#1F4E79]">
                    Delhi Public Global School
                  </span>
                </div>
                <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-900">
                  STUDENT EXIT / GATE PASS
                </h4>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-mono">
                  <span>Pass No: GP-2026-{(admNo || "").replace(/[^0-9]/g, "").slice(-4) || "4092"}</span>
                  <span>Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              </div>

              {/* Dual Biometric Recognition (Student & Guardian) */}
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <div className="w-14 h-16 rounded-lg border border-slate-300 overflow-hidden bg-white flex items-center justify-center">
                      {studentPhoto ? (
                        <img src={studentPhoto} alt="Student" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 uppercase block mt-0.5">Student</span>
                  </div>

                  <span className="text-slate-300 font-bold text-xs">+</span>

                  <div className="text-center">
                    <div className="w-14 h-16 rounded-lg border border-amber-300 overflow-hidden bg-white flex items-center justify-center">
                      {guardianPhoto ? (
                        <img src={guardianPhoto} alt="Guardian" className="w-full h-full object-cover" />
                      ) : (
                        <ShieldCheck className="w-6 h-6 text-amber-400" />
                      )}
                    </div>
                    <span className="text-[8px] font-bold text-amber-700 uppercase block mt-0.5">Guardian</span>
                  </div>
                </div>

                <div className="min-w-0 flex-1 text-xs space-y-0.5">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                    Verified Pickup Match
                  </span>
                  <p className="font-bold text-slate-800 text-[11px] truncate">
                    {studentName}
                  </p>
                  <p className="text-slate-600 text-[10px]">
                    Guardian: <strong className="text-slate-700">{guardianName}</strong> ({guardianRelation})
                  </p>
                  <p className="text-slate-500 text-[9px] font-mono">
                    Tel: {guardianPhone}
                  </p>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px]">Admission No:</span>
                  <p className="font-mono font-semibold text-slate-800">{admNo}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Class & Section:</span>
                  <p className="font-bold text-[#1F4E79]">{className}</p>
                </div>
              </div>

              {/* Pass details inputs */}
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Reason for Exit:
                  </label>
                  <select
                    value={gatePassReason}
                    onChange={(e) => setGatePassReason(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
                  >
                    <option value="Medical Appointment / Illness">Medical Appointment / Illness</option>
                    <option value="Early Departure on Parent Request">Early Departure on Parent Request</option>
                    <option value="Official Interschool Competition">Official Interschool Competition</option>
                    <option value="Urgent Family Emergency">Urgent Family Emergency</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Departure Time:
                    </label>
                    <input
                      type="text"
                      value={gatePassTime}
                      onChange={(e) => setGatePassTime(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Accompanied By:
                    </label>
                    <input
                      type="text"
                      value={accompaniedBy}
                      onChange={(e) => setAccompaniedBy(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Signatures Clearance Box */}
              <div className="pt-4 border-t border-dashed border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div className="space-y-4">
                  <div className="h-6"></div>
                  <div className="border-t border-slate-300 pt-1">
                    <p className="text-[9px] font-bold text-slate-600">Class Teacher</p>
                    <p className="text-[8px] text-slate-400">Signature</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-6 text-emerald-600 font-mono text-[10px] font-bold">
                    [APPROVED]
                  </div>
                  <div className="border-t border-slate-300 pt-1">
                    <p className="text-[9px] font-bold text-slate-600">Principal / Admin</p>
                    <p className="text-[8px] text-slate-400">Signature</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-6"></div>
                  <div className="border-t border-slate-300 pt-1">
                    <p className="text-[9px] font-bold text-slate-600">Gate Security</p>
                    <p className="text-[8px] text-slate-400">Time Checked</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentIDCardModal;
