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

/*
|--------------------------------------------------------------------------
| Mail Başlığı
|--------------------------------------------------------------------------
*/

let icon = "🟢";

if (report.overallScore < 60) {
  icon = "🔴";
} else if (report.overallScore < 80) {
  icon = "🟡";
}

const subject =
  `${icon} Asra Pırlanta Günlük Dijital Durum Raporu • ` +
  `Site Sağlığı ${report.overallScore}/100 • ` +
  `📱 ${report.mobile.performance}  🖥 ${report.desktop.performance}`;

/*
|--------------------------------------------------------------------------
| SMTP
|--------------------------------------------------------------------------
*/

const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

const mailTo = process.env.MAIL_TO || smtpUser;
const mailFrom = process.env.MAIL_FROM || smtpUser;

if (!smtpUser || !smtpPass || !mailTo) {
  console.error("Mail ayarları eksik.");
  console.error("SMTP_USER");
  console.error("SMTP_PASS");
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

/*
|--------------------------------------------------------------------------
| Mail Gönder
|--------------------------------------------------------------------------
*/

async function send() {

  await transporter.sendMail({
    from: `"Asra Digital Morning Report" <${mailFrom}>`,
    to: mailTo,
    subject,
    html
  });

  console.log("✅ Premium Mail V4 gönderildi.");
}

send().catch((err) => {
  console.error(err);
  process.exit(1);
});
