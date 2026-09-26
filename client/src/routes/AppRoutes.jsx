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

const AppRoutes = () => {
  return (
    <Routes>
      {/* ── Public Routes ────────────────────────────────────────────── */}
      <Route path="/login" element={<Login />} />
      <Route path="/student-signup" element={<StudentSignupVerify />} />
      <Route path="/student-signup/complete" element={<StudentSignupComplete />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ── Admin / Superadmin Routes ────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["admin", "superadmin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Classes */}
          <Route path="/admin/classes" element={<ClassList />} />

          {/* Teachers */}
          <Route path="/admin/teachers" element={<TeacherList />} />

          {/* Students */}
          <Route path="/admin/students" element={<StudentList />} />
          <Route path="/admin/students/:id" element={<StudentProfile />} />

          {/* Attendance Reports & Leave Approvals */}
          <Route path="/admin/attendance" element={<AttendanceReports />} />
          <Route path="/admin/leaves" element={<LeaveApprovals />} />

          {/* Fees & Finance */}
          <Route path="/admin/fees" element={<FeeStructureSetup />} />
          <Route path="/admin/fees/defaulters" element={<DefaulterList />} />
          <Route path="/admin/finance" element={<FeeStructureSetup />} />

          {/* Exams & Results Management */}
          <Route path="/admin/exams" element={<ExamSetup />} />
          <Route path="/admin/exams/publish" element={<ResultsPublish />} />
          <Route path="/admin/exams/analytics" element={<PerformanceAnalytics />} />

          {/* Schools & Settings */}
          <Route path="/admin/schools" element={<SchoolManagement />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ── Teacher Routes ───────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/teacher/dashboard" element={<DashboardPlaceholder role="Teacher" />} />
          {/* Scoped student list */}
          <Route path="/teacher/students" element={<StudentList />} />
          {/* Classes */}
          <Route path="/teacher/classes" element={<ClassList />} />
          {/* Mark Attendance */}
          <Route path="/teacher/attendance" element={<MarkAttendance />} />
          {/* Teacher Marks Entry Grid */}
          <Route path="/teacher/marks" element={<MarksEntry />} />
          <Route path="/teacher/results" element={<MarksEntry />} />
        </Route>
      </Route>

      {/* ── Student Routes ───────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/attendance" element={<MyAttendance />} />
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
          <Route path="/parent/fees" element={<PayFees />} />
          <Route path="/parent/results" element={<ChildResults />} />
        </Route>
      </Route>

      {/* ── Accountant Routes ────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["accountant"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/accountant/dashboard" element={<DashboardPlaceholder role="Accountant" />} />
          <Route path="/accountant/finance" element={<FeeStructureSetup />} />
          <Route path="/accountant/fees/defaulters" element={<DefaulterList />} />
        </Route>
      </Route>

      {/* ── Fallback ─────────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
