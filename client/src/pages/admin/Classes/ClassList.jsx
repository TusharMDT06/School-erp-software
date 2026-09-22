import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchClasses, deleteClass } from "../../../features/class/classSlice";
import ClassForm from "./ClassForm";

// ── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(6)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

// ── Status badge ─────────────────────────────────────────────────────────────
const AcademicYearBadge = ({ year }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#1F4E79]">
    {year}
  </span>
);

const ClassList = () => {
  const dispatch = useDispatch();
  const { classes, loading, totalCount, totalPages, page } = useSelector(
    (s) => s.class
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const reload = (p = currentPage) => {
    dispatch(
      fetchClasses({
        page: p,
        limit: 12,
        ...(academicYearFilter && { academicYear: academicYearFilter }),
      })
    );
  };

  useEffect(() => {
    reload(1);
    setCurrentPage(1);
  }, [academicYearFilter]);

  useEffect(() => {
    reload(currentPage);
  }, [currentPage]);

  const handleDelete = async (id) => {
    const res = await dispatch(deleteClass(id));
    if (deleteClass.fulfilled.match(res)) {
      toast.success("Class deleted.");
      setConfirmDelete(null);
      reload();
    } else {
      toast.error(res.payload || "Delete failed.");
      setConfirmDelete(null);
    }
  };

  const openEdit = (cls) => {
    setEditTarget(cls);
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
          <h2 className="text-xl font-bold text-slate-800">Class &amp; Sections</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} total class-sections</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={academicYearFilter}
            onChange={(e) => setAcademicYearFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
          >
            <option value="">All Years</option>
            {["2025-26", "2026-27", "2027-28"].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1F4E79] text-white rounded-lg text-sm font-medium hover:bg-[#1a4268] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Class", "Section", "Academic Year", "Class Teacher", "Students", "Actions"].map(
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
                : classes.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="font-medium">No classes yet</p>
                        <p className="text-xs">Create a class to get started</p>
                      </div>
                    </td>
                  </tr>
                )
                : classes.map((cls) => (
                  <tr key={cls._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">Class {cls.className}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#1F4E79]/10 text-[#1F4E79] font-bold text-sm">
                        {cls.section}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AcademicYearBadge year={cls.academicYear} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cls.classTeacherId?.userId?.name || (
                        <span className="text-slate-400 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {cls.studentCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(cls)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-[#1F4E79] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(cls._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <ClassForm editData={editTarget} onClose={handleModalClose} />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Delete Class?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently delete this class. Classes with active students cannot be deleted.
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassList;
