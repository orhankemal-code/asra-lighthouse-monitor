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
  return value !== undefined && value !== null ? Math.round(value * 100) : 0;
}

function auditDisplay(data, key) {
  return data.audits?.[key]?.displayValue || "-";
}

function auditNumeric(data, key) {
  const value = data.audits?.[key]?.numericValue;
  return value !== undefined && value !== null ? value : null;
}

function status(value) {
  if (value >= 90) return "good";
  if (value >= 50) return "mid";
  return "bad";
}

function readHistoryRows() {
  if (!fs.existsSync(HISTORY_FILE)) return [];

  const rows = fs
    .readFileSync(HISTORY_FILE, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean);

  if (rows.length <= 1) return [];

  return rows.slice(1).map((row) => {
    const cols = row.split(",");

    return {
      date: cols[0],
      mobilePerformance: Number(cols[1]),
      desktopPerformance: Number(cols[2])
    };
  });
}

function readLastHistory() {
  const rows = readHistoryRows();
  if (!rows.length) return null;
  return rows[rows.length - 1];
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
      text: `↑ +${diff} puan yükseldi`,
      className: "delta-up"
    };
  }

  if (diff < 0) {
    return {
      previous,
      value: diff,
      text: `↓ ${diff} puan düştü`,
      className: "delta-down"
    };
  }

  return {
    previous,
    value: 0,
    text: "→ Değişim yok",
    className: "delta-flat"
  };
}

function secondsFromMs(ms) {
  if (ms === null || ms === undefined) return null;
  return ms / 1000;
}

function createHealth(report) {
  const overall = Math.round(
    report.mobile.performance * 0.4 +
    report.desktop.performance * 0.25 +
    report.mobile.seo * 0.15 +
    report.mobile.accessibility * 0.1 +
    report.mobile.bestPractices * 0.1
  );

  if (overall >= 80) {
    return {
      overallScore: overall,
      healthStatus: "good",
      healthLabel: "GOOD",
      healthText:
        "Genel teknik sağlık iyi seviyede. Düzenli takip ve küçük optimizasyonlarla skor istikrarı korunmalı."
    };
  }

  if (overall >= 60) {
    return {
      overallScore: overall,
      healthStatus: "mid",
      healthLabel: "WARNING",
      healthText:
        "Genel sağlık orta seviyede. Mobil performans ve Core Web Vitals tarafında iyileştirme yapılması önerilir."
    };
  }

  return {
    overallScore: overall,
    healthStatus: "bad",
    healthLabel: "CRITICAL",
    healthText:
      "Genel sağlık kritik seviyede. Özellikle mobil performans, LCP ve sayfa açılış hızı öncelikli aksiyon gerektiriyor."
  };
}

function createBars(values) {
  if (!values.length) return "Henüz trend verisi yok";

  return values
    .map((value) => {
      if (value >= 90) return "▇";
      if (value >= 75) return "▆";
      if (value >= 60) return "▅";
      if (value >= 45) return "▄";
      if (value >= 30) return "▃";
      return "▂";
    })
    .join(" ");
}

function createTrend(historyRows, currentMobile, currentDesktop) {
  const lastSix = historyRows.slice(-6);

  const mobileValues = [
    ...lastSix.map((row) => row.mobilePerformance),
    currentMobile
  ].filter((value) => !Number.isNaN(value));

  const desktopValues = [
    ...lastSix.map((row) => row.desktopPerformance),
    currentDesktop
  ].filter((value) => !Number.isNaN(value));

  const mobileText = mobileValues.join(" → ");
  const desktopText = desktopValues.join(" → ");

  return {
    mobileTrendText: mobileText || "Henüz veri yok",
    desktopTrendText: desktopText || "Henüz veri yok",
    mobileTrendBars: createBars(mobileValues),
    desktopTrendBars: createBars(desktopValues)
  };
}

function createAiComment(report) {
  const mobilePerf = report.mobile.performance;
  const desktopPerf = report.desktop.performance;
  const mobileLcp = secondsFromMs(report.mobile.lcpMs);
  const mobileFcp = secondsFromMs(report.mobile.fcpMs);
  const mobileCls = Number(report.mobile.clsValue || 0);

  const notes = [];

  if (mobilePerf < 50) {
    notes.push("⚠ Mobil performans düşük seviyede; reklam trafiği ve satış dönüşümü açısından öncelikli risk alanı.");
  } else if (mobilePerf < 70) {
    notes.push("⚠ Mobil performans orta seviyede; iyileştirme yapılırsa kullanıcı deneyimi belirgin şekilde artar.");
  } else {
    notes.push("✓ Mobil performans kabul edilebilir seviyede; istikrar korunmalı.");
  }

  if (desktopPerf >= 75) {
    notes.push("✓ Desktop tarafı mobil tarafa göre daha sağlıklı görünüyor.");
  } else {
    notes.push("⚠ Desktop tarafında da performans iyileştirme alanı var.");
  }

  if (mobileLcp !== null && mobileLcp > 4) {
    notes.push("⚠ Mobile LCP yüksek; ana görsel, banner, font ve render-blocking kaynaklar incelenmeli.");
  }

  if (mobileFcp !== null && mobileFcp > 3) {
    notes.push("⚠ FCP gecikiyor; ilk ekrana gelen CSS/JS yükleri azaltılmalı.");
  }

  if (mobileCls <= 0.1) {
    notes.push("✓ CLS iyi seviyede; sayfa açılırken görsel kayması ciddi bir problem oluşturmuyor.");
  } else {
    notes.push("⚠ CLS tarafında kayma var; görsel boyutları ve layout sabitlemeleri kontrol edilmeli.");
  }

  return notes.join("<br>");
}

