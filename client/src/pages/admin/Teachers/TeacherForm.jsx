import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { X, Loader2, Plus, X as XIcon } from "lucide-react";
import { createTeacher, updateTeacher } from "../../../features/teacher/teacherSlice";

// ── Validation ─────────────────────────────────────────────────────────────────
const createSchema = yup.object({
  name: yup.string().min(2, "Min 2 chars").required("Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .min(6, "Min 6 chars")
    .required("Password is required"),
  phone: yup.string().nullable().optional(),
  employeeId: yup.string().required("Employee ID is required"),
  joiningDate: yup.string().nullable().optional(),
  salary: yup
    .number()
    .nullable()
    .transform((v) => (isNaN(v) ? null : v))
    .optional(),
});

const editSchema = yup.object({
  name: yup.string().min(2).required("Name is required"),
  phone: yup.string().nullable().optional(),
  employeeId: yup.string().required("Employee ID is required"),
  joiningDate: yup.string().nullable().optional(),
  salary: yup
    .number()
    .nullable()
    .transform((v) => (isNaN(v) ? null : v))
    .optional(),
});

const FieldError = ({ message }) =>
  message ? <p className="mt-1 text-xs text-red-500">{message}</p> : null;

// ── Tag input for subjects / qualifications ────────────────────────────────────
const TagInput = ({ tags, onChange, placeholder }) => {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput("");
  };

  const remove = (tag) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="border border-slate-200 rounded-lg p-2 flex flex-wrap gap-1.5 min-h-[42px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1F4E79]/10 text-[#1F4E79] text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            className="hover:text-red-500 transition-colors"
          >
            <XIcon className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] text-sm outline-none bg-transparent placeholder:text-slate-400"
      />
      {input && (
        <button
          type="button"
          onClick={add}
          className="p-0.5 rounded text-[#1F4E79] hover:bg-[#1F4E79]/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

const TeacherForm = ({ editData, onClose }) => {
  const dispatch = useDispatch();
  const isEdit = !!editData;

  const userInfo = editData?.userId || editData?.userInfo;

  const [subjects, setSubjects] = useState(editData?.subjects || []);
  const [qualifications, setQualifications] = useState(
    editData?.qualifications || []
  );

  const schema = isEdit ? editSchema : createSchema;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: isEdit
      ? {
          name: userInfo?.name || "",
          phone: userInfo?.phone || "",
          employeeId: editData.employeeId || "",
          joiningDate: editData.joiningDate
            ? new Date(editData.joiningDate).toISOString().slice(0, 10)
            : "",
          salary: editData.salary || "",
        }
      : {
          name: "", email: "", password: "", phone: "",
          employeeId: "", joiningDate: "", salary: "",
        },
  });

  const onSubmit = async (values) => {
    const payload = { ...values, subjects, qualifications };

    let res;
    if (isEdit) {
      res = await dispatch(updateTeacher({ id: editData._id, data: payload }));
      if (updateTeacher.fulfilled.match(res)) {
        toast.success("Teacher updated.");
        onClose();
      } else {
        toast.error(res.payload || "Update failed.");
      }
    } else {
      res = await dispatch(createTeacher(payload));
      if (createTeacher.fulfilled.match(res)) {
        toast.success("Teacher created. Welcome email sent.");
        onClose();
      } else {
        toast.error(res.payload || "Create failed.");
      }
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 placeholder:text-slate-400";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {isEdit ? "Edit Teacher" : "Add Teacher"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? "Update teacher profile."
                : "A welcome email with credentials will be sent."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input {...register("name")} placeholder="e.g. Priya Sharma" className={inputCls} />
            <FieldError message={errors.name?.message} />
          </div>

          {/* Email + Password (create only) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="teacher@school.com"
                  className={inputCls}
                />
                <FieldError message={errors.email?.message} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("password")}
                  type="password"
                  placeholder="Min 6 chars"
                  className={inputCls}
                />
                <FieldError message={errors.password?.message} />
              </div>
            </div>
          )}

          {/* Phone + Employee ID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
              <input {...register("phone")} placeholder="+91 9000000000" className={inputCls} />
              <FieldError message={errors.phone?.message} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                {...register("employeeId")}
                placeholder="EMP-001"
                className={`${inputCls} uppercase`}
              />
              <FieldError message={errors.employeeId?.message} />
            </div>
          </div>

          {/* Joining Date + Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Joining Date</label>
              <input {...register("joiningDate")} type="date" className={inputCls} />
              <FieldError message={errors.joiningDate?.message} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Salary (₹)
              </label>
              <input
                {...register("salary")}
                type="number"
                placeholder="e.g. 45000"
                className={inputCls}
              />
              <FieldError message={errors.salary?.message} />
            </div>
          </div>

          {/* Subjects */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Subjects <span className="text-slate-400 font-normal">(press Enter or comma to add)</span>
            </label>
            <TagInput
              tags={subjects}
              onChange={setSubjects}
              placeholder="e.g. Mathematics, Physics…"
            />
          </div>

          {/* Qualifications */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Qualifications <span className="text-slate-400 font-normal">(press Enter or comma to add)</span>
            </label>
            <TagInput
              tags={qualifications}
              onChange={setQualifications}
              placeholder="e.g. B.Ed, M.Sc…"
            />
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
              {isEdit ? "Save Changes" : "Create Teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherForm;
