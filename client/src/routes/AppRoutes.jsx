import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// ── Auth Pages ─────────────────────────────────────────────────────────────────
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import StudentSignupVerify from "../pages/auth/StudentSignupVerify";
import StudentSignupComplete from "../pages/auth/StudentSignupComplete";
import Unauthorized from "../pages/Unauthorized";

// ── Layout ─────────────────────────────────────────────────────────────────────
import DashboardLayout from "../components/layout/DashboardLayout";

// ── Dashboard Placeholders & Admin Dashboard ────────────────────────────────
import DashboardPlaceholder from "../pages/DashboardPlaceholder";
import AdminDashboard from "../pages/admin/AdminDashboard";
import StudentDashboard from "../pages/student/StudentDashboard";

// ── Admin: Classes ─────────────────────────────────────────────────────────────
import ClassList from "../pages/admin/Classes/ClassList";

// ── Admin: Teachers ────────────────────────────────────────────────────────────
import TeacherList from "../pages/admin/Teachers/TeacherList";
import TeacherAttendancePage from "../pages/admin/TeacherAttendance";
import TeacherSalaryPage from "../pages/admin/TeacherSalary";

// ── Admin: Students ────────────────────────────────────────────────────────────
import StudentList from "../pages/admin/Students/StudentList";
import StudentProfile from "../pages/admin/Students/StudentProfile";

// ── Admin: Schools & Settings ──────────────────────────────────────────────────
import SchoolManagement from "../pages/admin/SchoolManagement";
import SettingsPage from "../pages/admin/SettingsPage";

// ── Phase 3: Attendance Pages ─────────────────────────────────────────────────
import AttendanceReports from "../pages/admin/AttendanceReports";
import LeaveApprovals from "../pages/admin/LeaveApprovals";
import MarkAttendance from "../pages/teacher/MarkAttendance";
import MyAttendance from "../pages/student/MyAttendance";
import ChildAttendance from "../pages/parent/ChildAttendance";

// ── Phase 9A: Teacher Dashboard, Homework & Study Materials ─────────────────
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import TeacherHomework from "../pages/teacher/Homework";
import TeacherStudyMaterials from "../pages/teacher/StudyMaterials";
import StudentHomework from "../pages/student/Homework";
import StudentStudyMaterials from "../pages/student/StudyMaterials";
import ChildHomework from "../pages/parent/ChildHomework";

// ── Phase 9B: Syllabus, Gradebook & Quizzes ─────────────────────────────────
import Syllabus from "../pages/teacher/Syllabus";
import Gradebook from "../pages/teacher/Gradebook";
import QuizBuilder from "../pages/teacher/QuizBuilder";
import QuizResults from "../pages/teacher/QuizResults";
import StudentQuizzes from "../pages/student/Quizzes";
import TakeQuiz from "../pages/student/TakeQuiz";
import QuizResultView from "../pages/student/QuizResultView";
import StudentGradebook from "../pages/student/StudentGradebook";

// ── Phase 9C: PTM, Remarks, Substitutions, My Class, Communication ───────────
import MyClass from "../pages/teacher/MyClass";
import PTMAgenda from "../pages/teacher/PTMAgenda";
import Remarks from "../pages/teacher/Remarks";
import Substitutions from "../pages/teacher/Substitutions";
import CommunicationSettings from "../pages/teacher/CommunicationSettings";
import PTMBooking from "../pages/parent/PTMBooking";
import ChildRemarks from "../pages/parent/ChildRemarks";

// ── Phase 4: Fee & Finance Pages ──────────────────────────────────────────────
import FeeStructureSetup from "../pages/admin/Fees/FeeStructureSetup";
import DefaulterList from "../pages/admin/Fees/DefaulterList";
import PayFees from "../pages/parent/PayFees";
import FeeStatus from "../pages/student/FeeStatus";

// ── Phase 5: Exam & Results Pages ─────────────────────────────────────────────
import ExamSetup from "../pages/admin/Exams/ExamSetup";
import ResultsPublish from "../pages/admin/Exams/ResultsPublish";
import PerformanceAnalytics from "../pages/admin/Exams/PerformanceAnalytics";
import MarksEntry from "../pages/teacher/MarksEntry";
import MyResults from "../pages/student/MyResults";
import ChildResults from "../pages/parent/ChildResults";

// ── Phase 7A & 7B: Accountant & Finance Pages ───────────────────────────────
import AccountantDashboard from "../pages/accountant/AccountantDashboard";
import FeeCounter from "../pages/accountant/FeeCounter";
import ConcessionsPage from "../pages/accountant/Concessions";
import RefundsPage from "../pages/accountant/Refunds";
import FinanceSettingsPage from "../pages/accountant/FinanceSettings";
import ExpensesPage from "../pages/accountant/Expenses";
import VendorsPage from "../pages/accountant/Vendors";
import BudgetPage from "../pages/accountant/Budget";
import LedgerPage from "../pages/accountant/Ledger";
import DayClosePage from "../pages/accountant/DayClose";

