const fs = require("fs");

function load(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

const mobile = load("reports/mobile.report.json");
const desktop = load("reports/desktop.report.json");

function score(data, category) {
    return Math.round((data.categories?.[category]?.score || 0) * 100);
}

function auditDisplay(data, key) {
    return data.audits?.[key]?.displayValue || "-";
}

function auditValue(data, key) {
    return data.audits?.[key]?.numericValue || 0;
}

const today = new Date().toISOString().slice(0,10);

const report = `# Asra Pırlanta Günlük Performans Raporu

**Tarih:** ${today}

---

# 📱 Mobile

| Metrik | Sonuç |
|--------|-------|
| Performance | ${score(mobile,"performance")} |
| SEO | ${score(mobile,"seo")} |
| Accessibility | ${score(mobile,"accessibility")} |
| Best Practices | ${score(mobile,"best-practices")} |

### Core Web Vitals

- LCP : ${auditDisplay(mobile,"largest-contentful-paint")}
- FCP : ${auditDisplay(mobile,"first-contentful-paint")}
- CLS : ${auditDisplay(mobile,"cumulative-layout-shift")}
- INP : ${auditDisplay(mobile,"interaction-to-next-paint")}

---

# 💻 Desktop

| Metrik | Sonuç |
|--------|-------|
| Performance | ${score(desktop,"performance")} |
| SEO | ${score(desktop,"seo")} |
| Accessibility | ${score(desktop,"accessibility")} |
| Best Practices | ${score(desktop,"best-practices")} |

### Core Web Vitals

- LCP : ${auditDisplay(desktop,"largest-contentful-paint")}
- FCP : ${auditDisplay(desktop,"first-contentful-paint")}
- CLS : ${auditDisplay(desktop,"cumulative-layout-shift")}
- INP : ${auditDisplay(desktop,"interaction-to-next-paint")}

---

# 🤖 AI Yorumu

${auditValue(mobile,"largest-contentful-paint") > 4000
? "🔴 Mobil LCP kritik seviyede. Hero banner ve ana görseller optimize edilmeli."
: "🟢 Mobil LCP iyi seviyede."}

${score(mobile,"performance") < 60
? "🔴 Mobil performans düşük. JavaScript ve görseller optimize edilmeli."
: "🟢 Mobil performans iyi."}

${score(desktop,"performance") >= 90
? "🟢 Desktop performansı çok iyi."
: "🟡 Desktop tarafında optimizasyon fırsatları bulunuyor."}

---

## Öncelik Sırası

1. Hero Banner optimizasyonu
2. AVIF/WebP görseller
3. JavaScript küçültme
4. CSS Minify
5. Cache süresi artırma
6. Font preload
7. Lazy Loading
`;

if (!fs.existsSync("reports")) {
    fs.mkdirSync("reports");
}

fs.writeFileSync(`reports/${today}.md`, report);

console.log("✅ Günlük rapor oluşturuldu.");
