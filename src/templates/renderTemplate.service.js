const fs = require('fs');
const path = require('path');

/**
 * Mini renderer compatível com:
 * - {{KEY}}  (case-insensitive)
 * - {{#KEY}} ... {{/KEY}}
 * - arrays em seções
 *
 * Determinístico, sem libs externas.
 */

function normKey(k) {
  return String(k || '').trim();
}

function getValue(data, key) {
  if (!data) return undefined;

  if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];

  const wanted = String(key).toLowerCase();
  const found = Object.keys(data).find(
    (k) => String(k).toLowerCase() === wanted
  );

  return found ? data[found] : undefined;
}

function renderSections(template, data) {
  if (!template) return '';

  return template.replace(
    /\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, rawKey, inner) => {
      const key = normKey(rawKey);
      const v = getValue(data, key);

      if (!v) return '';

      if (Array.isArray(v)) {
        return v
          .map((item) => {
            const ctx =
              item && typeof item === 'object'
                ? { ...data, ...item }
                : { ...data, [key]: String(item) };
            return renderTemplateString(inner, ctx);
          })
          .join('');
      }

      return renderTemplateString(inner, data);
    }
  );
}

function renderVars(template, data) {
  if (!template) return '';

  return template.replace(/\{\{([^}]+)\}\}/g, (_, rawKey) => {
    const key = normKey(rawKey);

    if (key.startsWith('#') || key.startsWith('/')) return `{{${rawKey}}}`;

    const v = getValue(data, key);
    return v === undefined || v === null ? '' : String(v);
  });
}

function renderTemplateString(template, data) {
  let out = renderSections(template, data);
  out = renderVars(out, data);

  for (let i = 0; i < 3; i++) {
    const next = renderSections(out, data);
    if (next === out) break;
    out = renderVars(next, data);
  }

  return out;
}

/**
 * API principal
 */
function renderTemplate(arg1, arg2) {
  let templatePath = '';
  let data = {};

  if (arg1 && typeof arg1 === 'object') {
    templatePath = arg1.templatePath || arg1.path || '';
    data = arg1.data || {};
  } else {
    templatePath = arg1 || '';
    data = arg2 || {};
  }

  if (!templatePath) return '';

  // ✅ BASE ABSOLUTA E GARANTIDA
  // este arquivo está em: src/templates/renderTemplate.service.js
  const templatesDir = path.resolve(__dirname);

  const absPath = path.isAbsolute(templatePath)
    ? templatePath
    : path.join(templatesDir, templatePath);

  try {
    const html = fs.readFileSync(absPath, 'utf8');
    return renderTemplateString(html, data);
  } catch (e) {
    console.error('[renderTemplate] read fail:', absPath);
    return '';
  }
}

module.exports = {
  renderTemplate,
  render: renderTemplate,
};
