import { useEffect, useState, useCallback } from "react";
import {
  getMyStudyMaterialsApi,
  createStudyMaterialApi,
  updateStudyMaterialApi,
  togglePublishMaterialApi,
  deleteStudyMaterialApi,
} from "../../api/studyMaterialApi";
import { getTeacherClassesAndSubjectsApi } from "../../api/teacherDashboardApi";
import toast from "react-hot-toast";
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Video,
  Link as LinkIcon,
  Image as ImageIcon,
  Presentation,
  UploadCloud,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Calendar,
  X,
  Layers,
  Download,
} from "lucide-react";

const TeacherStudyMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [teacherMeta, setTeacherMeta] = useState({ classes: [], subjects: [] });

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    classId: "",
    subject: "",
    title: "",
    description: "",
    type: "pdf",
    linkUrl: "",
    chapter: "",
    visibleFrom: "",
    isPublished: true,
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch teacher materials
  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getMyStudyMaterialsApi({
        classId: filterClass || undefined,
      });
      if (res.success && res.data) {
        setMaterials(res.data);
      }
    } catch (err) {
      console.error("Failed to load study materials:", err);
      toast.error("Failed to load study materials.");
    } finally {
      setLoading(false);
    }
  }, [filterClass]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await getTeacherClassesAndSubjectsApi();
        if (res.success && res.data) {
          setTeacherMeta({
            classes: res.data.classes || [],
            subjects: res.data.subjects || [],
          });
        }
      } catch (err) {
        console.error("Failed to load teacher metadata:", err);
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingMaterial(null);
    setFormData({
      classId: teacherMeta.classes[0]?._id || "",
      subject: teacherMeta.subjects[0] || "",
      title: "",
      description: "",
      type: "pdf",
      linkUrl: "",
      chapter: "",
      visibleFrom: new Date().toISOString().slice(0, 10),
      isPublished: true,
    });
    setUploadFile(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (m) => {
    setEditingMaterial(m);
    setFormData({
      classId: m.classId?._id || m.classId,
      subject: m.subject,
      title: m.title,
      description: m.description || "",
      type: m.type,
      linkUrl: m.linkUrl || "",
      chapter: m.chapter || "",
      visibleFrom: m.visibleFrom ? new Date(m.visibleFrom).toISOString().slice(0, 10) : "",
      isPublished: Boolean(m.isPublished),
    });
    setUploadFile(null);
    setIsModalOpen(true);
  };

  // Submit Material
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.classId || !formData.subject || !formData.title || !formData.type) {
      return toast.error("Please fill in all required fields.");
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append("classId", formData.classId);
      data.append("subject", formData.subject);
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("type", formData.type);
      if (formData.linkUrl) data.append("linkUrl", formData.linkUrl);
      if (formData.chapter) data.append("chapter", formData.chapter);
      if (formData.visibleFrom) data.append("visibleFrom", formData.visibleFrom);
      data.append("isPublished", formData.isPublished);

      if (uploadFile) {
        data.append("file", uploadFile);
      }

      if (editingMaterial) {
        await updateStudyMaterialApi(editingMaterial._id, data);
        toast.success("Study material updated successfully.");
      } else {
        await createStudyMaterialApi(data);
        toast.success("Study material published to class.");
      }

      setIsModalOpen(false);
      fetchMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save study material.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Published
  const handleTogglePublish = async (id) => {
    try {
      const res = await togglePublishMaterialApi(id);
      toast.success(res.message || "Material status updated.");
      fetchMaterials();
    } catch (err) {
      toast.error("Failed to toggle publish status.");
    }
  };

  // Delete Material
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete or unpublish this material?")) return;
    try {
      const res = await deleteStudyMaterialApi(id);
      toast.success(res.message || "Material deleted.");
      fetchMaterials();
    } catch (err) {
      toast.error("Failed to delete material.");
    }
  };

  // Type icon helper
  const getTypeBadge = (type) => {
    switch (type) {
      case "pdf":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"><FileText className="w-3 h-3" /> PDF</span>;
      case "video_link":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"><Video className="w-3 h-3" /> Video</span>;
      case "doc":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><FileText className="w-3 h-3" /> Document</span>;
      case "ppt":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Presentation className="w-3 h-3" /> Presentation</span>;
      case "image":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><ImageIcon className="w-3 h-3" /> Image</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"><LinkIcon className="w-3 h-3" /> Link</span>;
    }
  };

  // Group materials by Class & Subject
  const filteredMaterials = materials.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.title.toLowerCase().includes(term) ||
      m.subject.toLowerCase().includes(term) ||
      (m.chapter && m.chapter.toLowerCase().includes(term))
    );
  });

  const groupedMaterials = filteredMaterials.reduce((acc, m) => {
    const groupKey = `${m.classId?.className || "General"}-${m.classId?.section || ""} • ${m.subject}`;
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(m);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-teal-600" />
            Study Materials & Resources
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload notes, lecture presentations, worksheets, and educational video links for your classes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Material</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by title, chapter, subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full md:w-auto px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
          >
            <option value="">All My Classes</option>
            {teacherMeta.classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                Class {cls.className} - {cls.section}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Materials Table / Cards */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : Object.keys(groupedMaterials).length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Study Materials Found
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't uploaded study materials yet. Share lesson notes and worksheets with your students.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Material</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedMaterials).map(([groupTitle, items]) => (
            <div
              key={groupTitle}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Group Section Header */}
              <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  {groupTitle}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md">
                  {items.length} Resource{items.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Items Table */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((m) => (
                  <div
                    key={m._id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getTypeBadge(m.type)}
                        {m.chapter && (
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                            Chapter: {m.chapter}
                          </span>
                        )}
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            m.isPublished
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {m.isPublished ? "Published" : "Draft / Unpublished"}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {m.title}
                      </h4>

                      {m.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{m.description}</p>
                      )}

                      <p className="text-[11px] text-slate-400">
                        Visible From: {new Date(m.visibleFrom).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {m.fileUrl && (
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View / Download</span>
                        </a>
                      )}

                      {m.linkUrl && (
                        <a
                          href={m.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-semibold transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Link</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleTogglePublish(m._id)}
                        className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg transition"
                        title={m.isPublished ? "Unpublish" : "Publish"}
                      >
                        {m.isPublished ? (
                          <XCircle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-lg transition"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(m._id)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                        title="Unpublish or Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingMaterial ? "Edit Study Material" : "Upload Study Material"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Class & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Class & Section *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Select Class</option>
                    {teacherMeta.classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        Class {cls.className} - {cls.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Subject *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Select Subject</option>
                    {teacherMeta.subjects.map((s, idx) => (
                      <option key={idx} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title & Chapter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Material Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Thermodynamics Chapter Notes"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Chapter / Unit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chapter 3"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Resource Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="doc">Word Document (.docx)</option>
                    <option value="ppt">PowerPoint Presentation (.pptx)</option>
                    <option value="image">Image (Infographic / Diagram)</option>
                    <option value="video_link">Video Link (YouTube / Vimeo)</option>
                    <option value="link">External Web Link</option>
                  </select>
                </div>
              </div>

              {/* File upload OR Link URL */}
              {["video_link", "link"].includes(formData.type) ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Resource URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Upload File (Max 10MB)
                  </label>
                  <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                      onChange={(e) => setUploadFile(e.target.files[0] || null)}
                      className="hidden"
                      id="material-file-upload"
                    />
                    <label htmlFor="material-file-upload" className="cursor-pointer block">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs text-teal-600 font-semibold">
                        {uploadFile ? uploadFile.name : "Click to choose file"}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Description / Notes for Students
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary or reading guidance..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Visible From & Published Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Visible From
                  </label>
                  <input
                    type="date"
                    value={formData.visibleFrom}
                    onChange={(e) => setFormData({ ...formData, visibleFrom: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) =>
                        setFormData({ ...formData, isPublished: e.target.checked })
                      }
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Publish immediately to class
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow transition"
                >
                  {submitting ? "Saving..." : editingMaterial ? "Update Material" : "Publish Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherStudyMaterials;
