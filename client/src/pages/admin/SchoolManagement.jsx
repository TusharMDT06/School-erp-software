import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import {
  School as SchoolIcon,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Building2,
  ExternalLink,
} from "lucide-react";
import {
  getSchoolsApi,
  createSchoolApi,
  updateSchoolApi,
  deleteSchoolApi,
} from "../../api/schoolApi";

const schema = yup.object({
  name: yup.string().min(2, "Name must be at least 2 characters").required("School name is required"),
  address: yup.string().nullable().optional(),
  contactEmail: yup.string().email("Invalid email").nullable().optional(),
  contactPhone: yup.string().nullable().optional(),
  logoUrl: yup.string().url("Must be a valid URL").nullable().optional(),
});

const SchoolManagement = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const loadSchools = async () => {
    try {
      setLoading(true);
      const res = await getSchoolsApi();
      setSchools(res.data || []);
    } catch (err) {
      toast.error("Failed to load schools.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const openAddModal = () => {
    setEditingSchool(null);
    reset({
      name: "",
      address: "",
      contactEmail: "",
      contactPhone: "",
      logoUrl: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (school) => {
    setEditingSchool(school);
    reset({
      name: school.name || "",
      address: school.address || "",
      contactEmail: school.contactEmail || "",
      contactPhone: school.contactPhone || "",
      logoUrl: school.logoUrl || "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingSchool) {
        await updateSchoolApi(editingSchool._id, data);
        toast.success("School details updated successfully!");
      } else {
        await createSchoolApi(data);
        toast.success("New school created successfully!");
      }
      setModalOpen(false);
      loadSchools();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save school.";
      toast.error(msg);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this school institution?")) return;
    try {
      await deleteSchoolApi(id);
      toast.success("School deactivated successfully.");
      loadSchools();
    } catch (err) {
      toast.error("Failed to deactivate school.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">School Institutions</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage multi-campus schools, affiliation records, and campus contact details.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#1F4E79] text-white rounded-xl text-xs font-semibold hover:bg-[#1a4268] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add School
        </button>
      </div>

      {/* Grid of School Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-60 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : schools.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-semibold text-slate-700">No schools registered yet</h3>
          <p className="text-xs text-slate-400 mt-1">Add your first school campus to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {schools.map((school) => (
            <div
              key={school._id}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1F4E79] font-bold text-lg overflow-hidden flex-shrink-0">
                      {school.logoUrl ? (
                        <img
                          src={school.logoUrl}
                          alt={school.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <SchoolIcon className="w-6 h-6 text-[#1F4E79]" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800 leading-tight">
                        {school.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        {school.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Active Campus
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(school)}
                      className="p-1.5 text-slate-400 hover:text-[#1F4E79] hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit School"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {school.isActive && (
                      <button
                        onClick={() => handleDeactivate(school._id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 border-t border-slate-50 pt-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>{school.address || "Address not provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>{school.contactEmail || "No contact email"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>{school.contactPhone || "No contact phone"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
                <span>Created: {new Date(school.createdAt).toLocaleDateString("en-IN")}</span>
                <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                  ID: {school._id.slice(-6)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-6 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                {editingSchool ? "Edit School Institution" : "Add New School"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  School / Campus Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name")}
                  placeholder="e.g. St. Xavier's International Academy"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 ${
                    errors.name ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Campus Address</label>
                <textarea
                  {...register("address")}
                  rows={2}
                  placeholder="e.g. Sector 42, Institutional Area, New Delhi"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contact Email</label>
                  <input
                    {...register("contactEmail")}
                    type="email"
                    placeholder="contact@school.edu"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                  />
                  {errors.contactEmail && (
                    <p className="mt-1 text-xs text-red-500">{errors.contactEmail.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input
                    {...register("contactPhone")}
                    placeholder="+91 11 2345 6789"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Logo URL</label>
                <input
                  {...register("logoUrl")}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                />
                {errors.logoUrl && <p className="mt-1 text-xs text-red-500">{errors.logoUrl.message}</p>}
              </div>

              <div className="pt-3 flex gap-3 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#1F4E79] text-white rounded-xl hover:bg-[#1a4268] disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingSchool ? "Save Changes" : "Create School"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolManagement;
