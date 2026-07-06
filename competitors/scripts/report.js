
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const DATA_DIR = path.join(ROOT, "competitors", "data");
const REPORT_DIR = path.join(ROOT, "competitors", "reports");

const latestPath = path.join(DATA_DIR, "latest.json");
const previousPath = path.join(DATA_DIR, "previous.json");

const today = new Date().toISOString().slice(0, 10);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findPrevious(previous, name) {
  if (!previous || !previous.results) return null;
  return previous.results.find((item) => item.name === name) || null;
}

function compareSite(current, previous) {
  const hasPrevious = !!previous;

  const campaignChanged =
    hasPrevious && current.campaignHash !== previous.campaignHash;

  const bannerChanged =
    hasPrevious && current.bannerHash !== previous.bannerHash;

  const pageChanged =
    hasPrevious && current.pageHash !== previous.pageHash;

  const newCampaignTexts = [];

  if (hasPrevious) {
    const oldTexts = new Set(previous.campaignTexts || []);
    for (const text of current.campaignTexts || []) {
      if (!oldTexts.has(text)) {
        newCampaignTexts.push(text);
      }
    }
  }

  return {
    name: current.name,
    url: current.url,
    ok: current.ok,
    error: current.error || "",
    title: current.title,
    description: current.description,
    h1: current.h1,
    campaignTexts: current.campaignTexts || [],
    percentCampaigns: current.percentCampaigns || [],
    bannerImages: current.bannerImages || [],
    hasPrevious,
    campaignChanged,
    bannerChanged,
    pageChanged,
    newCampaignTexts: newCampaignTexts.slice(0, 8)
  };
}

function strengthWeakness(site, asra) {
  if (!site.ok) {
    return {
      strength: "Site taraması başarısız olduğu için güçlü yön tespit edilemedi.",
      weakness: "Teknik erişim veya bot koruması nedeniyle veri alınamadı."
    };
  }

  const campaignCount = site.campaignTexts.length;
  const percentCount = site.percentCampaigns.length;
  const bannerCount = site.bannerImages.length;

  const asraCampaignCount = asra ? asra.campaignTexts.length : 0;
  const asraBannerCount = asra ? asra.bannerImages.length : 0;

  let strength = "Kampanya görünürlüğü sınırlı görünüyor.";
  let weakness = "Ana sayfada kampanya mesajı daha net verilebilir.";

  if (campaignCount > asraCampaignCount) {
    strength = "Kampanya mesajı Asra'ya göre daha fazla görünür durumda.";
  }

  if (bannerCount > asraBannerCount) {
    strength = "Banner/slider alanlarını daha yoğun kullanıyor.";
  }

  if (percentCount > 0) {
    strength = `İndirim oranı mesajlarını görünür kullanıyor: ${site.percentCampaigns.join(", ")}.`;
  }

  if (campaignCount === 0) {
    weakness = "Kampanya metni tespit edilemedi; ana sayfa mesajı zayıf görünüyor.";
  } else if (campaignCount < asraCampaignCount) {
    weakness = "Asra'ya göre kampanya metni daha az görünür durumda.";
  }

  if (bannerCount === 0) {
    weakness = "Banner görseli tespiti zayıf; kampanya görsel iletişimi sınırlı olabilir.";
  }

  return {
    strength,
    weakness
  };
}

function createAiComment(sites) {
  const changed = sites.filter(
    (site) => site.campaignChanged || site.bannerChanged || site.pageChanged
  );

  const failed = sites.filter((site) => !site.ok);

  const mostCampaign = [...sites]
    .filter((site) => site.ok)
    .sort((a, b) => b.campaignTexts.length - a.campaignTexts.length)[0];

  const notes = [];

  if (changed.length > 0) {
    notes.push(
      `Bugün ${changed.length} sitede kampanya, banner veya önemli sayfa değişikliği tespit edildi.`
    );
  } else {
    notes.push("Bugün rakiplerde belirgin kampanya veya banner değişikliği tespit edilmedi.");
  }

  if (mostCampaign) {
    notes.push(
      `Kampanya mesajı en yoğun görünen site: ${mostCampaign.name}.`
    );
  }

  if (failed.length > 0) {
    notes.push(
      `${failed.length} site taranamadı; bot koruması, erişim engeli veya geçici bağlantı problemi olabilir.`
    );
  }

  notes.push(
    "Asra tarafında ana banner, sepette avantaj ve indirim mesajı rakiplerle günlük olarak karşılaştırılmalı."
  );

  return notes.join("<br>");
}

function createActions(sites) {
  const actions = [];

  const changedSites = sites.filter(
    (site) => site.name !== "Asra Pırlanta" &&
      (site.campaignChanged || site.bannerChanged)
  );

  if (changedSites.length > 0) {
    actions.push(
      `${changedSites.map((site) => site.name).join(", ")} tarafında değişiklik var; ana banner ve kampanya metinleri kontrol edilmeli.`
    );
  }

  const aggressiveDiscountSites = sites.filter(
    (site) =>
      site.name !== "Asra Pırlanta" &&
      site.percentCampaigns &&
      site.percentCampaigns.length > 0
  );

  if (aggressiveDiscountSites.length > 0) {
    actions.push(
      `Rakiplerde indirim oranı vurgusu var: ${aggressiveDiscountSites
        .map((site) => `${site.name} (${site.percentCampaigns.slice(0, 3).join(", ")})`)
        .join("; ")}.`
    );
  }

  actions.push(
    "Asra ana sayfasında kampanya mesajı ilk ekranda net, kısa ve güçlü görünmeli."
  );

  while (actions.length < 3) {
    actions.push(
      "Rakip banner metinleri günlük izlenerek benzer dönemsel kampanyalara hızlı karşılık verilmeli."
    );
  }

  return {
    actionOne: actions[0],
    actionTwo: actions[1],
    actionThree: actions[2]
  };
}

function main() {
  ensureDir(REPORT_DIR);

  const latest = loadJson(latestPath);
  const previous = loadJson(previousPath);

  if (!latest) {
    console.error("latest.json bulunamadı. Önce competitor:scan çalışmalı.");
    process.exit(1);
  }

  const asraCurrent = latest.results.find((item) => item.name === "Asra Pırlanta");

  const sites = latest.results.map((current) => {
    const previousSite = findPrevious(previous, current.name);
    const compared = compareSite(current, previousSite);
    const sw = strengthWeakness(compared, asraCurrent);

    return {
      ...compared,
      ...sw
    };
  });

  const report = {
    date: today,
    generatedAt: new Date().toISOString(),
    totalSites: sites.length,
    changedSites: sites.filter(
      (site) => site.campaignChanged || site.bannerChanged || site.pageChanged
    ).length,
    failedSites: sites.filter((site) => !site.ok).length,
    sites,
    aiComment: createAiComment(sites),
    ...createActions(sites)
  };

  fs.writeFileSync(
    path.join(REPORT_DIR, `${today}.json`),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    path.join(REPORT_DIR, "latest-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("Rakip analiz raporu oluşturuldu.");
}

main();
