import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { getMyStudentProfileApi } from "../../api/studentApi";
import { fetchStudentFeeTransactions } from "../../features/fee/feeSlice";

const FeeStatus = () => {
  const dispatch = useDispatch();
  const { studentFees, loading } = useSelector((state) => state.fee);

  const [student, setStudent] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    const loadProfileAndFees = async () => {
      try {
        setLoadingProfile(true);
        setProfileError(null);
        // Use /students/me — accessible by student role (no 403)
        const res = await getMyStudentProfileApi();
        const studentData = res.data;
        if (studentData) {
          setStudent(studentData);
          dispatch(fetchStudentFeeTransactions(studentData._id));
        } else {
          setProfileError("No student profile linked to your account.");
        }
      } catch (err) {
        const msg =
          err.response?.data?.message || "Failed to load student fee profile.";
        setProfileError(msg);
        toast.error(msg);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfileAndFees();
  }, [dispatch]);

  const transactions = studentFees?.transactions || [];
  const summary = studentFees?.summary || { totalDue: 0, totalPaid: 0, pendingAmount: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">My Fee Invoices & History</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review your enrolled fee structures, payment status, and download official receipts.
        </p>
      </div>

      {loadingProfile || loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-[#1F4E79]" />
          <p className="text-sm text-slate-500">Loading fee records...</p>
        </div>
      ) : profileError ? (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-12 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
          <p className="text-sm text-rose-600 font-medium">{profileError}</p>
          <p className="text-xs text-slate-400 mt-1">
            Contact your school administrator to link your student profile.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Total Billed Fees</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">
                  ₹{summary.totalDue?.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                ₹
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Total Paid</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  ₹{summary.totalPaid?.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Pending Balance</p>
                <p className={`text-2xl font-extrabold mt-1 ${summary.pendingAmount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                  ₹{summary.pendingAmount?.toLocaleString("en-IN")}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${summary.pendingAmount > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Fee Invoices & Receipts</h3>
            </div>

            {transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No fee records assigned to your account yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Term</th>
                      <th className="py-3.5 px-4">Academic Year</th>
                      <th className="py-3.5 px-4 text-right">Amount Due</th>
                      <th className="py-3.5 px-4 text-right">Amount Paid</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Paid Date</th>
                      <th className="py-3.5 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => {
                      const isPaid = tx.status === "paid";
                      const isPartial = tx.status === "partial";
                      const feeStructure = tx.feeStructureId || {};

                      return (
                        <tr key={tx._id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-800 uppercase text-xs">
                            {feeStructure.term || "General"}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs font-medium">
                            {feeStructure.academicYear || "2026-27"}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            ₹{tx.amountDue?.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            ₹{tx.amountPaid?.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isPartial
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : tx.status === "overdue"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-slate-500">
                            {tx.paidOn ? new Date(tx.paidOn).toLocaleDateString("en-IN") : "-"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isPaid || isPartial ? (
                              <a
                                href={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/fees/receipt/${tx._id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1F4E79]/10 hover:bg-[#1F4E79] hover:text-white text-[#1F4E79] text-xs font-semibold rounded-xl transition shadow-2xs"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Receipt PDF
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FeeStatus;
