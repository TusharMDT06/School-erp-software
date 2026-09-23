const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Generates an encouraging, personalized 1-2 sentence report card remark for a student.
 * Uses Google Gemini API with graceful fallback to template-based remark if API key is not configured or network fails.
 *
 * @param {string} studentName - Student's name
 * @param {number} percentage - Overall percentage
 * @param {string} grade - Letter grade (e.g. 'A+', 'B', 'F')
 * @param {Array<string>} weakSubjects - List of subjects where student scored low or failed
 * @returns {Promise<string>} - 1-2 sentence remark
 */
const generateRemark = async (studentName, percentage, grade, weakSubjects = []) => {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback generator helper
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

  if (!apiKey) {
    return getFallbackRemark();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const remarkText = response.text()?.trim();
    if (remarkText) {
      return remarkText;
    }
    return getFallbackRemark();
  } catch (error) {
    console.warn("⚠️ Gemini AI remark generation failed, using template fallback:", error.message);
    return getFallbackRemark();
  }
};

module.exports = {
  generateRemark,
};
