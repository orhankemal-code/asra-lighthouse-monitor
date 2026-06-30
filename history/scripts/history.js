const fs = require("fs");

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const mobile = readJson("reports/mobile.report.json");
const desktop = readJson("reports/desktop.report.json");

function getScore(data, category) {
  return Math.round(
    (data.categories?.[category]?.score ?? 0) * 100
  );
}

function getAudit(data, key) {
  return data.audits?.[key]?.numericValue ?? "";
}

const today = new Date().toISOString().slice(0, 10);

const row = [
  today,

  getScore(mobile, "performance"),
  getScore(desktop, "performance"),

  getScore(mobile, "seo"),
  getScore(desktop, "seo"),

  getScore(mobile, "accessibility"),
  getScore(desktop, "accessibility"),

  getScore(mobile, "best-practices"),
  getScore(desktop, "best-practices"),

  getAudit(mobile, "largest-contentful-paint"),
  getAudit(desktop, "largest-contentful-paint"),

  getAudit(mobile, "cumulative-layout-shift"),
  getAudit(desktop, "cumulative-layout-shift"),

  getAudit(mobile, "interaction-to-next-paint"),
  getAudit(desktop, "interaction-to-next-paint")
].join(",");

const historyFile = "history/history.csv";

let csv = fs.readFileSync(historyFile, "utf8");

const lines = csv.trim().split("\n");

const exists = lines.some(line => line.startsWith(today));

if (!exists) {
  fs.appendFileSync(historyFile, "\n" + row);
  console.log("✅ history.csv güncellendi");
} else {
  console.log("Bugünkü kayıt zaten mevcut.");
}
