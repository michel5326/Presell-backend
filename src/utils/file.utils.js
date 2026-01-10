const fs = require("fs");
const path = require("path");

function safeUnlink(file) {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
}

function findTemplate(templateId) {
  const file = path.join(
    process.cwd(),
    "src",
    "templates",
    "legacy",
    `${templateId}.html`
  );

  return fs.existsSync(file) ? file : null;
}


module.exports = {
  safeUnlink,
  findTemplate,
};
