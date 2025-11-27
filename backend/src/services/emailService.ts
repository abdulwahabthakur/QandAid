import nodemailer from 'nodemailer';
import { MedicalReport, UserProfile } from '../types';

const createTransporter = () => {
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey', // This is literally the string 'apikey'
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }
  
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  return null;
};

const transporter = createTransporter();

export const isEmailConfigured = (): boolean => {
  return transporter !== null;
};

export const sendEmailReport = async (
  report: MedicalReport,
  symptoms: any[],
  userProfile: Partial<UserProfile>
): Promise<void> => {
  if (!transporter) {
    console.log('⚠️ Email not configured. Skipping email send.');
    throw new Error('Email service not configured. Please set up SENDGRID_API_KEY or Gmail SMTP credentials.');
  }

  try {
    const symptomsList = symptoms.map(s => 
      `• ${s.description} (${s.severity || 'unknown severity'}) - ${new Date(s.created_at).toLocaleDateString()}`
    ).join('\n');

    const priorityEmoji = {
      high: '🔴',
      moderate: '🟡',
      low: '🟢',
    }[report.priority] || '⚪';

    const priorityColor = {
      high: '#dc2626',
      moderate: '#f59e0b',
      low: '#22c55e',
    }[report.priority] || '#6b7280';

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@qandaid.com';

    const mailOptions = {
      from: `"Q&Aid Health Tracker" <${fromEmail}>`,
      to: report.doctor_email,
      subject: `${priorityEmoji} ${report.priority.toUpperCase()} PRIORITY - Patient Report: ${userProfile.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
            .priority-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; color: white; background: ${priorityColor}; }
            .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
            .section h3 { margin: 0 0 10px 0; color: #374151; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .info-item { padding: 8px 0; }
            .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            .info-value { font-weight: 500; color: #111827; }
            .symptoms-list { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0 0 10px 0;">🏥 Patient Medical Report</h1>
              <span class="priority-badge">${priorityEmoji} ${report.priority.toUpperCase()} PRIORITY</span>
            </div>
            
            <div class="content">
              <div class="section">
                <h3>👤 Patient Information</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Name</div>
                    <div class="info-value">${userProfile.name || 'Not provided'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Age</div>
                    <div class="info-value">${userProfile.age || 'Not provided'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Blood Type</div>
                    <div class="info-value">${userProfile.blood_type || 'Not provided'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Smoking Status</div>
                    <div class="info-value">${userProfile.smoker || 'Not provided'}</div>
                  </div>
                </div>
              </div>

              <div class="section">
                <h3>📋 Medical Background</h3>
                <div class="info-item">
                  <div class="info-label">Known Conditions</div>
                  <div class="info-value">${userProfile.diagnoses || 'None reported'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Current Medications</div>
                  <div class="info-value">${userProfile.medications || 'None reported'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Allergies</div>
                  <div class="info-value">${userProfile.allergies || 'None reported'}</div>
                </div>
              </div>
              
              <div class="section">
                <h3>📝 Summary</h3>
                <p>${report.summary}</p>
              </div>
              
              <div class="symptoms-list">
                <h3>⚠️ Recent Symptoms</h3>
                <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${symptomsList}</pre>
              </div>

              ${report.detailed_report ? `
              <div class="section">
                <h3>📊 Detailed Analysis</h3>
                <div style="white-space: pre-wrap;">${report.detailed_report}</div>
              </div>
              ` : ''}
              
              <div class="footer">
                <p>📅 Report Generated: ${new Date(report.created_at || Date.now()).toLocaleString()}</p>
                <p>This report was automatically generated by <strong>Q&Aid</strong> based on patient-reported symptoms. 
                It is intended to assist healthcare providers and should be used in conjunction with professional medical judgment.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
PATIENT MEDICAL REPORT
Priority: ${report.priority.toUpperCase()}
Generated: ${new Date(report.created_at || Date.now()).toLocaleString()}

PATIENT INFORMATION
Name: ${userProfile.name || 'Not provided'}
Age: ${userProfile.age || 'Not provided'}
Blood Type: ${userProfile.blood_type || 'Not provided'}
Smoking Status: ${userProfile.smoker || 'Not provided'}
Known Conditions: ${userProfile.diagnoses || 'None reported'}
Current Medications: ${userProfile.medications || 'None reported'}
Allergies: ${userProfile.allergies || 'None reported'}

SUMMARY
${report.summary}

RECENT SYMPTOMS
${symptomsList}

${report.detailed_report ? `DETAILED ANALYSIS\n${report.detailed_report}` : ''}

---
This report was automatically generated by Q&Aid based on patient-reported symptoms.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Report email sent to ${report.doctor_email}`);
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email report');
  }
};
