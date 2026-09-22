import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  X, Loader2, ChevronRight, ChevronLeft,
  Upload, FileText, Trash2,
} from "lucide-react";
import { createStudent, updateStudent } from "../../../features/student/studentSlice";
import { fetchClasses } from "../../../features/class/classSlice";
import { uploadStudentDocumentsApi } from "../../../api/studentApi";

// ── Step schemas ───────────────────────────────────────────────────────────────
const step1Schema = yup.object({
  name: yup.string().min(2, "Min 2 chars").required("Full name is required"),
  dob: yup.string().required("Date of birth is required"),
  gender: yup.string().oneOf(["male", "female", "other", ""], "").nullable().optional(),
  address: yup.string().nullable().optional(),
  bloodGroup: yup.string().nullable().optional(),
});

const step2Schema = yup.object({
  admissionNumber: yup.string().required("Admission number is required"),
  classId: yup.string().required("Class is required"),
  rollNumber: yup.string().nullable().optional(),
  admissionDate: yup.string().nullable().optional(),
});

const step3Schema = yup.object({
  guardianEmail: yup.string().email("Invalid email").nullable().optional(),
});

const allSchemas = [step1Schema, step2Schema, step3Schema];

const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Academic" },
  { id: 3, label: "Guardian" },
  { id: 4, label: "Documents" },
];

const FieldError = ({ message }) =>
  message ? <p className="mt-1 text-xs text-red-500">{message}</p> : null;

const inputCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 placeholder:text-slate-400";

