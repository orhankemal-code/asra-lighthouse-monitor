const fs = require("fs");
const path = require("path");

const createReport = require("./report");
const sendMail = require("../../email/email");

// Günün tarihi
const today = new Date().toISOString().slice(0, 10);

// Lighthouse JSON dosyalarını oku
const mobile = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "../../reports/mobile.report.json"),
        "utf8"
    )
);

const desktop = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "../../reports/desktop.report.json"),
        "utf8"
    )
);

// Premium HTML oluştur
const html = createReport({
    mobile,
    desktop,
});

// Mail gönder
(async () => {
    try {
        await sendMail(
            `📊 Asra Lighthouse Premium Raporu - ${today}`,
            html
        );

        console.log("✅ Premium mail gönderildi.");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
