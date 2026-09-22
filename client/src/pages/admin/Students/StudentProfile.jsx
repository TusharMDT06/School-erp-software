import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  ArrowLeft, GraduationCap, MapPin, Phone, Mail,
  Calendar, Droplets, FileText, Users, Clock, BookOpen,
  DollarSign, BarChart2, ExternalLink,
} from "lucide-react";
import { getStudentByIdApi } from "../../../api/studentApi";

// ── Skeleton ────────────────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-[#1F4E79]/8 flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-[#1F4E79]" />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || "—"}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    transferred: "bg-amber-50 text-amber-700 border-amber-200",
    alumni: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border capitalize
        ${styles[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
    >
      {status}
    </span>
  );
};

const TABS = [
  { id: "overview", label: "Overview", icon: GraduationCap },
  { id: "attendance", label: "Attendance", icon: Clock },
  { id: "fees", label: "Fees", icon: DollarSign },
  { id: "results", label: "Results", icon: BarChart2 },
];

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getStudentByIdApi(id);
        setStudent(res.data);
      } catch {
        toast.error("Failed to load student profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 rounded-2xl" />
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!student) return null;

  const userInfo = student.userId;
  const cls = student.classId;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#1F4E79] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Students
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left sidebar — identity card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Gradient banner */}
            <div className="h-20 bg-gradient-to-r from-sky-500 to-[#1F4E79]" />
            <div className="px-5 pb-5">
              <div className="-mt-10 mb-3">
                <div className="w-20 h-20 rounded-2xl bg-white ring-4 ring-white shadow-md flex items-center justify-center bg-gradient-to-br from-sky-400 to-sky-600 text-white text-3xl font-bold">
                  {(student.name || userInfo?.name || "S")?.charAt(0)?.toUpperCase()}
                </div>
              </div>
              <h2 className="text-lg font-bold text-slate-800">{student.name || userInfo?.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {userInfo?.email || (
                  <span className="text-amber-600 font-medium">Pending self-signup activation</span>
                )}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge status={student.status} />
                {student.isAccountActivated ? (
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                    Activated
                  </span>
                ) : (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                    Pending
                  </span>
                )}
                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {student.admissionNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Quick info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Quick Info
            </h3>
            <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(student.dob)} />
            <InfoRow
              icon={GraduationCap}
              label="Class"
              value={cls ? `${cls.className}-${cls.section} (${cls.academicYear})` : null}
            />
            <InfoRow icon={Users} label="Roll Number" value={student.rollNumber} />
            <InfoRow icon={Droplets} label="Blood Group" value={student.bloodGroup} />
            <InfoRow
              icon={Calendar}
              label="Admission Date"
              value={formatDate(student.admissionDate)}
            />
            {userInfo?.phone && (
              <InfoRow icon={Phone} label="Phone" value={userInfo.phone} />
            )}
            {student.address && (
              <InfoRow icon={MapPin} label="Address" value={student.address} />
            )}
          </div>
        </div>

        {/* Right — tabbed content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab bar */}
          <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                  ${activeTab === id
                    ? "bg-[#1F4E79] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            {activeTab === "overview" && (
              <div className="p-5 space-y-5">
                {/* Guardians */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#1F4E79]" />
                    Guardians
                  </h3>
                  {student.guardianIds?.length > 0 ? (
                    <div className="space-y-2">
                      {student.guardianIds.map((g) => (
                        <div
                          key={g._id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                        >
                          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                            {g.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{g.name}</p>
                            <p className="text-xs text-slate-400">{g.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No guardians linked.</p>
                  )}
                </div>

                {/* Documents */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#1F4E79]" />
                    Documents
                  </h3>
                  {student.documents?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {student.documents.map((doc, i) => (
                        <a
                          key={i}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 border border-slate-100 rounded-xl hover:border-[#1F4E79]/30 hover:bg-slate-50 transition-all group"
                        >
                          <FileText className="w-4 h-4 text-[#1F4E79] flex-shrink-0" />
                          <span className="text-sm text-slate-700 truncate flex-1">{doc.name}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1F4E79] transition-colors flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No documents uploaded.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab !== "overview" && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  {activeTab === "attendance" && <Clock className="w-8 h-8 text-slate-400" />}
                  {activeTab === "fees" && <DollarSign className="w-8 h-8 text-slate-400" />}
                  {activeTab === "results" && <BarChart2 className="w-8 h-8 text-slate-400" />}
                </div>
                <p className="font-semibold text-slate-600 capitalize">{activeTab} Management</p>
                <p className="text-sm text-slate-400 mt-1">Coming in Phase 3 — stay tuned!</p>
                <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs bg-[#1F4E79]/10 text-[#1F4E79] font-medium">
                  Phase 3
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