const StudentForm = ({ editData, onClose }) => {
  const dispatch = useDispatch();
  const { classes } = useSelector((s) => s.class);
  const isEdit = !!editData;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const userInfo = editData?.userId;
  const classInfo = editData?.classId;

  const schema = step <= 3 ? allSchemas[step - 1] : yup.object();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues:
      step === 1
        ? {
            name: editData?.name || userInfo?.name || "",
            dob: editData?.dob
              ? new Date(editData.dob).toISOString().slice(0, 10)
              : "",
            gender: editData?.gender || "",
            address: editData?.address || "",
            bloodGroup: editData?.bloodGroup || "",
          }
        : step === 2
        ? {
            admissionNumber: editData?.admissionNumber || "",
            classId: classInfo?._id || classInfo || "",
            rollNumber: editData?.rollNumber || "",
            admissionDate: editData?.admissionDate
              ? new Date(editData.admissionDate).toISOString().slice(0, 10)
              : "",
          }
        : { guardianEmail: "" },
  });

  useEffect(() => {
    dispatch(fetchClasses({ limit: 100 }));
  }, [dispatch]);

  // Reset form when step changes
  useEffect(() => {
    const defaults =
      step === 1
        ? {
            name: formData.name || editData?.name || userInfo?.name || "",
            dob: formData.dob || (editData?.dob ? new Date(editData.dob).toISOString().slice(0, 10) : ""),
            gender: formData.gender || editData?.gender || "",
            address: formData.address || editData?.address || "",
            bloodGroup: formData.bloodGroup || editData?.bloodGroup || "",
          }
        : step === 2
        ? {
            admissionNumber: formData.admissionNumber || editData?.admissionNumber || "",
            classId: formData.classId || classInfo?._id || "",
            rollNumber: formData.rollNumber || editData?.rollNumber || "",
            admissionDate: formData.admissionDate || "",
          }
        : { guardianEmail: formData.guardianEmail || "" };
    reset(defaults);
  }, [step]);

  const nextStep = handleSubmit((values) => {
    setFormData((prev) => ({ ...prev, ...values }));
    if (step < 4) setStep((s) => s + 1);
    else submitFinal({ ...formData, ...values });
  });

  const submitFinal = async (allData) => {
    let res;
    if (isEdit) {
      res = await dispatch(updateStudent({ id: editData._id, data: allData }));
      if (updateStudent.fulfilled.match(res)) {
        toast.success("Student updated.");
        onClose();
      } else {
        toast.error(res.payload || "Update failed.");
      }
    } else {
      res = await dispatch(createStudent(allData));
      if (createStudent.fulfilled.match(res)) {
        const studentId = res.payload._id;
        // Upload documents if any
        if (files.length > 0 && studentId) {
          setUploading(true);
          try {
            const fd = new FormData();
            files.forEach((f) => fd.append("documents", f));
            await uploadStudentDocumentsApi(studentId, fd);
            toast.success("Student created and documents uploaded.");
          } catch {
            toast.success("Student created, but document upload failed.");
          } finally {
            setUploading(false);
          }
        } else {
          toast.success("Student created successfully.");
        }
        onClose();
      } else {
        toast.error(res.payload || "Create failed.");
      }
    }
  };

  const handleFileAdd = (e) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input {...register("name")} placeholder="e.g. Riya Patel" className={inputCls} />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input {...register("dob")} type="date" className={inputCls} />
                <FieldError message={errors.dob?.message} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                <select {...register("gender")} className={`${inputCls} bg-white`}>
                  <option value="">— Select —</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
              <textarea
                {...register("address")}
                rows={2}
                placeholder="Home address…"
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Blood Group</label>
              <select {...register("bloodGroup")} className={`${inputCls} bg-white`}>
                <option value="">— Select —</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {!isEdit && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#1F4E79] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  i
                </div>
                <p className="text-xs text-[#1F4E79] leading-relaxed">
                  <strong>Student Self-Signup:</strong> You do not need to create login credentials now. Once admitted, the student will verify their Admission Number and Date of Birth to complete their self-signup.
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Admission Number <span className="text-red-500">*</span>
              </label>
              <input
                {...register("admissionNumber")}
                placeholder="e.g. ADM-2026-001"
                className={`${inputCls} uppercase`}
              />
              <FieldError message={errors.admissionNumber?.message} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Class <span className="text-red-500">*</span>
                </label>
                <select {...register("classId")} className={`${inputCls} bg-white`}>
                  <option value="">— Select class —</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.className}-{c.section} ({c.academicYear})
                    </option>
                  ))}
                </select>
                <FieldError message={errors.classId?.message} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Roll Number</label>
                <input {...register("rollNumber")} placeholder="e.g. 12" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Admission Date</label>
              <input {...register("admissionDate")} type="date" className={inputCls} />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Optionally link a parent/guardian email. A welcome notification will be sent to this address.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Guardian Email
              </label>
              <input
                {...register("guardianEmail")}
                type="email"
                placeholder="parent@example.com"
                className={inputCls}
              />
              <FieldError message={errors.guardianEmail?.message} />
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs text-[#1F4E79] leading-relaxed">
                <span className="font-semibold">Note:</span> Full guardian management (linking existing
                parent accounts, multiple guardians) will be available in Phase 3.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Upload admission documents, certificates, etc. (PDF, images, Word — max 5 MB each)
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#1F4E79]/40 hover:bg-slate-50/60 transition-all group"
            >
              <Upload className="w-8 h-8 text-slate-300 group-hover:text-[#1F4E79]/50 mx-auto mb-2 transition-colors" />
              <p className="text-sm text-slate-500">Click to browse files</p>
              <p className="text-xs text-slate-400 mt-1">or drag and drop (max 10 files)</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                onChange={handleFileAdd}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#1F4E79] flex-shrink-0" />
                      <span className="text-xs text-slate-700 truncate">{f.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        ({(f.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {isEdit ? "Edit Student" : "Add New Student"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Step {step} of {STEPS.length}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-0">
          <div className="flex items-center gap-1">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all
                    ${step === s.id
                      ? "bg-[#1F4E79] text-white ring-4 ring-[#1F4E79]/20"
                      : step > s.id
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400"
                    }`}
                >
                  {step > s.id ? "✓" : s.id}
                </div>
                <p
                  className={`ml-1.5 text-xs font-medium hidden sm:block transition-colors
                    ${step >= s.id ? "text-slate-700" : "text-slate-400"}`}
                >
                  {s.label}
                </p>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 transition-all
                      ${step > s.id ? "bg-emerald-400" : "bg-slate-200"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="p-6">{renderStep()}</div>

        {/* Footer nav */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            type="button"
            onClick={step < 4 ? nextStep : () => {
              const currentFormData = { ...formData };
              submitFinal(currentFormData);
            }}
            disabled={isSubmitting || uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a4268] disabled:opacity-60 transition-colors"
          >
            {(isSubmitting || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
            {step < 4
              ? (<>Next <ChevronRight className="w-4 h-4" /></>)
              : (isEdit ? "Save Changes" : "Create Student")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentForm;