// ── Phase 7C: Payroll & Payslips Pages ──────────────────────────────────────
import PayrollPage from "../pages/accountant/Payroll";
import SalaryStructures from "../pages/accountant/SalaryStructures";
import MyPayslips from "../pages/teacher/MyPayslips";

// ── Phase 7D: Reports, Reconciliation & Audit Logs ──────────────────────────
import ReportsPage from "../pages/accountant/Reports";
import ReconciliationPage from "../pages/accountant/Reconciliation";
import AuditLogPage from "../pages/accountant/AuditLog";
import MyActivityPage from "../pages/accountant/MyActivity";

// ── Phase 8A: Principal & Approvals & Calendar & Circulars ───────────────────
import PrincipalDashboard from "../pages/principal/PrincipalDashboard";
import ApprovalCenter from "../pages/principal/ApprovalCenter";
import CalendarPage from "../pages/principal/CalendarPage";
import Circulars from "../pages/principal/Circulars";
import CircularInbox from "../pages/shared/CircularInbox";

// ── Phase 8B: Academics, Welfare, Staff & Incidents ─────────────────────────
import Academics from "../pages/principal/Academics";
import StudentWelfare from "../pages/principal/StudentWelfare";
import StaffOverview from "../pages/principal/StaffOverview";
import Incidents from "../pages/principal/Incidents";

// ── Phase 8C: Admissions CRM & Monthly MIS Reports ──────────────────────────
import Admissions from "../pages/principal/Admissions";
import Reports from "../pages/principal/Reports";
import PublicEnquiryForm from "../pages/public/PublicEnquiryForm";

