const fs = require('fs');
const path = require('path');

/**
 * Mini renderer compatível com:
 * - {{KEY}}
 * - {{#KEY}} ... {{/KEY}}  (renderiza bloco se KEY for truthy)
 *
 * Não usa libs externas.
 * Determinístico.
 */

function renderSections(template, data) {
  if (!template) return '';

  return template.replace(/\{\{#([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/gi, (_, key, inner) => {
    const v = data?.[key];

    // falsy => remove bloco
    if (!v) return '';

    // se for array => repete bloco
    if (Array.isArray(v)) {
      return v
        .map((item) => {
          const ctx = (item && typeof item === 'object') ? { ...data, ...item } : { ...data, [key]: String(item) };
          return renderTemplateString(inner, ctx);
        })
        .join('');
    }

    // se for string/number/bool => só renderiza o inner com o mesmo data
    return renderTemplateString(inner, data);
  });
}

function renderVars(template, data) {
  if (!template) return '';

  return template.replace(/\{\{([A-Z0-9_]+)\}\}/gi, (_, key) => {
    const v = data?.[key];
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
  // evita loop infinito: no máximo 3 passes
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

  const baseDir = __dirname; // src/templates
  const absPath = path.isAbsolute(templatePath)
    ? templatePath
    : path.join(baseDir, templatePath);

  let html = '';
  try {
    html = fs.readFileSync(absPath, 'utf8');
  } catch (e) {
    // não quebra engine
    return '';
  }

  return renderTemplateString(html, data);
}

// aliases pra compatibilidade
module.exports = {
  renderTemplate,
  render: renderTemplate,
};
