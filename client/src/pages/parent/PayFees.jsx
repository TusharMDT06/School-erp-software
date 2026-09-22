import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Download,
  AlertCircle,
  Users,
  Loader2,
  FileText,
  Clock,
} from "lucide-react";
import { getStudentsApi } from "../../api/studentApi";
import {
  fetchStudentFeeTransactions,
  updateTransactionStatusLocally,
} from "../../features/fee/feeSlice";
import RazorpayCheckoutButton from "../../components/fee/RazorpayCheckoutButton";

const PayFees = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { studentFees, loading } = useSelector((state) => state.fee);

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Load parent's children
  useEffect(() => {
    const loadChildren = async () => {
      try {
        setLoadingChildren(true);
        const res = await getStudentsApi({ limit: 50 });
        const list = res.data?.data || res.data || [];
        const myChildren = list.filter((st) =>
          st.guardianIds?.some((g) => (g._id || g) === user?.id)
        );
        const targetList = myChildren.length > 0 ? myChildren : list.slice(0, 3);
        setChildren(targetList);

        if (targetList.length > 0) {
          setSelectedChildId(targetList[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load children profile.");
      } finally {
        setLoadingChildren(false);
      }
    };

    if (user?.id) {
      loadChildren();
    }
  }, [user]);

  // Fetch fees when child changes
  useEffect(() => {
    if (selectedChildId) {
      dispatch(fetchStudentFeeTransactions(selectedChildId));
    }
  }, [selectedChildId, dispatch]);

  const handlePaymentSuccess = (data) => {
    if (data?.transaction) {
      dispatch(
        updateTransactionStatusLocally({
          transactionId: data.transaction._id,
          status: data.transaction.status,
          amountPaid: data.transaction.amountPaid,
          receiptUrl: data.receiptUrl,
        })
      );
      dispatch(fetchStudentFeeTransactions(selectedChildId));
    }
  };

  const selectedChild = children.find((c) => c._id === selectedChildId);
  const transactions = studentFees?.transactions || [];
  const summary = studentFees?.summary || { totalDue: 0, totalPaid: 0, pendingAmount: 0 };

  return (
    <div className="space-y-6">
      {/* Header & Child Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Online Fee Payment & Invoices</h2>
          <p className="text-xs text-slate-500 mt-1">
            Securely pay school tuition & term fees online via UPI, NetBanking, and Cards.
          </p>
        </div>

        {children.length > 1 && (
          <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-2xs self-start sm:self-auto">
            <Users className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="px-2 py-1 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {children.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.userId?.name || "Child"} (Class {c.classId?.className}-{c.classId?.section})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loadingChildren || loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-[#1F4E79]" />
          <p className="text-sm text-slate-500">Loading fee records...</p>
        </div>
      ) : children.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <p className="text-sm font-semibold text-slate-700">No student profile linked.</p>
        </div>
      ) : (
        <>
          {/* Summary Balance Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#1F4E79] to-[#2563a8] text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
              <span className="text-xs text-white/80 font-medium">Pending Balance Due</span>
              <p className="text-3xl font-extrabold mt-2">
                ₹{summary.pendingAmount?.toLocaleString("en-IN")}
              </p>
              <span className="text-[11px] text-white/70 mt-2">
                Child: <strong>{selectedChild?.userId?.name || "Student"}</strong>
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Total Paid to Date</span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">
                ₹{summary.totalPaid?.toLocaleString("en-IN")}
              </p>
              <span className="text-[11px] text-slate-400 mt-2">Settled transactions</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Total Billed Fees</span>
              <p className="text-2xl font-extrabold text-slate-800 mt-2">
                ₹{summary.totalDue?.toLocaleString("en-IN")}
              </p>
              <span className="text-[11px] text-slate-400 mt-2">
                Academic Year {selectedChild?.classId?.academicYear || "2026-27"}
              </span>
            </div>
          </div>

          {/* Transactions Cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Fee Invoices & Receipts</h3>

            {transactions.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs">
                No fee invoices generated for this student yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transactions.map((tx) => {
                  const feeStructure = tx.feeStructureId || {};
                  const isPaid = tx.status === "paid";
                  const balance = Math.max(0, tx.amountDue - tx.amountPaid);
                  const isOverdue =
                    !isPaid && feeStructure.dueDate && new Date(feeStructure.dueDate) < new Date();

                  return (
                    <div
                      key={tx._id}
                      className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition ${
                        isPaid ? "border-emerald-200/70" : isOverdue ? "border-rose-200" : "border-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            {feeStructure.term || "Fee"} Invoice
                          </span>
                          <p className="text-xs text-slate-400">
                            Year: {feeStructure.academicYear || "2026-27"}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isOverdue
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isPaid ? "PAID" : isOverdue ? "OVERDUE" : tx.status}
                        </span>
                      </div>

                      {/* Fee Heads */}
                      <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                        {feeStructure.feeHeads?.map((h, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600">
                            <span>{h.name}</span>
                            <span className="font-semibold text-slate-800">₹{h.amount}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Due: {feeStructure.dueDate ? new Date(feeStructure.dueDate).toLocaleDateString("en-IN") : "-"}
                        </span>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Total: ₹{tx.amountDue?.toLocaleString("en-IN")}</p>
                          <p className={`font-extrabold text-sm ${isPaid ? "text-emerald-700" : "text-[#1F4E79]"}`}>
                            {isPaid ? "Settled" : `Payable: ₹${balance.toLocaleString("en-IN")}`}
                          </p>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        {isPaid ? (
                          <a
                            href={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/fees/receipt/${tx._id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Receipt PDF
                          </a>
                        ) : (
                          <RazorpayCheckoutButton
                            transaction={tx}
                            onSuccess={handlePaymentSuccess}
                            buttonText="Pay with Razorpay"
                          />
                        )}

                        {tx.receiptNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {tx.receiptNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PayFees;
