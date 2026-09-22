import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight,
  Eye, Pencil, UserX, GraduationCap,
} from "lucide-react";
import { fetchStudents, deleteStudent } from "../../../features/student/studentSlice";
import { fetchClasses } from "../../../features/class/classSlice";
import StudentForm from "./StudentForm";

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(6)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-slate-200 rounded w-4/5" />
      </td>
    ))}
  </tr>
);

const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    transferred: "bg-amber-50 text-amber-700",
    alumni: "bg-purple-50 text-purple-700",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize
        ${styles[status] || "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
};

const StudentList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { students, loading, totalCount, totalPages, page } = useSelector(
    (s) => s.student
  );
  const { classes } = useSelector((s) => s.class);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  // Load classes for filter dropdown
  useEffect(() => {
    dispatch(fetchClasses({ limit: 100 }));
  }, [dispatch]);

  const reload = useCallback(
    (p = 1) => {
      dispatch(
        fetchStudents({
          page: p,
          limit: 15,
          ...(search && { search }),
          ...(classFilter && { classId: classFilter }),
          ...(statusFilter && { status: statusFilter }),
        })
      );
    },
    [dispatch, search, classFilter, statusFilter]
  );

  // Re-fetch when filters change
  useEffect(() => {
    setCurrentPage(1);
    reload(1);
  }, [search, classFilter, statusFilter]);

  useEffect(() => {
    reload(currentPage);
  }, [currentPage]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDeactivate = async (id) => {
    const res = await dispatch(deleteStudent(id));
    if (deleteStudent.fulfilled.match(res)) {
      toast.success("Student deactivated.");
      setConfirmDeactivate(null);
    } else {
      toast.error(res.payload || "Operation failed.");
      setConfirmDeactivate(null);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditTarget(null);
    reload(currentPage);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Students</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} total students</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1F4E79] text-white rounded-lg text-sm font-medium hover:bg-[#1a4268] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or admission no…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              Class {c.className}-{c.section} ({c.academicYear})
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="transferred">Transferred</option>
          <option value="alumni">Alumni</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  "Admission No",
                  "Student",
                  "Class / Section",
                  "Roll No",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                : students.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="font-medium">No students found</p>
                        <p className="text-xs">
                          {search || classFilter || statusFilter
                            ? "Try adjusting your filters"
                            : "Add your first student to get started"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )
                : students.map((s) => {
                  const userInfo = s.userId || s.userInfo;
                  const cls = s.classId;
                  return (
                    <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {s.admissionNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-2xs">
                            {userInfo?.profileImage ? (
                              <img
                                src={userInfo.profileImage}
                                alt={s.name || userInfo?.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              (s.name || userInfo?.name || "S")?.charAt(0)?.toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{s.name || userInfo?.name}</p>
                            <p className="text-xs text-slate-400">
                              {userInfo?.email ? (
                                userInfo.email
                              ) : (
                                <span className="inline-flex items-center text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                                  Pending activation
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {cls
                          ? `${cls.className}-${cls.section}`
                          : <span className="text-slate-400 text-xs italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.rollNumber || <span className="text-slate-400 text-xs italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/students/${s._id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                            title="View profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditTarget(s); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-[#1F4E79] transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {s.status === "active" && (
                            <button
                              onClick={() => setConfirmDeactivate(s._id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Deactivate"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
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
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} &nbsp;·&nbsp; {totalCount} students
            </p>
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

      {/* Student Form Modal */}
      {modalOpen && (
        <StudentForm editData={editTarget} onClose={handleModalClose} />
      )}

      {/* Confirm deactivate */}
      {confirmDeactivate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-2">
              Deactivate Student?
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              The student will be marked as Transferred and their login deactivated.
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
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
