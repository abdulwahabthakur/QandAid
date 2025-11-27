import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMSAlert = async (
  doctorPhone: string,
  patientName: string,
  priority: string
): Promise<void> => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('⚠️ Twilio not configured, skipping SMS');
      return;
    }

    const message = `🔴 HIGH PRIORITY ALERT: Patient ${patientName} has concerning symptoms requiring immediate attention. Please check your email for the full medical report.`;

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: doctorPhone,
    });

    console.log(`✅ SMS alert sent to ${doctorPhone}`);
  } catch (error) {
    console.error('SMS send error:', error);
  }
};