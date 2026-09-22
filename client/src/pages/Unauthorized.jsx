import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";

const Unauthorized = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-5xl font-black text-slate-800 mb-2">403</h1>
        <h2 className="text-xl font-bold text-slate-700 mb-3">Access Denied</h2>
        <p className="text-slate-500 mb-8">
          You don't have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1F4E79] text-white rounded-xl font-semibold text-sm hover:bg-[#163d60] transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