const AppRoutes = () => {
  return (
    <Routes>
      {/* ── Public Routes ────────────────────────────────────────────── */}
      <Route path="/login" element={<Login />} />
      <Route path="/enquire" element={<PublicEnquiryForm />} />
      <Route path="/student-signup" element={<StudentSignupVerify />} />
      <Route path="/student-signup/complete" element={<StudentSignupComplete />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ── Principal Routes ─────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["principal", "admin", "superadmin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/principal/dashboard" element={<PrincipalDashboard />} />
          <Route path="/principal/approvals" element={<ApprovalCenter />} />
          <Route path="/principal/calendar" element={<CalendarPage />} />
          <Route path="/principal/circulars" element={<Circulars />} />
          <Route path="/principal/academics" element={<Academics />} />
          <Route path="/principal/welfare" element={<StudentWelfare />} />
          <Route path="/principal/staff" element={<StaffOverview />} />
          <Route path="/principal/incidents" element={<Incidents />} />
          <Route path="/principal/admissions" element={<Admissions />} />
          <Route path="/principal/reports" element={<Reports />} />
        </Route>
      </Route>

      {/* ── Admin / Superadmin Routes ────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["admin", "superadmin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Classes */}
          <Route path="/admin/classes" element={<ClassList />} />

          {/* Teachers */}
          <Route path="/admin/teachers" element={<TeacherList />} />
          <Route path="/admin/teachers/attendance" element={<TeacherAttendancePage />} />
          <Route path="/admin/teachers/salary" element={<TeacherSalaryPage />} />

          {/* Students */}
          <Route path="/admin/students" element={<StudentList />} />
          <Route path="/admin/students/:id" element={<StudentProfile />} />

          {/* Attendance Reports & Approvals (Unified Approval Center) */}
          <Route path="/admin/attendance" element={<AttendanceReports />} />
          <Route path="/admin/leaves" element={<ApprovalCenter />} />
          <Route path="/admin/approvals" element={<ApprovalCenter />} />
          <Route path="/admin/calendar" element={<CalendarPage />} />
          <Route path="/admin/circulars" element={<Circulars />} />

          {/* Fees & Finance */}
          <Route path="/admin/fees" element={<FeeStructureSetup />} />
          <Route path="/admin/fees/defaulters" element={<DefaulterList />} />
          <Route path="/admin/finance" element={<FeeStructureSetup />} />

          {/* Exams & Results Management */}
          <Route path="/admin/exams" element={<ExamSetup />} />
          <Route path="/admin/exams/publish" element={<ResultsPublish />} />
          <Route path="/admin/exams/analytics" element={<PerformanceAnalytics />} />

          {/* Financial Reports & Institutional Audit Logs */}
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogPage />} />

          {/* Phase 8B: Academics, Welfare, Staff & Incidents */}
          <Route path="/admin/academics" element={<Academics />} />
          <Route path="/admin/welfare" element={<StudentWelfare />} />
          <Route path="/admin/staff" element={<StaffOverview />} />
          <Route path="/admin/incidents" element={<Incidents />} />

          {/* Phase 8C: Admissions CRM & Monthly MIS Reports */}
          <Route path="/admin/admissions" element={<Admissions />} />
          <Route path="/admin/mis-reports" element={<Reports />} />

          {/* Schools & Settings */}
          <Route path="/admin/schools" element={<SchoolManagement />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ── Shared Routes: Calendar & Circulars for all authenticated roles */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              "admin",
              "superadmin",
              "principal",
              "teacher",
              "student",
              "parent",
              "accountant",
            ]}
          />
        }
      >
        <Route element={<DashboardLayout />}>
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/circulars" element={<CircularInbox />} />
        </Route>
      </Route>

      {/* ── Teacher Routes ───────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          {/* Homework & Study Materials */}
          <Route path="/teacher/homework" element={<TeacherHomework />} />
          <Route path="/teacher/materials" element={<TeacherStudyMaterials />} />
          {/* Phase 9B: Syllabus, Gradebook & Quizzes */}
          <Route path="/teacher/syllabus" element={<Syllabus />} />
          <Route path="/teacher/gradebook" element={<Gradebook />} />
          <Route path="/teacher/quizzes" element={<QuizBuilder />} />
          <Route path="/teacher/quizzes/:id/results" element={<QuizResults />} />
          {/* Scoped student list */}
          <Route path="/teacher/students" element={<StudentList />} />
          {/* Classes */}
          <Route path="/teacher/classes" element={<ClassList />} />
          {/* Mark Attendance */}
          <Route path="/teacher/attendance" element={<MarkAttendance />} />
          {/* Teacher Marks Entry Grid */}
          <Route path="/teacher/marks" element={<MarksEntry />} />
          <Route path="/teacher/results" element={<MarksEntry />} />
          <Route path="/teacher/payslips" element={<MyPayslips />} />
          {/* Phase 8B: Academics, Welfare, Incidents */}
          <Route path="/teacher/academics" element={<Academics />} />
          <Route path="/teacher/welfare" element={<StudentWelfare />} />
          <Route path="/teacher/incidents" element={<Incidents />} />
          {/* Phase 9C: Teacher Class Tools, PTM, Remarks, Substitutions, Communication */}
          <Route path="/teacher/my-class" element={<MyClass />} />
          <Route path="/teacher/ptm" element={<PTMAgenda />} />
          <Route path="/teacher/remarks" element={<Remarks />} />
          <Route path="/teacher/substitutions" element={<Substitutions />} />
          <Route path="/teacher/communication" element={<CommunicationSettings />} />
        </Route>
      </Route>

      {/* ── Student Routes ───────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/attendance" element={<MyAttendance />} />
          <Route path="/student/homework" element={<StudentHomework />} />
          <Route path="/student/materials" element={<StudentStudyMaterials />} />
          {/* Phase 9B: Quizzes & Gradebook */}
          <Route path="/student/quizzes" element={<StudentQuizzes />} />
          <Route path="/student/quizzes/:id/take" element={<TakeQuiz />} />
          <Route path="/student/quizzes/:id/result" element={<QuizResultView />} />
          <Route path="/student/gradebook" element={<StudentGradebook />} />
          <Route path="/student/fees" element={<FeeStatus />} />
          <Route path="/student/results" element={<MyResults />} />
        </Route>
      </Route>

      {/* ── Parent Routes ────────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["parent"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/parent/dashboard" element={<DashboardPlaceholder role="Parent" />} />
          <Route path="/parent/children" element={<Navigate to="/parent/attendance" replace />} />
          <Route path="/parent/attendance" element={<ChildAttendance />} />
          <Route path="/parent/homework" element={<ChildHomework />} />
          <Route path="/parent/fees" element={<PayFees />} />
          <Route path="/parent/results" element={<ChildResults />} />
          {/* Phase 9C: Parent PTM Booking and Remarks */}
          <Route path="/parent/ptm" element={<PTMBooking />} />
          <Route path="/parent/remarks" element={<ChildRemarks />} />
        </Route>
      </Route>

      {/* ── Accountant Routes ────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["accountant"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/accountant/dashboard" element={<AccountantDashboard />} />
          <Route path="/accountant/fee-counter" element={<FeeCounter />} />
          <Route path="/accountant/expenses" element={<ExpensesPage />} />
          <Route path="/accountant/payroll" element={<PayrollPage />} />
          <Route path="/accountant/salary-structures" element={<SalaryStructures />} />
          <Route path="/accountant/vendors" element={<VendorsPage />} />
          <Route path="/accountant/budget" element={<BudgetPage />} />
          <Route path="/accountant/ledger" element={<LedgerPage />} />
          <Route path="/accountant/day-close" element={<DayClosePage />} />
          <Route path="/accountant/concessions" element={<ConcessionsPage />} />
          <Route path="/accountant/refunds" element={<RefundsPage />} />
          <Route path="/accountant/fees/defaulters" element={<DefaulterList />} />
          <Route path="/accountant/finance" element={<FeeStructureSetup />} />
          <Route path="/accountant/reports" element={<ReportsPage />} />
          <Route path="/accountant/reconciliation" element={<ReconciliationPage />} />
          <Route path="/accountant/my-activity" element={<MyActivityPage />} />
          <Route path="/accountant/settings" element={<FinanceSettingsPage />} />
        </Route>
      </Route>

      {/* ── Fallback ─────────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
