const Anthropic = require("@anthropic-ai/sdk");

/**
 * Generates an encouraging, personalized 1-2 sentence report card remark for a student.
 * Uses Anthropic API with graceful fallback to template-based remark if API key is not configured or network fails.
 *
 * @param {string} studentName - Student's name
 * @param {number} percentage - Overall percentage
 * @param {string} grade - Letter grade (e.g. 'A+', 'B', 'F')
 * @param {Array<string>} weakSubjects - List of subjects where student scored low or failed
 * @returns {Promise<string>} - 1-2 sentence remark
 */
const generateRemark = async (studentName, percentage, grade, weakSubjects = []) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

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
    const anthropic = new Anthropic({ apiKey });
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

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const remarkText = message.content?.[0]?.text?.trim();
    if (remarkText) {
      return remarkText;
    }
    return getFallbackRemark();
  } catch (error) {
    console.warn("⚠️ Anthropic AI remark generation failed, using template fallback:", error.message);
    return getFallbackRemark();
  }
};

module.exports = {
  generateRemark,
};
