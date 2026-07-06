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

function uniq(list) {
  return [...new Set(list)];
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+|(?<=\%)\s+|\n+/)
    .map((item) => normalizeText(item))
    .filter((item) => item.length >= 8 && item.length <= 220);
}

function findCampaignTexts(text, keywords) {
  const lowerKeywords = keywords.map((k) => k.toLocaleLowerCase("tr-TR"));
  const sentences = splitSentences(text);

  return uniq(
    sentences.filter((sentence) => {
      const lower = sentence.toLocaleLowerCase("tr-TR");
      return lowerKeywords.some((keyword) => lower.includes(keyword));
    })
  ).slice(0, 20);
}

function extractPercentCampaigns(text) {
  const matches = normalizeText(text).match(/% ?\d{1,3}|\d{1,3} ?%/g);
  return uniq(matches || []).slice(0, 20);
}

function absoluteUrl(src, baseUrl) {
  if (!src) return "";

  try {
    return new URL(src, baseUrl).href;
  } catch {
    return "";
  }
}

function getImageSrc($, el, siteUrl) {
  const attrs = [
    "src",
    "data-src",
    "data-original",
    "data-lazy",
    "data-image",
    "data-mobile",
    "data-desktop"
  ];

  for (const attr of attrs) {
    const value = $(el).attr(attr);
    if (value) return absoluteUrl(value, siteUrl);
  }

  const srcset = $(el).attr("srcset") || $(el).attr("data-srcset") || "";

  if (srcset) {
    const first = srcset.split(",")[0].trim().split(" ")[0];
    return absoluteUrl(first, siteUrl);
  }

  return "";
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
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
      const src = getImageSrc($, el, site.url);
      const alt = normalizeText($(el).attr("alt") || "");
      const titleAttr = normalizeText($(el).attr("title") || "");
      const className = normalizeText($(el).attr("class") || "");
      const id = normalizeText($(el).attr("id") || "");

      const combined = `${src} ${alt} ${titleAttr} ${className} ${id}`.toLocaleLowerCase("tr-TR");

      const looksLikeBanner =
        combined.includes("banner") ||
        combined.includes("kampanya") ||
        combined.includes("campaign") ||
        combined.includes("slider") ||
        combined.includes("slide") ||
        combined.includes("hero") ||
        combined.includes("desktop") ||
        combined.includes("mobile") ||
        combined.includes("home");

      if (src && looksLikeBanner) {
        bannerImages.push({
          src: src.slice(0, 500),
          alt: alt.slice(0, 180),
          title: titleAttr.slice(0, 180)
        });
      }
    });

    $("source").each((_, el) => {
      const srcset = $(el).attr("srcset") || $(el).attr("data-srcset") || "";
      const media = normalizeText($(el).attr("media") || "");
      const className = normalizeText($(el).attr("class") || "");

      if (!srcset) return;

      const first = srcset.split(",")[0].trim().split(" ")[0];
      const src = absoluteUrl(first, site.url);

      const combined = `${src} ${media} ${className}`.toLocaleLowerCase("tr-TR");

      const looksLikeBanner =
        combined.includes("banner") ||
        combined.includes("kampanya") ||
        combined.includes("campaign") ||
        combined.includes("slider") ||
        combined.includes("slide") ||
        combined.includes("hero") ||
        combined.includes("desktop") ||
        combined.includes("mobile") ||
        combined.includes("home");

      if (src && looksLikeBanner) {
        bannerImages.push({
          src: src.slice(0, 500),
          alt: media.slice(0, 180),
          title: ""
        });
      }
    });

    const cleanBannerImages = uniq(
      bannerImages.map((item) => JSON.stringify(item))
    )
      .map((item) => JSON.parse(item))
      .slice(0, 8);

    const importantText = [
      title,
      description,
      h1,
      campaignTexts.join(" | "),
      percentCampaigns.join(" | "),
      cleanBannerImages.map((item) => `${item.alt} ${item.title} ${item.src}`).join(" | ")
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
        cleanBannerImages.map((item) => `${item.src}|${item.alt}|${item.title}`).join("|")
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
