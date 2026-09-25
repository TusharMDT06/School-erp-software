import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Plus, Search, ChevronLeft, ChevronRight,
  Pencil, UserX, UserCheck, BadgeCheck, Mail, Trash2,
} from "lucide-react";
import { fetchTeachers, deleteTeacher, updateTeacher } from "../../../features/teacher/teacherSlice";
import TeacherForm from "./TeacherForm";

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(6)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

const StatusPill = ({ isActive }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${isActive
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-500"
      }`}
  >
    {isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
    {isActive ? "Active" : "Inactive"}
  </span>
);

const TeacherList = () => {
  const dispatch = useDispatch();
  const { teachers, loading, totalCount, totalPages, page } = useSelector(
    (s) => s.teacher
  );

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const reload = useCallback(
    (p = currentPage) => {
      dispatch(fetchTeachers({ page: p, limit: 12, ...(search && { search }) }));
    },
    [dispatch, search, currentPage]
  );

  useEffect(() => {
    reload(1);
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    reload(currentPage);
  }, [currentPage]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDeactivate = async (target) => {
    const targetId = target?._id || target;
    const currentActive = target?.userId?.isActive !== false;
    // Toggle active status
    const res = await dispatch(updateTeacher({ id: targetId, data: { isActive: !currentActive } }));
    if (updateTeacher.fulfilled.match(res)) {
      toast.success(!currentActive ? "Teacher activated." : "Teacher deactivated.");
      setConfirmDeactivate(null);
      reload();
    } else {
      toast.error(res.payload || "Operation failed.");
      setConfirmDeactivate(null);
    }
  };

  const handleDelete = async (target) => {
    if (!target?._id) return;
    const res = await dispatch(deleteTeacher(target._id));
    if (deleteTeacher.fulfilled.match(res)) {
      toast.success(`${target.userId?.name || target.name || "Teacher"} deleted successfully.`);
      setConfirmDelete(null);
      reload();
    } else {
      toast.error(res.payload || "Failed to delete teacher.");
      setConfirmDelete(null);
    }
  };

  const openEdit = (t) => {
    setEditTarget(t);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditTarget(null);
    reload();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Teachers</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} total teachers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, ID…"
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 w-56"
            />
          </div>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1F4E79] text-white rounded-lg text-sm font-medium hover:bg-[#1a4268] transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Teacher
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Teacher", "Employee ID", "Subjects", "Email", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                : teachers.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <BadgeCheck className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="font-medium">No teachers found</p>
                        <p className="text-xs">Add your first teacher to get started</p>
                      </div>
                    </td>
                  </tr>
                )
                : teachers.map((t) => {
                  const info = t.userId || t.userInfo;
                  return (
                    <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-2xs">
                            {info?.profileImage ? (
                              <img
                                src={info.profileImage}
                                alt={info.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              info?.name?.charAt(0)?.toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{info?.name}</p>
                            <p className="text-xs text-slate-400">{info?.phone || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {t.employeeId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(t.subjects || []).slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-[#1F4E79]"
                            >
                              {s}
                            </span>
                          ))}
                          {t.subjects?.length > 3 && (
                            <span className="text-xs text-slate-400">
                              +{t.subjects.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`mailto:${info?.email}`}
                          className="flex items-center gap-1 text-[#1F4E79] hover:underline text-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {info?.email}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill isActive={info?.isActive !== false} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-[#1F4E79] transition-colors"
                            title="Edit Teacher"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeactivate(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title={info?.isActive !== false ? "Deactivate Teacher" : "Activate Teacher"}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete Teacher"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <TeacherForm editData={editTarget} onClose={handleModalClose} />
      )}

      {/* Confirm deactivate */}
      {confirmDeactivate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-2">
              {confirmDeactivate.userId?.isActive !== false ? "Deactivate Teacher?" : "Activate Teacher?"}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              {confirmDeactivate.userId?.isActive !== false
                ? "The teacher's account will be disabled. They will not be able to log in until activated again."
                : "The teacher's account will be enabled."}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeactivate(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeactivate(confirmDeactivate)}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">Delete Teacher?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-slate-700">
                {confirmDelete.userId?.name || confirmDelete.name || "this teacher"}
              </span>
              ? This action will permanently remove their records and login access from the school system.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherList;
