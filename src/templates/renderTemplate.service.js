const fs = require('fs');

function isTruthy(val) {
  if (Array.isArray(val)) return val.length > 0;
  return !!val;
}

/**
 * Render bem simples no estilo Mustache:
 * - {{KEY}} substitui valor
 * - {{#KEY}} ... {{/KEY}} mostra bloco se KEY for truthy (ou array)
 *   - se KEY for array, repete bloco e, se item for string, usa como conteúdo
 */
function renderTemplateString(template, data = {}) {
  let out = String(template || '');

  // 1) Seções {{#KEY}}...{{/KEY}}
  // (sem aninhamento complexo — suficiente pros teus templates)
  out = out.replace(/{{#([A-Z0-9_]+)}}([\s\S]*?){{\/\1}}/gi, (m, key, inner) => {
    const val = data[key];

    if (!isTruthy(val)) return '';

    // array => repete
    if (Array.isArray(val)) {
      return val
        .map((item) => {
          // se item for string/number => coloca no lugar de {{KEY}} e também {{.}}
          if (item === null || item === undefined) return '';
          if (typeof item === 'string' || typeof item === 'number') {
            const scoped = { ...data, [key]: String(item), '.': String(item) };
            return renderTemplateString(inner, scoped);
          }
          // objeto => merge com escopo
          const scoped = { ...data, ...(item || {}) };
          return renderTemplateString(inner, scoped);
        })
        .join('');
    }

    // truthy normal => render inner com mesmo data
    return renderTemplateString(inner, data);
  });

  // 2) Variáveis {{KEY}} e {{.}}
  out = out.replace(/{{\s*([A-Z0-9_.]+)\s*}}/gi, (m, key) => {
    const val = data[key];
    return val === null || val === undefined ? '' : String(val);
  });

  return out;
}

function renderTemplateFromFile(templatePath, data = {}) {
  const html = fs.readFileSync(templatePath, 'utf8');
  return renderTemplateString(html, data);
}

module.exports = {
  renderTemplateFromFile,
  renderTemplateString,
};
