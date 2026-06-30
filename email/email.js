const fs = require("fs");

let html = fs.readFileSync("./email/template.html","utf8");

html = html.replace("{{performance}}",97);
