const fs = require("fs");

function load(file) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return json.lighthouseResult || json;
}

const mobile = load("reports/mobile.report.json");
const desktop = load("reports/desktop.report.json");

function score(data, category) {
  const value = data.categories?.[category]?.score;
  return value != null ? Math.round(value * 100) : "-";
}

function auditDisplay(data, key) {
  return data.audits?.[key]?.displayValue || "-";
}

const today = new Date().toISOString().slice(0, 10);

/*
|--------------------------------------------------------------------------
| JSON VERİSİ (Bundan sonra tüm sistem bunu kullanacak)
|--------------------------------------------------------------------------
*/

const reportData = {
  date: today,

  mobile: {
    performance: score(mobile, "performance"),
    seo: score(mobile, "seo"),
    accessibility: score(mobile, "accessibility"),
    bestPractices: score(mobile, "best-practices"),

    lcp: auditDisplay(mobile, "largest-contentful-paint"),
    fcp: auditDisplay(mobile, "first-contentful-paint"),
    cls: auditDisplay(mobile, "cumulative-layout-shift"),
    inp: auditDisplay(mobile, "interaction-to-next-paint"),
  },

  desktop: {
    performance: score(desktop, "performance"),
    seo: score(desktop, "seo"),
    accessibility: score(desktop, "accessibility"),
    bestPractices: score(desktop, "best-practices"),

    lcp: auditDisplay(desktop, "largest-contentful-paint"),
    fcp: auditDisplay(desktop, "first-contentful-paint"),
    cls: auditDisplay(desktop, "cumulative-layout-shift"),
    inp: auditDisplay(desktop, "interaction-to-next-paint"),
  },
};

/*
|--------------------------------------------------------------------------
| MARKDOWN RAPORU
|--------------------------------------------------------------------------
*/

const report = `# Asra Pırlanta Günlük Performans Raporu

**Tarih:** ${today}

## 📱 Mobile

| Metrik | Sonuç |
|--------|------:|
| Performance | ${reportData.mobile.performance} |
| SEO | ${reportData.mobile.seo} |
| Accessibility | ${reportData.mobile.accessibility} |
| Best Practices | ${reportData.mobile.bestPractices} |

### Core Web Vitals

- LCP: ${reportData.mobile.lcp}
- FCP: ${reportData.mobile.fcp}
- CLS: ${reportData.mobile.cls}
- INP: ${reportData.mobile.inp}

---

## 💻 Desktop

| Metrik | Sonuç |
|--------|------:|
| Performance | ${reportData.desktop.performance} |
| SEO | ${reportData.desktop.seo} |
| Accessibility | ${reportData.desktop.accessibility} |
| Best Practices | ${reportData.desktop.bestPractices} |

### Core Web Vitals

- LCP: ${reportData.desktop.lcp}
- FCP: ${reportData.desktop.fcp}
- CLS: ${reportData.desktop.cls}
- INP: ${reportData.desktop.inp}
`;

/*
|--------------------------------------------------------------------------
| DOSYALARI OLUŞTUR
|--------------------------------------------------------------------------
*/

fs.writeFileSync(
  `reports/${today}.json`,
  JSON.stringify(reportData, null, 2)
);

fs.writeFileSync(`reports/${today}.md`, report);

console.log("✅ Markdown raporu oluşturuldu.");
console.log("✅ JSON raporu oluşturuldu.");
