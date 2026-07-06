const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { buildEmailHtml } = require("../../email/email");

const ROOT = path.join(__dirname, "../..");
const REPORTS_DIR = path.join(ROOT, "reports");

const today = new Date().toISOString().slice(0, 10);
const reportPath = path.join(REPORTS_DIR, `${today}.json`);

if (!fs.existsSync(reportPath)) {
  console.error("Rapor bulunamadı:", reportPath);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const html = buildEmailHtml(report);

const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
const mailTo = process.env.MAIL_TO || smtpUser;
const mailFrom = process.env.MAIL_FROM || smtpUser;

if (!smtpUser || !smtpPass || !mailTo) {
  console.error("Mail ayarları eksik. Gerekli env değerleri:");
  console.error("SMTP_USER veya GMAIL_USER");
  console.error("SMTP_PASS veya GMAIL_APP_PASSWORD");
  console.error("MAIL_TO");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

async function send() {
  const info = await transporter.sendMail({
    from: `"Asra Lighthouse" <${mailFrom}>`,
    to: mailTo,
    subject: `Asra Pırlanta Lighthouse Premium Raporu - ${today}`,
    html
  });

  console.log("Premium Mail V2 gönderildi:", info.messageId);
}

send().catch((error) => {
  console.error("Mail gönderilemedi:", error);
  process.exit(1);
});
