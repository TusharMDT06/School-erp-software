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
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  Plus,
  X,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { createTeacher, fetchTeachers } from "../../../features/teacher/teacherSlice";

const COMMON_SUBJECTS = [
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Social Science",
  "Computer Science",
  "Physical Education",
  "Art & Craft",
  "Economics",
];

const COMMON_QUALIFICATIONS = [
  "B.Ed",
  "M.Ed",
  "M.Sc",
  "M.A",
  "B.Sc",
  "B.A",
  "B.Tech",
  "MCA",
  "Ph.D",
  "CTET Qualified",
];

export default function AddTeacher() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { teachers } = useSelector((s) => s.teacher);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [joiningDate, setJoiningDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [salary, setSalary] = useState("");

  // Tags
  const [subjects, setSubjects] = useState(["Mathematics"]);
  const [customSubject, setCustomSubject] = useState("");
  const [qualifications, setQualifications] = useState(["B.Ed", "M.Sc"]);
  const [customQual, setCustomQual] = useState("");

  // Photo (Base64)
  const [teacherPhoto, setTeacherPhoto] = useState(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [createdTeacher, setCreatedTeacher] = useState(null);
  const [copied, setCopied] = useState(false);

  const photoInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchTeachers({ page: 1, limit: 10 }));
  }, [dispatch]);

  useEffect(() => {
    generateEmployeeId();
    generatePassword();
  }, [teachers]);

  const generateEmployeeId = () => {
    const year = new Date().getFullYear();
    const count = (teachers?.length || 0) + 1 + Math.floor(Math.random() * 5);
    const seq = String(count).padStart(3, "0");
    setEmployeeId(`TCH-${year}-${seq}`);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const handlePhotoUpload = (e) => {
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
      setTeacherPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const addSubject = (sub) => {
    const s = sub.trim();
    if (s && !subjects.includes(s)) {
      setSubjects([...subjects, s]);
    }
    setCustomSubject("");
  };

  const removeSubject = (sub) => {
    setSubjects(subjects.filter((s) => s !== sub));
  };

  const addQualification = (q) => {
    const item = q.trim();
    if (item && !qualifications.includes(item)) {
      setQualifications([...qualifications, item]);
    }
    setCustomQual("");
  };

  const removeQualification = (q) => {
    setQualifications(qualifications.filter((item) => item !== q));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Teacher full name is required.");
      return;
    }
    if (!email.trim()) {
      toast.error("Official email address is required.");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (!employeeId.trim()) {
      toast.error("Employee ID is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim() || undefined,
      profileImage: teacherPhoto || undefined,
      employeeId: employeeId.trim().toUpperCase(),
      subjects,
      qualifications,
      joiningDate: joiningDate || undefined,
      salary: salary ? Number(salary) : undefined,
    };

    setSubmitting(true);
    try {
      const res = await dispatch(createTeacher(payload));
      if (createTeacher.fulfilled.match(res)) {
        toast.success("Faculty member registered successfully!");
        setCreatedTeacher({
          ...res.payload,
          savedPassword: password,
          savedEmail: email.trim().toLowerCase(),
        });
      } else {
        toast.error(res.payload || "Failed to register teacher.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = () => {
    const text = `School ERP Teacher Credentials\nName: ${createdTeacher?.userId?.name || name}\nEmployee ID: ${createdTeacher?.employeeId || employeeId}\nEmail: ${createdTeacher?.savedEmail || email}\nPassword: ${createdTeacher?.savedPassword || password}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Login credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSalary("");
    setTeacherPhoto(null);
    setSubjects(["Mathematics"]);
    setQualifications(["B.Ed"]);
    setCreatedTeacher(null);
    generateEmployeeId();
    generatePassword();
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
              onClick={() => navigate("/admin/teachers")}
              className="hover:text-slate-800 transition-colors"
            >
              Teachers
            </button>
            <span>/</span>
            <span className="text-[#1F4E79] font-semibold">Add Teacher</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/teachers")}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Back to Teachers"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
              Add New Faculty Member
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-[#1F4E79] border border-blue-200">
                Staff Onboarding
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create teacher profile, assign teaching subjects, and generate portal access credentials.
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
            onClick={() => navigate("/admin/teachers")}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            All Teachers
          </button>
        </div>
      </div>

      {/* Post-Registration Success View */}
      {createdTeacher ? (
        <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-xl shadow-emerald-500/5 max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800">
            Faculty Member Registered Successfully!
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Teacher account created for{" "}
            <span className="font-bold text-slate-800">
              {createdTeacher.userId?.name || name}
            </span>{" "}
            with Employee ID{" "}
            <span className="font-mono font-bold text-[#1F4E79]">
              {createdTeacher.employeeId || employeeId}
            </span>
            .
          </p>

          {/* Credentials Card */}
          <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#1F4E79]" />
                Portal Access Credentials
              </span>
              <button
                type="button"
                onClick={copyCredentials}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    Copy Credentials
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Login Email:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 block truncate">
                  {createdTeacher.savedEmail || email}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Temporary Password:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 block">
                  {createdTeacher.savedPassword || password}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/50">
              An automated onboarding email has been queued to{" "}
              <strong>{createdTeacher.savedEmail || email}</strong>. The teacher will be prompted
              to set a personal password upon first login.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/teachers")}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1F4E79] text-white rounded-xl text-sm font-semibold hover:bg-[#183e60] transition-colors shadow-sm"
            >
              <Users className="w-4 h-4" />
              Go to Teacher Directory
            </button>
            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Add Another Teacher
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── Left Side: Form Details (8 Columns) ── */}
            <div className="lg:col-span-8 space-y-6">
              {/* Section 1: Teacher Photo & Identity */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#1F4E79]" />
                      Official Faculty Photograph & Recognition
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload faculty photo for Staff ID card, classroom rosters & attendance scanning.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Faculty Recognition
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
                  {/* Photo Frame */}
                  <div className="relative group">
                    <div className="w-28 h-32 rounded-2xl overflow-hidden border-2 border-slate-300 bg-white flex items-center justify-center shadow-xs">
                      {teacherPhoto ? (
                        <img
                          src={teacherPhoto}
                          alt="Teacher portrait"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                          <User className="w-10 h-10 text-slate-300 mb-1" />
                          <span className="text-[10px] font-medium text-slate-400">
                            No photo chosen
                          </span>
                        </div>
                      )}
                    </div>

                    {teacherPhoto && (
                      <button
                        type="button"
                        onClick={() => setTeacherPhoto(null)}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Upload Controls & Guide */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <h4 className="text-sm font-bold text-slate-800">
                      Passport Size Faculty Portrait
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Clear frontal portrait with light background. Displays in superadmin/admin
                      attendance registries and mobile apps.
                    </p>

                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F4E79] text-white rounded-lg text-xs font-semibold hover:bg-[#1a4368] transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {teacherPhoto ? "Change Photo" : "Upload Teacher Photo"}
                      </button>
                      <span className="text-[11px] text-slate-400">
                        Supports JPG, PNG, WebP (Max 4MB)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal & Credentials Information */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-[#1F4E79]" />
                    Personal & Account Credentials
                  </h3>
                  <span className="text-xs text-slate-400">* Required fields</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Faculty Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Gupta"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="teacher@school.edu"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                      />
                    </div>
                  </div>

                  {/* Temporary Password */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Temporary Portal Password <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="text-[10px] text-[#1F4E79] hover:underline flex items-center gap-1 font-medium"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Generate Strong Password
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 text-sm font-mono border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Professional Employment & Qualifications */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#1F4E79]" />
                    Employment & Academic Profile
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Employee ID */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Employee ID <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generateEmployeeId}
                        className="text-[10px] text-[#1F4E79] hover:underline flex items-center gap-1 font-medium"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Regenerate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                    />
                  </div>

                  {/* Monthly Base Salary */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Base Salary (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        placeholder="e.g. 45000"
                        className="w-full pl-8 pr-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Subjects Taught */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subjects Taught
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 min-h-[46px] bg-slate-50/50 mb-2">
                    {subjects.map((sub) => (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1F4E79]/10 text-[#1F4E79] text-xs font-medium"
                      >
                        {sub}
                        <button
                          type="button"
                          onClick={() => removeSubject(sub)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addSubject(customSubject);
                        }
                      }}
                      placeholder={subjects.length === 0 ? "Add subjects taught..." : "Type and enter..."}
                      className="flex-1 min-w-[120px] text-xs bg-transparent outline-none px-1"
                    />
                  </div>

                  {/* Subject Quick Suggestions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">Suggestions:</span>
                    {COMMON_SUBJECTS.map((cs) => (
                      <button
                        key={cs}
                        type="button"
                        onClick={() => addSubject(cs)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          subjects.includes(cs)
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                            : "bg-white text-slate-600 border-slate-200 hover:border-[#1F4E79] hover:text-[#1F4E79]"
                        }`}
                      >
                        + {cs}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Qualifications */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Degrees & Qualifications
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 min-h-[46px] bg-slate-50/50 mb-2">
                    {qualifications.map((q) => (
                      <span
                        key={q}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200/60"
                      >
                        {q}
                        <button
                          type="button"
                          onClick={() => removeQualification(q)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={customQual}
                      onChange={(e) => setCustomQual(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addQualification(customQual);
                        }
                      }}
                      placeholder={qualifications.length === 0 ? "Add degrees..." : "Type and enter..."}
                      className="flex-1 min-w-[120px] text-xs bg-transparent outline-none px-1"
                    />
                  </div>

                  {/* Qualification Suggestions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">Suggestions:</span>
                    {COMMON_QUALIFICATIONS.map((cq) => (
                      <button
                        key={cq}
                        type="button"
                        onClick={() => addQualification(cq)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          qualifications.includes(cq)
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-600 hover:text-emerald-700"
                        }`}
                      >
                        + {cq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Side: Live Faculty ID Card Preview (4 Columns) ── */}
            <div className="lg:col-span-4 space-y-6 sticky top-6">
              {/* Realtime ID Card Badge Preview */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden">
                <div className="bg-[#1F4E79] text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-bold tracking-wide uppercase">
                      Faculty ID Card Preview
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                    LIVE
                  </span>
                </div>

                <div className="p-4 bg-slate-100/70 flex justify-center">
                  {/* Simulated Card Visual */}
                  <div className="w-full max-w-xs bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-slate-800">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#1F4E79] via-[#245889] to-[#2c6aa3] px-3 py-2 text-white text-center">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider">
                        Delhi Public Global School
                      </h4>
                      <p className="text-[8px] text-white/80">Faculty & Staff Card</p>
                      <div className="mt-1 inline-block px-2 py-0.5 bg-emerald-400 text-slate-900 rounded-full text-[8px] font-bold uppercase">
                        Teaching Staff
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 space-y-2">
                      <div className="flex gap-3 items-center">
                        {/* Teacher Photo */}
                        <div className="w-16 h-20 rounded-lg border border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
                          {teacherPhoto ? (
                            <img
                              src={teacherPhoto}
                              alt="Teacher"
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

                        {/* Details */}
                        <div className="min-w-0 flex-1 space-y-0.5 text-left">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {name || "Faculty Name"}
                          </h4>
                          <p className="text-[10px] font-bold text-[#1F4E79]">
                            {qualifications.slice(0, 2).join(", ") || "Faculty"}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Emp ID: <span className="font-mono font-bold">{employeeId}</span>
                          </p>
                          <p className="text-[10px] text-slate-600 truncate">
                            Email: <span className="text-slate-800">{email || "—"}</span>
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Phone: <span className="font-mono">{phone || "—"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Subjects Tag List */}
                      <div className="pt-2 border-t border-slate-100 bg-slate-50 p-2 rounded-lg text-left">
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">
                          Assigned Subjects
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(subjects.length > 0 ? subjects : ["General Teaching"]).map((s) => (
                            <span
                              key={s}
                              className="text-[9px] px-1.5 py-0.5 bg-blue-100/70 text-[#1F4E79] font-medium rounded"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-100 px-3 py-1 text-center text-[7px] text-slate-400">
                      Official Faculty Identification Card
                    </div>
                  </div>
                </div>

                {/* Pre-flight Checklist */}
                <div className="p-4 space-y-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Faculty Checklist
                  </span>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        name ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {name ? "✓" : "○"}
                    </span>
                    <span>Teacher Name</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        email ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {email ? "✓" : "○"}
                    </span>
                    <span>Official Email</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        teacherPhoto ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {teacherPhoto ? "✓" : "!"}
                    </span>
                    <span>
                      {teacherPhoto ? "Photo Attached" : "Portrait Photo (Recommended)"}
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
                        Registering Faculty...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Complete Faculty Registration
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Creates user account, teacher profile, and sends welcome email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
