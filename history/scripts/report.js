const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const REPORTS_DIR = path.join(ROOT, "reports");
const HISTORY_FILE = path.join(ROOT, "history", "history.csv");

const today = new Date().toISOString().slice(0, 10);

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }

  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return json.lighthouseResult || json;
}

function score(data, category) {
  const value = data.categories?.[category]?.score;
  return value !== undefined && value !== null ? Math.round(value * 100) : "-";
}

function auditDisplay(data, key) {
  return data.audits?.[key]?.displayValue || "-";
}

function auditNumeric(data, key) {
  const value = data.audits?.[key]?.numericValue;
  return value !== undefined && value !== null ? value : null;
}

function status(value) {
  if (value === "-") return "bad";
  if (value >= 90) return "good";
  if (value >= 50) return "mid";
  return "bad";
}

function readLastHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return null;

  const rows = fs
    .readFileSync(HISTORY_FILE, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean);

  if (rows.length <= 1) return null;

  const last = rows[rows.length - 1].split(",");

  return {
    date: last[0],
    mobilePerformance: Number(last[1]),
    desktopPerformance: Number(last[2])
  };
}

function delta(current, previous) {
  if (previous === null || previous === undefined || Number.isNaN(previous)) {
    return {
      previous: "-",
      value: 0,
      text: "İlk kayıt",
      className: "delta-flat"
    };
  }

  const diff = current - previous;

  if (diff > 0) {
    return {
      previous,
      value: diff,
      text: `+${diff} puan yükseldi`,
      className: "delta-up"
    };
  }

  if (diff < 0) {
    return {
      previous,
      value: diff,
      text: `${diff} puan düştü`,
      className: "delta-down"
    };
  }

  return {
    previous,
    value: 0,
    text: "Değişim yok",
    className: "delta-flat"
  };
}

function createAiComment(report) {
  const mobile = report.mobile.performance;
  const desktop = report.desktop.performance;

  if (mobile < 50 && desktop < 70) {
    return "Mobil performans kritik seviyede. Özellikle LCP, görsel optimizasyonu, kullanılmayan JavaScript ve render-blocking kaynaklar öncelikli incelenmeli. Masaüstü daha iyi görünse de mobil skor satış ve reklam trafiği açısından daha öncelikli iyileştirme alanı.";
  }

  if (mobile < 50) {
    return "Mobil performans düşük. Reklam trafiğinin büyük kısmı mobilden geldiği için LCP, Speed Index ve ağır görsel dosyaları öncelikli optimize edilmeli. Masaüstü tarafı daha sağlıklı fakat mobil deneyim satış dönüşümünü doğrudan etkileyebilir.";
  }

  if (mobile >= 70 && desktop >= 80) {
    return "Genel tablo olumlu. Mobil ve masaüstü skorları kullanılabilir seviyede. Bundan sonraki odak, LCP süresini kısaltmak, görselleri hafifletmek ve skor istikrarını günlük olarak korumak olmalı.";
  }

  return "Performans orta seviyede. Büyük bir kırılma görünmüyor ancak mobil tarafta hız optimizasyonu hâlâ önemli. Görseller, üçüncü parti scriptler ve sayfa açılışındaki kritik kaynaklar düzenli takip edilmeli.";
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(REPORTS_DIR);

const mobileRaw = loadJson(path.join(REPORTS_DIR, "mobile.report.json"));
const desktopRaw = loadJson(path.join(REPORTS_DIR, "desktop.report.json"));

const previous = readLastHistory();

const mobilePerformance = score(mobileRaw, "performance");
const desktopPerformance = score(desktopRaw, "performance");

const mobileDelta = delta(
  Number(mobilePerformance),
  previous ? previous.mobilePerformance : null
);

const desktopDelta = delta(
  Number(desktopPerformance),
  previous ? previous.desktopPerformance : null
);

const report = {
  date: today,

  mobile: {
    performance: mobilePerformance,
    seo: score(mobileRaw, "seo"),
    accessibility: score(mobileRaw, "accessibility"),
    bestPractices: score(mobileRaw, "best-practices"),
    lcp: auditDisplay(mobileRaw, "largest-contentful-paint"),
    fcp: auditDisplay(mobileRaw, "first-contentful-paint"),
    cls: auditDisplay(mobileRaw, "cumulative-layout-shift"),
    speedIndex: auditDisplay(mobileRaw, "speed-index"),
    lcpMs: auditNumeric(mobileRaw, "largest-contentful-paint"),
    fcpMs: auditNumeric(mobileRaw, "first-contentful-paint"),
    clsValue: auditNumeric(mobileRaw, "cumulative-layout-shift"),
    speedIndexMs: auditNumeric(mobileRaw, "speed-index"),
    performanceStatus: status(mobilePerformance),
    previousPerformance: mobileDelta.previous,
    performanceDelta: mobileDelta.value,
    performanceDeltaText: mobileDelta.text,
    performanceDeltaClass: mobileDelta.className
  },

  desktop: {
    performance: desktopPerformance,
    seo: score(desktopRaw, "seo"),
    accessibility: score(desktopRaw, "accessibility"),
    bestPractices: score(desktopRaw, "best-practices"),
    lcp: auditDisplay(desktopRaw, "largest-contentful-paint"),
    fcp: auditDisplay(desktopRaw, "first-contentful-paint"),
    cls: auditDisplay(desktopRaw, "cumulative-layout-shift"),
    speedIndex: auditDisplay(desktopRaw, "speed-index"),
    lcpMs: auditNumeric(desktopRaw, "largest-contentful-paint"),
    fcpMs: auditNumeric(desktopRaw, "first-contentful-paint"),
    clsValue: auditNumeric(desktopRaw, "cumulative-layout-shift"),
    speedIndexMs: auditNumeric(desktopRaw, "speed-index"),
    performanceStatus: status(desktopPerformance),
    previousPerformance: desktopDelta.previous,
    performanceDelta: desktopDelta.value,
    performanceDeltaText: desktopDelta.text,
    performanceDeltaClass: desktopDelta.className
  }
};

report.aiComment = createAiComment(report);

fs.writeFileSync(
  path.join(REPORTS_DIR, `${today}.json`),
  JSON.stringify(report, null, 2),
  "utf8"
);

const markdown = `# Asra Pırlanta Günlük Lighthouse Raporu

Tarih: ${today}

## Mobile
- Performance: ${report.mobile.performance}
- SEO: ${report.mobile.seo}
- Accessibility: ${report.mobile.accessibility}
- Best Practices: ${report.mobile.bestPractices}
- LCP: ${report.mobile.lcp}
- FCP: ${report.mobile.fcp}
- CLS: ${report.mobile.cls}
- Speed Index: ${report.mobile.speedIndex}

## Desktop
- Performance: ${report.desktop.performance}
- SEO: ${report.desktop.seo}
- Accessibility: ${report.desktop.accessibility}
- Best Practices: ${report.desktop.bestPractices}
- LCP: ${report.desktop.lcp}
- FCP: ${report.desktop.fcp}
- CLS: ${report.desktop.cls}
- Speed Index: ${report.desktop.speedIndex}

## AI Yorumu
${report.aiComment}
`;

fs.writeFileSync(path.join(REPORTS_DIR, `${today}.md`), markdown, "utf8");

console.log("Premium V2 rapor oluşturuldu:", `reports/${today}.json`);
