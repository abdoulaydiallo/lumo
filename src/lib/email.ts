import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email envoyé à ${to}`);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    throw new Error("Échec de l'envoi de l'email");
  }
}