const GRADE_CONFIG = {
  "a+": "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
  a: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
  "b+": "bg-sky-50 text-sky-700 border-sky-200 ring-sky-600/20",
  b: "bg-sky-50 text-sky-700 border-sky-200 ring-sky-600/20",
  c: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
  d: "bg-orange-50 text-orange-700 border-orange-200 ring-orange-600/20",
  f: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20",
};

const SIZE_CONFIG = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3.5 py-1.5 text-sm font-extrabold",
};

const GradeBadge = ({ grade = "F", size = "md", className = "" }) => {
  const normalized = (grade || "F").toLowerCase().trim();
  const colorClass =
    GRADE_CONFIG[normalized] || "bg-slate-100 text-slate-700 border-slate-200";
  const sizeClass = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  return (
    <span
      className={`inline-flex items-center justify-center font-bold rounded-full border shadow-2xs ${colorClass} ${sizeClass} ${className}`}
    >
      {grade}
    </span>
  );
};

export default GradeBadge;
