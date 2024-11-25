const nodemailer = require("nodemailer");

//Transporter Config
let smtpConfig = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "levandumped@gmail.com",
    pass: process.env.GMAIL_PASSKEY,
  },
};
exports.transporter = nodemailer.createTransport(smtpConfig);

exports.sendEmailWithRetry = async (
  mailOptions,
  maxAttempts = 3,
  delay = 2000,
  transporter = exports.transporter
) => {
  let attempts = 0;
  let mailSent = false;

  while (attempts < maxAttempts && !mailSent) {
    attempts++;

    try {
      await transporter.sendMail(mailOptions); // Send the email
      mailSent = true; // Set to true if email sent successfully
    } catch (error) {
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
      } else {
        throw new Error("Failed to send email. Retry again later.");
      }
    }
  }

  return mailSent;
};
