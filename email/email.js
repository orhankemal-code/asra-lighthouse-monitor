const fs = require("fs");
const path = require("path");

const EMAIL_DIR = __dirname;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getValue(object, keyPath) {
  return keyPath.split(".").reduce((acc, key) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
      return acc[key];
    }

    return "";
  }, object);
}

function replacePlaceholders(template, data) {
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
    if (key.trim() === "css") {
      return data.css || "";
    }

    return escapeHtml(getValue(data, key.trim()));
  });
}

function buildEmailHtml(report) {
  const templatePath = path.join(EMAIL_DIR, "template.html");
  const stylesPath = path.join(EMAIL_DIR, "styles.css");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template bulunamadı: ${templatePath}`);
  }

  if (!fs.existsSync(stylesPath)) {
    throw new Error(`CSS bulunamadı: ${stylesPath}`);
  }

  const template = fs.readFileSync(templatePath, "utf8");
  const css = fs.readFileSync(stylesPath, "utf8");

  return replacePlaceholders(template, {
    ...report,
    css
  });
}

module.exports = {
  buildEmailHtml
};
