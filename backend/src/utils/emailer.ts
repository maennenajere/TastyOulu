import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.EMAIL_APP_PASS;

if (!gmailUser || !gmailPass) {
  throw new Error("Missing GMAIL_USER or EMAIL_APP_PASS in .env");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: gmailPass,
  },
});

const EMAIL_FOOTER = "\n\nSent by Oulu Restaurant Bot - Do not reply directly.";

interface EmailResponse {
  messageId: string;
}

export const sendEmail = async (
  recipientEmail: string,
  message: string,
  subject: string
): Promise<boolean> => {

  try {
    const info = (await transporter.sendMail({
      from: `"tasty oulu" <${gmailUser}>`, // Sender
      to: recipientEmail, // Recipient
      subject: subject, // Subject
      text: `${message}\n\n\n${EMAIL_FOOTER}`, // Plain text body
    })) as EmailResponse;

    console.log(`Sent an email! ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Email Error:", error);
    return false;
  }
};

transporter.verify((error: any) => {
  if (error) {
    console.error("Failed", error);
  } else {
    console.log("Ready to send emails");
  }
});