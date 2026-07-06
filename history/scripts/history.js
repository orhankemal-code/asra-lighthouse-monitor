const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const HISTORY_DIR = path.join(ROOT, "history");
const HISTORY_FILE = path.join(HISTORY_DIR, "history.csv");
const REPORTS_DIR = path.join(ROOT, "reports");

const today = new Date().toISOString().slice(0, 10);
const reportPath = path.join(REPORTS_DIR, `${today}.json`);

if (!fs.existsSync(reportPath)) {
  console.error("Günlük rapor bulunamadı:", reportPath);
  process.exit(1);
}

if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(
    HISTORY_FILE,
    "date,mobile_performance,desktop_performance,mobile_seo,desktop_seo,mobile_accessibility,desktop_accessibility,mobile_best_practices,desktop_best_practices,mobile_lcp,desktop_lcp,mobile_fcp,desktop_fcp,mobile_cls,desktop_cls,mobile_speed_index,desktop_speed_index\n",
    "utf8"
  );
}

const existing = fs.readFileSync(HISTORY_FILE, "utf8");

if (existing.includes(`${today},`)) {
  console.log("Bugünün kaydı zaten history.csv içinde var:", today);
  process.exit(0);
}

const row = [
  today,
  report.mobile.performance,
  report.desktop.performance,
  report.mobile.seo,
  report.desktop.seo,
  report.mobile.accessibility,
  report.desktop.accessibility,
  report.mobile.bestPractices,
  report.desktop.bestPractices,
  `"${report.mobile.lcp}"`,
  `"${report.desktop.lcp}"`,
  `"${report.mobile.fcp}"`,
  `"${report.desktop.fcp}"`,
  `"${report.mobile.cls}"`,
  `"${report.desktop.cls}"`,
  `"${report.mobile.speedIndex}"`,
  `"${report.desktop.speedIndex}"`
].join(",");

fs.appendFileSync(HISTORY_FILE, `${row}\n`, "utf8");

console.log("History güncellendi:", HISTORY_FILE);
