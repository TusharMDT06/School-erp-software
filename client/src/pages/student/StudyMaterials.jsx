import { useEffect, useState, useCallback } from "react";
import { getStudentMaterialsApi } from "../../api/studyMaterialApi";
import toast from "react-hot-toast";
import {
  BookOpen,
  Search,
  FileText,
  Video,
  Link as LinkIcon,
  Image as ImageIcon,
  Presentation,
  Download,
  ExternalLink,
  Layers,
  Calendar,
  Sparkles,
} from "lucide-react";

const StudentStudyMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStudentMaterialsApi({
        subject: selectedSubject || undefined,
      });
      if (res.success && res.data) {
        setMaterials(res.data);
      }
    } catch (err) {
      console.error("Failed to load study materials:", err);
      toast.error("Failed to load materials.");
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Extract unique subjects for filter tabs
  const subjectsList = Array.from(new Set(materials.map((m) => m.subject).filter(Boolean)));

  const filteredMaterials = materials.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.title.toLowerCase().includes(term) ||
      m.subject.toLowerCase().includes(term) ||
      (m.chapter && m.chapter.toLowerCase().includes(term))
    );
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case "pdf":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700"><FileText className="w-3 h-3" /> PDF</span>;
      case "video_link":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><Video className="w-3 h-3" /> Video</span>;
      case "doc":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><FileText className="w-3 h-3" /> Document</span>;
      case "ppt":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Presentation className="w-3 h-3" /> Presentation</span>;
      case "image":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><ImageIcon className="w-3 h-3" /> Diagram</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700"><LinkIcon className="w-3 h-3" /> Link</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-sky-600" />
          Study Materials & Class Notes
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Access course syllabus, chapter notes, presentations, and reference videos shared by your teachers.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search notes, chapters, topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedSubject("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              selectedSubject === ""
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Subjects
          </button>
          {subjectsList.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                selectedSubject === subj
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            No Study Materials Available
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Your teachers haven't uploaded materials for this subject yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((m) => (
            <div
              key={m._id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {m.subject}
                  </span>
                  {getTypeBadge(m.type)}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                    {m.title}
                  </h3>
                  {m.chapter && (
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Chapter: {m.chapter}
                    </p>
                  )}
                </div>

                {m.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {m.description}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(m.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>

                {m.fileUrl ? (
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View / Download</span>
                  </a>
                ) : m.linkUrl ? (
                  <a
                    href={m.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Resource</span>
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentStudyMaterials;

