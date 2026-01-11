const fs = require('fs');
const path = require('path');

/**
 * Mini renderer compatível com:
 * - {{KEY}}  (case-insensitive)
 * - {{#KEY}} ... {{/KEY}}  (renderiza bloco se KEY for truthy)
 * - array em seção => repete bloco
 *
 * Não usa libs externas.
 * Determinístico.
 */

function normKey(k) {
  return String(k || '').trim();
}

function getValue(data, key) {
  if (!data) return undefined;

  // tenta chave exata
  if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];

  // tenta case-insensitive
  const wanted = String(key).toLowerCase();
  const found = Object.keys(data).find((k) => String(k).toLowerCase() === wanted);
  if (found) return data[found];

  return undefined;
}

function renderSections(template, data) {
  if (!template) return '';

  return template.replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, rawKey, inner) => {
    const key = normKey(rawKey);
    const v = getValue(data, key);

    // falsy => remove bloco
    if (!v) return '';

    // se for array => repete bloco
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

    // truthy => renderiza inner com mesmo data
    return renderTemplateString(inner, data);
  });
}

function renderVars(template, data) {
  if (!template) return '';

  return template.replace(/\{\{([^}]+)\}\}/g, (_, rawKey) => {
    const key = normKey(rawKey);

    // não deixar {{#X}} virar var
    if (key.startsWith('#') || key.startsWith('/')) return `{{${rawKey}}}`;

    const v = getValue(data, key);
    if (v === undefined || v === null) return '';
    return String(v);
  });
}

function renderTemplateString(template, data) {
  // 1) resolve blocos primeiro (pode ter vars dentro)
  let out = renderSections(template, data);

  // 2) resolve vars simples
  out = renderVars(out, data);

  // 3) se existirem seções aninhadas, roda de novo (limitado)
  for (let i = 0; i < 3; i++) {
    const next = renderSections(out, data);
    if (next === out) break;
    out = renderVars(next, data);
  }

  return out;
}

/**
 * API principal
 * Aceita:
 * - renderTemplate('review/review-dark.html', data)
 * - renderTemplate({ templatePath: 'review/review-dark.html', data })
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

  // ✅ garante que base é SEMPRE src/templates
  const templatesDir = path.resolve(__dirname); // este arquivo fica em src/templates
  const absPath = path.isAbsolute(templatePath)
    ? templatePath
    : path.join(templatesDir, templatePath);

  let html = '';
  try {
    html = fs.readFileSync(absPath, 'utf8');
  } catch (e) {
    // não quebra engine, mas deixa rastreável no log
    console.error('[renderTemplate] read fail:', absPath);
    return '';
  }

  return renderTemplateString(html, data);
}

// aliases pra compatibilidade
module.exports = {
  renderTemplate,
  render: renderTemplate,
};
