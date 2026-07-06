const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const ROOT = path.join(__dirname, "../..");
const REPORT_DIR = path.join(ROOT, "competitors", "reports");

const today = new Date().toISOString().slice(0, 10);
const reportPath = path.join(REPORT_DIR, "latest-report.json");

if (!fs.existsSync(reportPath)) {
  console.error("Rakip raporu bulunamadı. Önce competitor:report çalışmalı.");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderBanners(site) {
  if (!site.bannerImages || !site.bannerImages.length) {
    return `<div style="font-size:12px;color:#9ca3af;">Banner bulunamadı</div>`;
  }

  return site.bannerImages
    .slice(0, 2)
    .map((img) => {
      if (!img.src) return "";

      return `
        <div style="margin-bottom:10px;">
          <img 
            src="${escapeHtml(img.src)}"
            alt="${escapeHtml(img.alt || site.name)}"
            style="display:block;width:180px;max-width:180px;border-radius:12px;border:1px solid #e5e7eb;background:#f3f4f6;"
          >
          ${
            img.alt
              ? `<div style="font-size:11px;line-height:1.4;color:#6b7280;margin-top:5px;">${escapeHtml(img.alt)}</div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function siteRows(sites) {
  return sites
    .map((site) => {
      const status = site.ok ? "✅" : "❌";
      const changed =
        site.campaignChanged || site.bannerChanged || site.pageChanged
          ? "Var"
          : "Yok";

      const campaigns =
        site.campaignTexts && site.campaignTexts.length
          ? site.campaignTexts.slice(0, 3).map(escapeHtml).join("<br><br>")
          : "-";

      const banners = renderBanners(site);

      return `
        <tr>
          <td style="padding:14px;border-top:1px solid #e5e7eb;vertical-align:top;">${status}</td>
          <td style="padding:14px;border-top:1px solid #e5e7eb;vertical-align:top;">
            <strong>${escapeHtml(site.name)}</strong>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;">${escapeHtml(site.url)}</div>
          </td>
          <td style="padding:14px;border-top:1px solid #e5e7eb;vertical-align:top;">${changed}</td>
          <td style="padding:14px;border-top:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(site.percentCampaigns.join(", ") || "-")}</td>
          <td style="padding:14px;border-top:1px solid #e5e7eb;vertical-align:top;font-size:12px;line-height:1.5;">${campaigns}</td>
          <td style="padding:14px;border-top:1px solid #e5e7eb;vertical-align:top;">${banners}</td>
        </tr>
      `;
    })
    .join("");
}

const html = `
<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Asra Rakip Analizi</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827;">
  <center style="width:100%;background:#f5f5f7;padding:32px 12px;">
    <table width="920" cellpadding="0" cellspacing="0" border="0" style="width:920px;max-width:920px;background:#ffffff;border-radius:28px;overflow:hidden;">
      
      <tr>
        <td style="padding:42px;background:linear-gradient(135deg,#111827,#1e3a8a,#2563eb);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:2px;font-weight:800;opacity:.8;">ASRA PIRLANTA</div>
          <h1 style="margin:12px 0 10px;font-size:34px;line-height:1.15;">Rakip Kampanya Analizi</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;opacity:.88;">
            Rakip ana sayfa kampanyaları, banner görselleri, değişiklikler ve günlük aksiyon önerileri.
          </p>
          <div style="display:inline-block;margin-top:22px;padding:9px 14px;border-radius:999px;background:rgba(255,255,255,.16);font-size:12px;font-weight:800;">
            ${escapeHtml(report.date)}
          </div>
        </td>
      </tr>

      <tr>
        <td style="padding:28px 34px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:24px;">
            <tr>
              <td style="padding:24px;">
                <div style="font-size:13px;color:#6b7280;font-weight:800;margin-bottom:8px;">Günlük Özet</div>
                <div style="font-size:34px;font-weight:950;color:#111827;line-height:1;">
                  ${report.changedSites} değişiklik / ${report.totalSites} site
                </div>
                <div style="margin-top:10px;font-size:14px;line-height:1.6;color:#4b5563;">
                  Taranamayan site: ${report.failedSites}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:30px 34px 14px;font-size:18px;font-weight:900;">
          🤖 AI Yorumu
        </td>
      </tr>

      <tr>
        <td style="padding:0 34px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111827;border-radius:24px;color:#ffffff;">
            <tr>
              <td style="padding:24px;font-size:14px;line-height:1.7;color:#d1d5db;">
                ${report.aiComment}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:30px 34px 14px;font-size:18px;font-weight:900;">
          🏆 Rakip Tablosu + Bannerlar
        </td>
      </tr>

      <tr>
        <td style="padding:0 34px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;">
            <tr style="background:#f3f4f6;">
              <th align="left" style="padding:12px;font-size:12px;">Durum</th>
              <th align="left" style="padding:12px;font-size:12px;">Firma</th>
              <th align="left" style="padding:12px;font-size:12px;">Değişim</th>
              <th align="left" style="padding:12px;font-size:12px;">%</th>
              <th align="left" style="padding:12px;font-size:12px;">Kampanya Metni</th>
              <th align="left" style="padding:12px;font-size:12px;">Banner</th>
            </tr>
            ${siteRows(report.sites)}
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:30px 34px 14px;font-size:18px;font-weight:900;">
          🎯 Bugün Asra Ne Yapmalı?
        </td>
      </tr>

      <tr>
        <td style="padding:0 34px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:24px;">
            <tr>
              <td style="padding:22px 24px;">
                <div style="font-size:14px;line-height:1.6;color:#7c2d12;font-weight:800;padding:6px 0;">1. ${escapeHtml(report.actionOne)}</div>
                <div style="font-size:14px;line-height:1.6;color:#7c2d12;font-weight:800;padding:6px 0;">2. ${escapeHtml(report.actionTwo)}</div>
                <div style="font-size:14px;line-height:1.6;color:#7c2d12;font-weight:800;padding:6px 0;">3. ${escapeHtml(report.actionThree)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:28px 34px 38px;text-align:center;font-size:12px;line-height:1.6;color:#8a8a8e;">
          Bu rapor GitHub Actions üzerinden otomatik oluşturulmuştur.<br>
          Asra Competitive Intelligence • Modül 1 Banner Destekli
        </td>
      </tr>

    </table>
  </center>
</body>
</html>
`;

const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
const mailTo = process.env.MAIL_TO || smtpUser;
const mailFrom = process.env.MAIL_FROM || smtpUser;

if (!smtpUser || !smtpPass || !mailTo) {
  console.error("Mail ayarları eksik: SMTP_USER / SMTP_PASS / MAIL_TO");
  process.exit(1);
}

const subject = `🏆 Asra Rakip Analizi • ${report.changedSites} değişiklik • Bannerlı • ${today}`;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

async function send() {
  await transporter.sendMail({
    from: `"Asra Rakip Analizi" <${mailFrom}>`,
    to: mailTo,
    subject,
    html
  });

  console.log("Rakip analiz maili gönderildi.");
}

send().catch((error) => {
  console.error(error);
  process.exit(1);
});