function createActions(report) {
  const actions = [];

  const mobileLcp = secondsFromMs(report.mobile.lcpMs);
  const mobileFcp = secondsFromMs(report.mobile.fcpMs);

  if (mobileLcp !== null && mobileLcp > 4) {
    actions.push("Mobil LCP için ana banner/görseller WebP veya AVIF formatında optimize edilmeli.");
  }

  if (mobileFcp !== null && mobileFcp > 3) {
    actions.push("İlk açılışta yüklenen CSS ve JavaScript dosyaları azaltılmalı veya ertelenmeli.");
  }

  if (report.mobile.performance < 50) {
    actions.push("Mobil performans için kullanılmayan JavaScript, üçüncü parti scriptler ve ağır uygulama kaynakları kontrol edilmeli.");
  }

  if (report.mobile.seo < 80) {
    actions.push("SEO skorunu etkileyen başlık, meta açıklama, canonical ve link kontrolleri gözden geçirilmeli.");
  }

  if (report.mobile.accessibility < 85) {
    actions.push("Accessibility için kontrast, alt metin ve form label kontrolleri yapılmalı.");
  }

  if (actions.length === 0) {
    actions.push("Skorlar genel olarak stabil; günlük takip sürdürülmeli.");
    actions.push("Görsel boyutları ve cache ayarları düzenli kontrol edilmeli.");
    actions.push("Yeni site değişikliklerinden sonra Lighthouse tekrar izlenmeli.");
  }

  while (actions.length < 3) {
    actions.push("Performans trendi birkaç gün daha izlenerek kalıcı düşüş olup olmadığı kontrol edilmeli.");
  }

  return {
    actionOne: actions[0],
    actionTwo: actions[1],
    actionThree: actions[2]
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(REPORTS_DIR);

const mobileRaw = loadJson(path.join(REPORTS_DIR, "mobile.report.json"));
const desktopRaw = loadJson(path.join(REPORTS_DIR, "desktop.report.json"));

const historyRows = readHistoryRows();
const previous = readLastHistory();

const mobilePerformance = score(mobileRaw, "performance");
const desktopPerformance = score(desktopRaw, "performance");

const mobileDelta = delta(
  mobilePerformance,
  previous ? previous.mobilePerformance : null
);

const desktopDelta = delta(
  desktopPerformance,
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
    speedIndexMs: auditNumeric(mobileRaw, "speed-index")
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
    speedIndexMs: auditNumeric(desktopRaw, "speed-index")
  }
};

report.mobile.performanceStatus = status(report.mobile.performance);
report.mobile.seoStatus = status(report.mobile.seo);
report.mobile.accessibilityStatus = status(report.mobile.accessibility);
report.mobile.bestPracticesStatus = status(report.mobile.bestPractices);

report.desktop.performanceStatus = status(report.desktop.performance);
report.desktop.seoStatus = status(report.desktop.seo);
report.desktop.accessibilityStatus = status(report.desktop.accessibility);
report.desktop.bestPracticesStatus = status(report.desktop.bestPractices);

report.mobile.previousPerformance = mobileDelta.previous;
report.mobile.performanceDelta = mobileDelta.value;
report.mobile.performanceDeltaText = mobileDelta.text;
report.mobile.performanceDeltaClass = mobileDelta.className;

report.desktop.previousPerformance = desktopDelta.previous;
report.desktop.performanceDelta = desktopDelta.value;
report.desktop.performanceDeltaText = desktopDelta.text;
report.desktop.performanceDeltaClass = desktopDelta.className;

Object.assign(report, createHealth(report));
Object.assign(report, createTrend(historyRows, report.mobile.performance, report.desktop.performance));

report.aiComment = createAiComment(report);

Object.assign(report, createActions(report));

fs.writeFileSync(
  path.join(REPORTS_DIR, `${today}.json`),
  JSON.stringify(report, null, 2),
  "utf8"
);

const markdown = `# Asra Pırlanta Digital Morning Report

Tarih: ${today}

Genel Site Sağlığı: ${report.overallScore}/100 - ${report.healthLabel}

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

## Son 7 Gün Trend
Mobile: ${report.mobileTrendText}
Desktop: ${report.desktopTrendText}

## AI Analizi
${report.aiComment.replace(/<br>/g, "\n")}

## Öncelikli Aksiyonlar
1. ${report.actionOne}
2. ${report.actionTwo}
3. ${report.actionThree}
`;

fs.writeFileSync(path.join(REPORTS_DIR, `${today}.md`), markdown, "utf8");

console.log("Premium V4 rapor oluşturuldu:", `reports/${today}.json`);
