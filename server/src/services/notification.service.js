const { getIO } = require("../config/socket");
const User = require("../models/User.model");
const Notification = require("../models/Notification.model");
const sendEmail = require("../utils/sendEmail");

/**
 * emailTemplates map for system notifications
 */
const emailTemplates = {
  holiday_declared: ({ title, message, data = {}, userName = "Student/Staff" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Academic Notice</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">🌴 Holiday / Vacation Declared</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">${message || `A holiday has been announced: <strong>${title}</strong>.`}</p>
        ${
          data.startDate && data.endDate
            ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
            <p style="margin: 0; font-size: 14px; color: #475569;">
              <strong>Dates:</strong> ${new Date(data.startDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              ${data.startDate !== data.endDate ? ` to ${new Date(data.endDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}
            </p>
          </div>
        `
            : ""
        }
        <p style="font-size: 13px; color: #64748b; margin-top: 20px;">Regular school sessions and attendance will remain suspended during this period.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Automated notification from School ERP Academic Calendar.</p>
      </div>
    </div>
  `,

  event_published: ({ title, message, data = {}, userName = "Student/Staff" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">New Event</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">📅 ${title}</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">${message || `A new event has been scheduled on the school academic calendar.`}</p>
        ${
          data.startDate
            ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
            <p style="margin: 0; font-size: 14px; color: #475569;">
              <strong>Scheduled Date:</strong> ${new Date(data.startDate).toLocaleDateString("en-IN", { dateStyle: "full" })}
            </p>
            ${data.type ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;"><strong>Type:</strong> ${data.type.toUpperCase()}</p>` : ""}
          </div>
        `
            : ""
        }
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Automated notification from School ERP.</p>
      </div>
    </div>
  `,

  event_updated: ({ title, message, data = {}, userName = "Student/Staff" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Event Rescheduled</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">🕒 Schedule Update: ${title}</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">${message || `The timing or schedule for the event has been updated.`}</p>
        ${
          data.startDate
            ? `
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>New Timing:</strong> ${new Date(data.startDate).toLocaleDateString("en-IN", { dateStyle: "full" })}
            </p>
          </div>
        `
            : ""
        }
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Automated notification from School ERP.</p>
      </div>
    </div>
  `,

  event_cancelled: ({ title, message, data = {}, userName = "Student/Staff" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Cancellation</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">❌ Event Cancelled: ${title}</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">${message || `Please note that the event <strong>${title}</strong> has been cancelled.`}</p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Automated notification from School ERP.</p>
      </div>
    </div>
  `,

  circular_published: ({ title, message, data = {}, userName = "Student/Parent/Staff" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Official Circular</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">📢 ${title}</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">An official school circular has been published.</p>
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 18px 0; border-radius: 0 8px 8px 0;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b;">${title}</h3>
          <p style="margin: 0; font-size: 14px; color: #475569;">${message}</p>
        </div>
        ${
          data.requiresAcknowledgement
            ? `
          <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
            <p style="margin: 0; font-size: 13px; color: #c2410c; font-weight: bold;">
              ⚠️ Formal Acknowledgement Required
            </p>
            ${
              data.ackDeadline
                ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #9a3412;">Please review and acknowledge by: <strong>${new Date(
                    data.ackDeadline
                  ).toLocaleDateString("en-IN", { dateStyle: "medium" })}</strong></p>`
                : ""
            }
          </div>
        `
            : ""
        }
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Please login to your School ERP Portal to view complete details and attachments.</p>
      </div>
    </div>
  `,

  circular_reminder: ({ title, message, data = {}, userName = "Student/Parent/Staff" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Reminder</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">⏳ Acknowledgement Reminder: ${title}</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">This is a gentle reminder that your formal acknowledgement for the circular <strong>${title}</strong> is still pending.</p>
        ${
          data.ackDeadline
            ? `
          <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
            <p style="margin: 0; font-size: 13px; color: #9a3412;">
              <strong>Acknowledgement Deadline:</strong> ${new Date(data.ackDeadline).toLocaleDateString("en-IN", {
                dateStyle: "medium",
              })}
            </p>
          </div>
        `
            : ""
        }
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Please login to your School ERP Portal to acknowledge receipt.</p>
      </div>
    </div>
  `,

  approval_decided: ({ title, message, data = {}, userName = "User" }) => {
    const isApproved = data.decision === "approved" || data.status === "approved";
    const bgGrad = isApproved
      ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
      : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
    const statusText = isApproved ? "APPROVED" : "REJECTED";

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background: ${bgGrad}; padding: 24px; color: #ffffff;">
          <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Approval Decision</span>
          <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">${statusText}: ${title}</h1>
        </div>
        <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
          <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
          <p style="font-size: 15px; color: #334155;">${message || `Your request has been decided.`}</p>
          ${
            data.remarks
              ? `
            <div style="background: #f8fafc; border-left: 4px solid ${isApproved ? "#16a34a" : "#dc2626"}; padding: 12px 16px; margin: 16px 0;">
              <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Reviewer Remarks:</strong> ${data.remarks}</p>
            </div>
          `
              : ""
          }
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Automated notification from School ERP Approval Center.</p>
        </div>
      </div>
    `;
  },

  student_at_risk: ({ title, message, data, userName }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #e11d48, #be123c); padding: 24px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px;">⚠️ Student Welfare Alert</h2>
        <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">High-Risk Early Warning Flagged</p>
      </div>
      <div style="padding: 24px; color: #1e293b; background: #ffffff;">
        <p>Dear ${userName || "Educator"},</p>
        <p style="font-size: 15px; line-height: 1.6;">${message}</p>
        ${
          data?.studentName
            ? `<div style="background: #fff1f2; border-left: 4px solid #e11d48; padding: 12px; margin: 16px 0; border-radius: 4px;">
                <strong>Student:</strong> ${data.studentName} (${data.className || "Class"})<br/>
                <strong>Risk Score:</strong> ${data.score || "High"}/100
               </div>`
            : ""
        }
        <p style="font-size: 13px; color: #64748b;">Please review the student's welfare profile and consider initiating early interventions.</p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Confidential automated notice from School ERP Welfare System.</p>
      </div>
    </div>
  `,

  substitution_assigned: ({ title, message, data, userName }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 24px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px;">📋 Period Substitution Assigned</h2>
        <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Coverage Scheduled</p>
      </div>
      <div style="padding: 24px; color: #1e293b; background: #ffffff;">
        <p>Dear ${userName || "Teacher"},</p>
        <p style="font-size: 15px; line-height: 1.6;">${message}</p>
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 14px; margin: 16px 0; border-radius: 8px;">
          <p style="margin: 4px 0;"><strong>Date:</strong> ${data?.date || "Today"}</p>
          <p style="margin: 4px 0;"><strong>Period:</strong> ${data?.periodRef || "Scheduled period"}</p>
          <p style="margin: 4px 0;"><strong>Class:</strong> ${data?.className || "Assigned Section"}</p>
          <p style="margin: 4px 0;"><strong>Subject:</strong> ${data?.subject || "Subject"}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Automated notification from School ERP Staff Operations.</p>
      </div>
    </div>
  `,

  incident_parent_notified: ({ title, message, data, userName }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e293b, #334155); padding: 24px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px;">Official Communication from School</h2>
        <p style="margin: 4px 0 0 0; opacity: 0.85; font-size: 14px;">Student Care & Discipline Update</p>
      </div>
      <div style="padding: 24px; color: #1e293b; background: #ffffff;">
        <p>Dear Parent/Guardian,</p>
        <p style="font-size: 15px; line-height: 1.6;">${message}</p>
        <p style="font-size: 13px; color: #64748b; margin-top: 16px;">We prioritize open dialogue and mutual partnership in guiding student conduct and well-being. Please reach out to the school office if you would like to discuss this further.</p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Sent on behalf of School Administration.</p>
      </div>
    </div>
  `,

  inquiry_followup_due: ({ title, message, data = {}, userName = "Staff Member" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Admissions CRM</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">📞 ${title}</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">${message || "You have admission inquiries with follow-ups scheduled for today or overdue."}</p>
        ${
          data.dueCount
            ? `
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
            <p style="margin: 0; font-size: 14px; color: #0369a1;">
              <strong>Due / Overdue Count:</strong> ${data.dueCount} Inquiries
            </p>
          </div>
        `
            : ""
        }
        <p style="font-size: 13px; color: #64748b;">Please open the Admissions CRM to record conversation notes and schedule next actions.</p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Automated daily admissions notification from School ERP.</p>
      </div>
    </div>
  `,

  inquiry_assigned: ({ title, message, data = {}, userName = "Staff Member" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">New Lead Assigned</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">👤 ${title}</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">A new admission inquiry has been assigned to you for follow-up.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 14px;">
          <p style="margin: 0 0 6px 0;"><strong>Child:</strong> ${data.childName || "N/A"} (${data.applyingForClass || "N/A"})</p>
          <p style="margin: 0 0 6px 0;"><strong>Parent:</strong> ${data.parentName || "N/A"}</p>
          <p style="margin: 0;"><strong>Phone:</strong> ${data.phone || "N/A"}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">School ERP Admissions System.</p>
      </div>
    </div>
  `,

  inquiry_acknowledged: ({ title, message, data = {}, userName = "Parent" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Admissions Office</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">🎓 Thank You for Your Inquiry</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">Thank you for your interest in our institution. We have received your admission inquiry for <strong>${data.childName || "your child"}</strong> (Class: <strong>${data.applyingForClass || "N/A"}</strong>).</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 14px; color: #475569;">
          <p style="margin: 0;">Our admissions counselor will review the details and reach out to you shortly to schedule a campus tour or discuss next steps.</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">If you have any urgent queries, please reply to this email or call our front desk.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Warm regards,<br />Admissions Committee</p>
      </div>
    </div>
  `,

  monthly_report_ready: ({ title, message, data = {}, userName = "Principal" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Executive MIS Report</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">📊 ${title}</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">${message || "The monthly institutional MIS report has been compiled and is now ready for review."}</p>
        ${
          data.month && data.year
            ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
            <p style="margin: 0; font-size: 14px; color: #1e293b;">
              <strong>Reporting Period:</strong> Month ${data.month}, ${data.year}
            </p>
          </div>
        `
            : ""
        }
        <p style="font-size: 13px; color: #64748b;">The report includes enrollment, attendance, financial aggregates from the ledger, staff substitution metrics, and rule-based key institutional concerns.</p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">School ERP Executive Reporting Engine.</p>
      </div>
    </div>
  `,

  principal_morning_brief: ({ title, message, data = {}, userName = "Principal" }) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #312e81 0%, #4338ca 100%); padding: 24px; color: #ffffff;">
        <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px;">Daily Morning Brief</span>
        <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: bold; color: #ffffff;">☀️ Good Morning, Principal</h1>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${userName}</strong>,</p>
        <div style="background: #eef2ff; border-left: 4px solid #4f46e5; border-radius: 4px; padding: 14px 18px; margin: 18px 0; font-size: 14px; color: #1e1b4b; white-space: pre-line;">
${message}
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Generated at 7:30 AM via School ERP AI Engine.</p>
      </div>
    </div>
  `,
};

/**
 * notify — send real-time socket notification, persist to DB, and optional email to a single user.
 */
const notify = async (
  userId,
  { type = "general", title = "Notification", message = "", data = {}, sendEmailFlag = false, schoolId = null } = {}
) => {
  try {
    if (!userId) return;

    // 1. Persist notification in database
    await Notification.create({
      userId,
      schoolId: schoolId || data.schoolId || null,
      type,
      title,
      message,
      data,
    }).catch((err) => console.warn("[notification.service] DB save failed:", err.message));

    // 2. Emit real-time Socket.io event
    const io = getIO();
    if (io) {
      const room = `user:${userId.toString()}`;
      io.to(room).emit("notification", {
        type,
        title,
        message,
        data,
        createdAt: new Date(),
      });
    }

    // 3. Send email if requested
    if (sendEmailFlag) {
      const user = await User.findById(userId).select("name email").lean();
      if (user?.email) {
        const templateFn = emailTemplates[type];
        const html = templateFn
          ? templateFn({ title, message, data, userName: user.name })
          : `
            <div style="font-family: Arial, sans-serif; padding: 16px; color: #1e293b;">
              <h2 style="color: #4f46e5; margin-bottom: 8px;">${title}</h2>
              <p style="font-size: 15px; line-height: 1.5;">${message}</p>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Automated notification from School ERP.</p>
            </div>
          `;

        await sendEmail({
          to: user.email,
          subject: `[School ERP] ${title}`,
          html,
        }).catch((err) => console.warn("[notification.service] Email delivery failed:", err.message));
      }
    }
  } catch (err) {
    console.warn("[notification.service] notify error:", err.message);
  }
};

/**
 * notifyMany — notify multiple users matching an array of IDs or a MongoDB query.
 */
const notifyMany = async (target, payload = {}) => {
  try {
    let userIds = [];
    if (Array.isArray(target)) {
      userIds = target;
    } else if (typeof target === "object" && target !== null) {
      const users = await User.find(target).select("_id email").lean();
      userIds = users.map((u) => u._id);
    }

    await Promise.allSettled(userIds.map((uid) => notify(uid, payload)));
  } catch (err) {
    console.warn("[notification.service] notifyMany error:", err.message);
  }
};

module.exports = {
  emailTemplates,
  notify,
  notifyMany,
};
