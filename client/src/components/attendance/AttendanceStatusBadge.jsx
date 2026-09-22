const STATUS_CONFIG = {
  present: {
    label: "Present",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
    dotClass: "bg-emerald-500",
  },
  absent: {
    label: "Absent",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20",
    dotClass: "bg-rose-500",
  },
  late: {
    label: "Late",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
    dotClass: "bg-amber-500",
  },
  leave: {
    label: "Leave",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 ring-sky-600/20",
    dotClass: "bg-sky-500",
  },
};

const SIZE_CONFIG = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

const AttendanceStatusBadge = ({ status, size = "md", showDot = true, customLabel = null }) => {
  const normalizedStatus = (status || "").toLowerCase();
  const config = STATUS_CONFIG[normalizedStatus] || {
    label: status || "Unknown",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  };

  const sizeClass = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs transition-colors ${config.badgeClass} ${sizeClass}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} aria-hidden="true" />
      )}
      {customLabel || config.label}
    </span>
  );
};

export default AttendanceStatusBadge;
