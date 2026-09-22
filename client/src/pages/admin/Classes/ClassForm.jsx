import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { X, Loader2 } from "lucide-react";
import { createClass, updateClass } from "../../../features/class/classSlice";
import { fetchTeachers } from "../../../features/teacher/teacherSlice";

// ── Validation schema ─────────────────────────────────────────────────────────
const schema = yup.object({
  className: yup.string().required("Class name is required"),
  section: yup.string().required("Section is required"),
  academicYear: yup
    .string()
    .matches(/^\d{4}-\d{2,4}$/, "Format: 2025-26")
    .required("Academic year is required"),
  classTeacherId: yup.string().nullable().optional(),
});

const FieldError = ({ message }) =>
  message ? <p className="text-xs text-red-500 mt-1">{message}</p> : null;

const ClassForm = ({ editData, onClose }) => {
  const dispatch = useDispatch();
  const { teachers } = useSelector((s) => s.teacher);
  const { user } = useSelector((s) => s.auth);

  const isEdit = !!editData;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: isEdit
      ? {
          className: editData.className,
          section: editData.section,
          academicYear: editData.academicYear,
          classTeacherId: editData.classTeacherId?._id || editData.classTeacherId || "",
        }
      : { className: "", section: "", academicYear: "2026-27", classTeacherId: "" },
  });

  useEffect(() => {
    dispatch(fetchTeachers({ limit: 100 }));
  }, [dispatch]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      schoolId:
        (typeof user?.schoolId === "object" ? user?.schoolId?._id : user?.schoolId) ||
        undefined,
      classTeacherId: values.classTeacherId || null,
    };

    let res;
    if (isEdit) {
      res = await dispatch(updateClass({ id: editData._id, data: payload }));
      if (updateClass.fulfilled.match(res)) {
        toast.success("Class updated successfully.");
        onClose();
      } else {
        toast.error(res.payload || "Update failed.");
      }
    } else {
      res = await dispatch(createClass(payload));
      if (createClass.fulfilled.match(res)) {
        toast.success("Class created successfully.");
        onClose();
      } else {
        toast.error(res.payload || "Create failed.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {isEdit ? "Edit Class" : "Add New Class"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? "Update class details below." : "Create a new class-section."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Class Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Class <span className="text-red-500">*</span>
              </label>
              <input
                {...register("className")}
                placeholder="e.g. 10"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
              />
              <FieldError message={errors.className?.message} />
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Section <span className="text-red-500">*</span>
              </label>
              <input
                {...register("section")}
                placeholder="e.g. A"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 uppercase"
              />
              <FieldError message={errors.section?.message} />
            </div>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Academic Year <span className="text-red-500">*</span>
            </label>
            <input
              {...register("academicYear")}
              placeholder="e.g. 2026-27"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
            />
            <FieldError message={errors.academicYear?.message} />
          </div>

          {/* Class Teacher */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Class Teacher (optional)
            </label>
            <select
              {...register("classTeacherId")}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-white"
            >
              <option value="">— Select teacher —</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.userId?.name || t.userInfo?.name || "Unknown"} ({t.employeeId})
                </option>
              ))}
            </select>
            <FieldError message={errors.classTeacherId?.message} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a4268] disabled:opacity-60 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassForm;
