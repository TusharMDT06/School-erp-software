import { useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  User,
  School,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Send,
} from "lucide-react";
import { submitPublicInquiryApi } from "../../api/inquiryApi";
import toast from "react-hot-toast";

const CLASSES = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11 - Science",
  "Class 11 - Commerce",
  "Class 11 - Arts",
  "Class 12 - Science",
  "Class 12 - Commerce",
  "Class 12 - Arts",
];

export default function PublicEnquiryForm() {
  const [formData, setFormData] = useState({
    childName: "",
    dob: "",
    applyingForClass: "Class 1",
    parentName: "",
    phone: "",
    email: "",
    source: "website",
    referredBy: "",
    notes: "",
    website_hp: "", // Honeypot field (hidden from legitimate users)
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.childName.trim()) {
      toast.error("Please enter the child's full name.");
      return;
    }
    if (!formData.parentName.trim()) {
      toast.error("Please enter the parent or guardian's name.");
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      toast.error("Please provide a valid 10-digit contact number.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitPublicInquiryApi(formData);
      setRefNumber(res.data?.data?.referenceNumber || "ENQ-ADM");
      setSubmitted(true);
      toast.success("Inquiry submitted successfully!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit inquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Inquiry Received!</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Thank you for considering our institution for your child&apos;s education. Our admissions team has
              received your application inquiry.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Reference Code:</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                #{refNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Child:</span>
              <span className="font-semibold text-slate-700">{formData.childName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Applying Class:</span>
              <span className="font-semibold text-slate-700">{formData.applyingForClass}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Contact Phone:</span>
              <span className="font-semibold text-slate-700">{formData.phone}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-800 text-left flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>Our admissions counselor will contact you within 1 business day to schedule a campus tour.</span>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  childName: "",
                  dob: "",
                  applyingForClass: "Class 1",
                  parentName: "",
                  phone: "",
                  email: "",
                  source: "website",
                  referredBy: "",
                  notes: "",
                  website_hp: "",
                });
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Submit Another Inquiry
            </button>
            <Link
              to="/login"
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center justify-center gap-1"
            >
              Back to Portal Login <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/50 py-8 px-4 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-100 text-xs font-semibold shadow-2xs">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            Admissions Open — Academic Year 2026–2027
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admission Inquiry Form</h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Take the first step toward a bright future. Fill out this brief form and our counseling team will get in touch.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot field — visually hidden from real users */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website_hp">Website (leave empty)</label>
              <input
                id="website_hp"
                type="text"
                name="website_hp"
                value={formData.website_hp}
                onChange={handleChange}
                tabIndex="-1"
                autoComplete="off"
              />
            </div>

            <div className="border-b border-slate-100 pb-3 mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Child Information</h3>
            </div>

            {/* Child Name & DOB */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Child&apos;s Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="childName"
                    value={formData.childName}
                    onChange={handleChange}
                    placeholder="e.g. Aryan Sharma"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Applying Class */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Applying for Class / Grade <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  name="applyingForClass"
                  value={formData.applyingForClass}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all text-slate-800"
                >
                  {CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-b border-slate-100 pb-3 pt-2 mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parent / Guardian Contact</h3>
            </div>

            {/* Parent Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parent / Guardian Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleChange}
                  placeholder="e.g. Rajesh Sharma"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile / WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Source & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">How did you hear about us?</label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all text-slate-800"
                >
                  <option value="website">School Website</option>
                  <option value="social_media">Social Media (Facebook / Instagram)</option>
                  <option value="referral">Word of Mouth / Referral</option>
                  <option value="walk_in">Campus Walk-in</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Referred By (Optional)</label>
                <input
                  type="text"
                  name="referredBy"
                  value={formData.referredBy}
                  onChange={handleChange}
                  placeholder="e.g. Existing parent name"
                  className="w-full px-3 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Any Specific Queries or Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Mention any questions regarding curriculum, bus transport, or sports..."
                className="w-full px-3 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
              />
            </div>

            {/* Privacy note */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Your contact information is strictly confidential and used only for admissions communication.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting inquiry...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Admission Inquiry
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <Link to="/login" className="text-xs text-indigo-600 font-semibold hover:underline">
              Already registered? Login to School ERP Portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
