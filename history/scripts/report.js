const fs = require("fs");

function load(file) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));

  // categories üstteyse onu kullan,
  // lighthouseResult içindeyse onu kullan.
  return json.lighthouseResult || json;
}

const mobile = load("reports/mobile.report.json");
const desktop = load("reports/desktop.report.json");

function score(data, category) {
  const value = data.categories?.[category]?.score;

  console.log(`${category}:`, value);

  return value != null ? Math.round(value * 100) : "-";
}

function auditDisplay(data, key) {
  return data.audits?.[key]?.displayValue || "-";
}

function auditValue(data, key) {
  return data.audits?.[key]?.numericValue || 0;
}

const today = new Date().toISOString().slice(0, 10);

const report = `# Asra Pırlanta Günlük Performans Raporu

**Tarih:** ${today}

## 📱 Mobile

| Metrik | Sonuç |
|--------|------:|
| Performance | ${score(mobile,"performance")} |
| SEO | ${score(mobile,"seo")} |
| Accessibility | ${score(mobile,"accessibility")} |
| Best Practices | ${score(mobile,"best-practices")} |

### Core Web Vitals

- LCP: ${auditDisplay(mobile,"largest-contentful-paint")}
- FCP: ${auditDisplay(mobile,"first-contentful-paint")}
- CLS: ${auditDisplay(mobile,"cumulative-layout-shift")}
- INP: ${auditDisplay(mobile,"interaction-to-next-paint")}

---

## 💻 Desktop

| Metrik | Sonuç |
|--------|------:|
| Performance | ${score(desktop,"performance")} |
| SEO | ${score(desktop,"seo")} |
| Accessibility | ${score(desktop,"accessibility")} |
| Best Practices | ${score(desktop,"best-practices")} |

### Core Web Vitals

- LCP: ${auditDisplay(desktop,"largest-contentful-paint")}
- FCP: ${auditDisplay(desktop,"first-contentful-paint")}
- CLS: ${auditDisplay(desktop,"cumulative-layout-shift")}
- INP: ${auditDisplay(desktop,"interaction-to-next-paint")}
`;

fs.writeFileSync(`reports/${today}.md`, report);

console.log("✅ Günlük rapor oluşturuldu.");
