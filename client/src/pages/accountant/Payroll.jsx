import { useState } from "react";
import PayrollRuns from "./PayrollRuns";
import SalaryStructures from "./SalaryStructures";
import { CreditCard, Wallet } from "lucide-react";

const PayrollPage = () => {
  const [activeTab, setActiveTab] = useState("runs"); // "runs" | "structures"

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 pt-2 rounded-t-2xl">
        <button
          onClick={() => setActiveTab("runs")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "runs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payroll Runs & Disbursals
        </button>
        <button
          onClick={() => setActiveTab("structures")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "structures"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Salary Structures & Rules
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "runs" ? <PayrollRuns /> : <SalaryStructures />}
    </div>
  );
};

export default PayrollPage;
