const fs = require("fs");
const nodemailer = require("nodemailer");

const today = new Date().toISOString().slice(0, 10);

const reportPath = `reports/${today}.md`;

if (!fs.existsSync(reportPath)) {
  console.error("Rapor bulunamadı:", reportPath);
  process.exit(1);
}

const report = fs.readFileSync(reportPath, "utf8");

const html = `
<h2>📊 Asra Pırlanta Günlük Lighthouse Raporu</h2>

<p><b>Tarih:</b> ${today}</p>

<pre style="
font-family:Arial;
font-size:14px;
white-space:pre-wrap;
line-height:1.6;
">${report}</pre>

<hr>

<p>Bu rapor GitHub Actions tarafından otomatik oluşturulmuştur.</p>
`;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function send() {
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to: process.env.MAIL_TO,
    subject: `📊 Asra Lighthouse Raporu - ${today}`,
    html,
  });

  console.log("✅ Mail gönderildi.");
}

send().catch((err) => {
  console.error(err);
  process.exit(1);
});
