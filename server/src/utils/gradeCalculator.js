/**
 * Calculates letter grade based on overall percentage.
 *
 * @param {number} percentage - Percentage score (0 - 100)
 * @returns {string} - Grade ('A+', 'A', 'B+', 'B', 'C', 'D', 'F')
 */
const calculateGrade = (percentage) => {
  const pct = Number(percentage) || 0;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "F";
};

/**
 * Checks whether the student has passed every subject according to each subject's passing marks.
 * Returns false if ANY subject's marks are below its passingMarks.
 *
 * @param {Array<{subjectName: string, marks: number}>} marksObtained
 * @param {Array<{subjectName: string, maxMarks: number, passingMarks: number}>} examSubjects
 * @returns {boolean} - true if passed all subjects, false otherwise
 */
const isPassing = (marksObtained = [], examSubjects = []) => {
  const subjectsMap = new Map();
  examSubjects.forEach((sub) => {
    subjectsMap.set(sub.subjectName.toLowerCase().trim(), sub.passingMarks || 0);
  });

  for (const entry of marksObtained) {
    const key = (entry.subjectName || "").toLowerCase().trim();
    const passingMarks = subjectsMap.get(key) ?? 35;
    const score = Number(entry.marks) || 0;
    if (score < passingMarks) {
      return false;
    }
  }

  return true;
};

module.exports = {
  calculateGrade,
  isPassing,
};
