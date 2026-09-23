const { generateText } = require("../config/geminiClient");

/**
 * Generates an encouraging, personalized 1-2 sentence report card remark for a student.
 * Uses Google Gemini API with graceful fallback if API unavailable.
 *
 * @param {string} studentName
 * @param {number} percentage
 * @param {string} grade
 * @param {Array<string>} weakSubjects
 * @returns {Promise<string>}
 */
const generateRemark = async (studentName, percentage, grade, weakSubjects = []) => {
  const getFallbackRemark = () => {
    const weakList = weakSubjects.length > 0 ? weakSubjects.join(", ") : null;

    if (percentage >= 85) {
      return `${studentName} has demonstrated outstanding academic excellence this term with exemplary commitment. Keep up the brilliant effort!`;
    } else if (percentage >= 70) {
      return weakList
        ? `${studentName} has shown solid academic progress overall, but should dedicate additional practice to ${weakList} to achieve higher distinction.`
        : `${studentName} has shown consistent diligence and commendable understanding across all subjects this semester.`;
    } else if (percentage >= 50) {
      return weakList
        ? `${studentName} possesses good potential; focused revision in ${weakList} and regular homework submission will significantly improve performance.`
        : `${studentName} has maintained satisfactory progress, with potential to reach higher grades through disciplined self-study.`;
    } else {
      return weakList
        ? `${studentName} needs immediate remedial attention and closer guidance in ${weakList} to improve academic foundations.`
        : `${studentName} must maintain greater focus and consistent classroom participation to overcome learning gaps.`;
    }
  };

  if (!process.env.GEMINI_API_KEY) {
    return getFallbackRemark();
  }

  try {
    const weakText =
      weakSubjects.length > 0
        ? `Subjects needing improvement: ${weakSubjects.join(", ")}.`
        : "No failing subjects.";

    const prompt = `You are a warm, constructive school teacher writing a concise report card remark for a student.
Student Name: ${studentName}
Percentage: ${percentage}%
Grade: ${grade}
${weakText}

Write a professional, encouraging, personalized 1-2 sentence teacher remark for this student's official report card. Do not include quotes or prefixes like "Remark:". Just the remark.`;

    const remarkText = await generateText(prompt);
    return remarkText || getFallbackRemark();
  } catch (error) {
    console.warn("⚠️ Gemini remark generation failed, using fallback:", error.message);
    return getFallbackRemark();
  }
};

module.exports = { generateRemark };
