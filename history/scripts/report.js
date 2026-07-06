const fs = require("fs");

function scoreColor(score) {
    score = Number(score);

    if (score >= 90) return "#00C853";
    if (score >= 50) return "#FFB300";
    return "#FF5252";
}

function scoreText(score) {
    score = Number(score);

    if (score >= 90) return "Mükemmel";
    if (score >= 75) return "İyi";
    if (score >= 50) return "Geliştirilmeli";
    return "Kritik";
}

function formatTime(value) {
    if (value === undefined || value === null) return "-";
    return `${Number(value).toFixed(1)} sn`;
}

function formatCls(value) {
    if (value === undefined || value === null) return "-";
    return Number(value).toFixed(2);
}

function aiComment(score) {

    score = Number(score);

    if (score >= 90) {
        return "Web sitesi performansı oldukça güçlü görünüyor. Kullanıcı deneyimi ve arama motoru açısından önemli bir risk bulunmuyor.";
    }

    if (score >= 75) {
        return "Genel performans iyi seviyede. Özellikle LCP ve kullanılmayan JavaScript dosyaları optimize edilirse skor daha da yükselebilir.";
    }

    if (score >= 50) {
        return "Performans orta seviyede. Sayfa yüklenme süreleri kullanıcı deneyimini olumsuz etkileyebilir. Görseller ve render süresi optimize edilmelidir.";
    }

    return "Performans kritik seviyede. Core Web Vitals metrikleri iyileştirilmeli, büyük görseller, JS ve CSS dosyaları optimize edilmelidir.";
}

function createReport(data) {

    let html = fs.readFileSync("./email/template.html", "utf8");

    html = html.replaceAll("{{date}}", new Date().toLocaleDateString("tr-TR"));

    // MOBILE

    html = html.replaceAll("{{mobilePerformance}}", data.mobile.performance);
    html = html.replaceAll("{{mobilePerformanceColor}}", scoreColor(data.mobile.performance));
    html = html.replaceAll("{{mobilePerformanceText}}", scoreText(data.mobile.performance));

    html = html.replaceAll("{{mobileLcp}}", formatTime(data.mobile.lcp));
    html = html.replaceAll("{{mobileFcp}}", formatTime(data.mobile.fcp));
    html = html.replaceAll("{{mobileCls}}", formatCls(data.mobile.cls));
    html = html.replaceAll("{{mobileSpeedIndex}}", formatTime(data.mobile.speedIndex));

    html = html.replaceAll("{{mobileBar}}", data.mobile.performance);

    // DESKTOP

    html = html.replaceAll("{{desktopPerformance}}", data.desktop.performance);
    html = html.replaceAll("{{desktopPerformanceColor}}", scoreColor(data.desktop.performance));
    html = html.replaceAll("{{desktopPerformanceText}}", scoreText(data.desktop.performance));

    html = html.replaceAll("{{desktopLcp}}", formatTime(data.desktop.lcp));
    html = html.replaceAll("{{desktopFcp}}", formatTime(data.desktop.fcp));
    html = html.replaceAll("{{desktopCls}}", formatCls(data.desktop.cls));
    html = html.replaceAll("{{desktopSpeedIndex}}", formatTime(data.desktop.speedIndex));

    html = html.replaceAll("{{desktopBar}}", data.desktop.performance);

    // AI

    html = html.replaceAll(
        "{{aiComment}}",
        aiComment(
            (
                Number(data.mobile.performance) +
                Number(data.desktop.performance)
            ) / 2
        )
    );

    return html;
}

module.exports = createReport;
