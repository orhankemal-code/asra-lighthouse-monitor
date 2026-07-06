
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

const ROOT = path.join(__dirname, "../..");
const CONFIG_PATH = path.join(ROOT, "competitors", "competitors.json");
const DATA_DIR = path.join(ROOT, "competitors", "data");

const today = new Date().toISOString().slice(0, 10);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+|(?<=\%)\s+|\n+/)
    .map((item) => normalizeText(item))
    .filter((item) => item.length >= 8 && item.length <= 220);
}

function uniq(list) {
  return [...new Set(list)];
}

function findCampaignTexts(text, keywords) {
  const lowerKeywords = keywords.map((k) => k.toLocaleLowerCase("tr-TR"));

  const sentences = splitSentences(text);

  const matches = sentences.filter((sentence) => {
    const lower = sentence.toLocaleLowerCase("tr-TR");
    return lowerKeywords.some((keyword) => lower.includes(keyword));
  });

  return uniq(matches).slice(0, 20);
}

function extractPercentCampaigns(text) {
  const matches = normalizeText(text).match(/% ?\d{1,3}|\d{1,3} ?%/g);
  return uniq(matches || []).slice(0, 20);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
}

async function scanSite(site, keywords) {
  const startedAt = new Date().toISOString();

  try {
    const html = await fetchHtml(site.url);
    const $ = cheerio.load(html);

    $("script, style, noscript, svg").remove();

    const title = normalizeText($("title").first().text());
    const description = normalizeText(
      $('meta[name="description"]').attr("content") || ""
    );

    const h1 = normalizeText($("h1").first().text());

    const bodyText = normalizeText($("body").text());

    const campaignTexts = findCampaignTexts(bodyText, keywords);
    const percentCampaigns = extractPercentCampaigns(bodyText);

    const bannerImages = [];

    $("img").each((_, el) => {
      const src = $(el).attr("src") || "";
      const alt = normalizeText($(el).attr("alt") || "");

      const combined = `${src} ${alt}`.toLocaleLowerCase("tr-TR");

      if (
        combined.includes("banner") ||
        combined.includes("kampanya") ||
        combined.includes("campaign") ||
        combined.includes("slider") ||
        combined.includes("desktop") ||
        combined.includes("mobile")
      ) {
        bannerImages.push({
          src: src.slice(0, 250),
          alt: alt.slice(0, 160)
        });
      }
    });

    const cleanBannerImages = bannerImages.slice(0, 12);

    const importantText = [
      title,
      description,
      h1,
      campaignTexts.join(" | "),
      percentCampaigns.join(" | "),
      cleanBannerImages.map((item) => `${item.alt} ${item.src}`).join(" | ")
    ].join(" || ");

    return {
      name: site.name,
      url: site.url,
      ok: true,
      scannedAt: startedAt,
      title,
      description,
      h1,
      campaignTexts,
      percentCampaigns,
      bannerImages: cleanBannerImages,
      campaignHash: hash(campaignTexts.join("|")),
      bannerHash: hash(
        cleanBannerImages.map((item) => `${item.src}|${item.alt}`).join("|")
      ),
      pageHash: hash(importantText)
    };
  } catch (error) {
    return {
      name: site.name,
      url: site.url,
      ok: false,
      scannedAt: startedAt,
      error: error.message,
      title: "",
      description: "",
      h1: "",
      campaignTexts: [],
      percentCampaigns: [],
      bannerImages: [],
      campaignHash: "",
      bannerHash: "",
      pageHash: ""
    };
  }
}

async function main() {
  ensureDir(DATA_DIR);

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

  const previousLatestPath = path.join(DATA_DIR, "latest.json");
  const previousPath = path.join(DATA_DIR, "previous.json");

  if (fs.existsSync(previousLatestPath)) {
    fs.copyFileSync(previousLatestPath, previousPath);
  }

  const allSites = [config.asra, ...config.competitors];

  const results = [];

  for (const site of allSites) {
    console.log(`Taranıyor: ${site.name} - ${site.url}`);
    const result = await scanSite(site, config.campaignKeywords || []);
    results.push(result);
  }

  const output = {
    date: today,
    generatedAt: new Date().toISOString(),
    results
  };

  fs.writeFileSync(
    path.join(DATA_DIR, `${today}.json`),
    JSON.stringify(output, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    path.join(DATA_DIR, "latest.json"),
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("Rakip taraması tamamlandı.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
