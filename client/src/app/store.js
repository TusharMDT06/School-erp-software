import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import classReducer from "../features/class/classSlice";
import teacherReducer from "../features/teacher/teacherSlice";
import studentReducer from "../features/student/studentSlice";
import attendanceReducer from "../features/attendance/attendanceSlice";
import feeReducer from "../features/fee/feeSlice";
import examReducer from "../features/exam/examSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    class: classReducer,
    teacher: teacherReducer,
    student: studentReducer,
    attendance: attendanceReducer,
    fee: feeReducer,
    exam: examReducer,
  },
});
