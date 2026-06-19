// src/emailTemplate.mjs — structured report -> fixed corporate HTML email.
// The STRUCTURE here is the mandated format; only the slot values change.
import { CONFIG } from './config.mjs';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function autoGreeting(reportTime) {
  const m = String(reportTime || '').match(/(\d{1,2}):\d{2}\s*([ap])/i);
  if (!m) return 'Buenas tardes,';
  let h = parseInt(m[1], 10) % 12;
  if (/p/i.test(m[2])) h += 12;
  if (h < 12) return 'Buenos días,';
  if (h < 19) return 'Buenas tardes,';
  return 'Buenas noches,';
}

const block = (titleHtml, bodyHtml) =>
  `<p style="margin:0 0 11pt">${titleHtml ? `<strong>${titleHtml}</strong><br>` : ''}${bodyHtml}</p>`;

function renderDays(dias, showHeading) {
  const out = [];
  if (showHeading) out.push('<p style="margin:0 0 11pt"><strong>Pronóstico:</strong></p>');
  for (const d of dias) {
    const lines = d.periods.map((p) =>
      p.label ? `${esc(p.label)}: ${esc(p.text)}` : esc(p.text)).join('<br>');
    out.push(block(`${esc(d.day)}:`, lines));
  }
  return out.join('\n');
}

// images: { radar?: {cid}, windy?: {cid} } — only the cid is needed here.
export function buildEmailHtml(report, images = {}, opts = {}) {
  const cfg = { ...CONFIG, ...opts };
  const s = report.secciones;
  const greeting = cfg.greetingAuto ? autoGreeting(report.meta?.reportTime) : cfg.greeting;

  // Use the image's ACTUAL resized width so the mail client never upscales it
  // (forcing a fixed width on a smaller image is what made them look blurry).
  const imgTag = (im, alt) => {
    const w = im.width || cfg.image.width;
    return `<p style="margin:0 0 11pt"><img src="cid:${im.cid}" alt="${esc(alt)}" width="${w}" ` +
      `style="width:${w}px;max-width:100%;height:auto;display:block;border:0"></p>`;
  };

  const parts = [
    `<p style="margin:0 0 11pt">${esc(greeting)}</p>`,
    `<p style="margin:0 0 11pt">${esc(cfg.intro)}</p>`,
    block('PUNTA CANA Y ÁREAS VECINAS:', esc(s.puntaCana)),
    block('CONDICIONES GENERALES:', s.condicionesGenerales.map(esc).join('<br>')),
    renderDays(s.pronostico.dias, cfg.showPronosticoHeading),
    block('PRONOSTICO MARINO EXTENDIDO A 3 DÍAS:', esc(s.marino)),
    s.maritimas ? block('CONDICIONES MARÍTIMAS:', esc(s.maritimas)) : '',
    s.playa ? block('CONDICIONES MARÍTIMAS EN ÁREAS DE PLAYA:', esc(s.playa)) : '',
    block(null,
      `<strong>Salida del Sol:</strong> ${esc(report.sol?.salida || '')}<br>` +
      `<strong>Puesta del Sol:</strong> ${esc(report.sol?.puesta || '')}`),
    images.radar ? imgTag(images.radar, 'Radar / satélite') : '',
    images.windy ? imgTag(images.windy, 'Windy') : '',
    cfg.signatureHtml || '',
  ];

  const body = parts.filter(Boolean).join('\n');
  return `<div style="font-family:${cfg.font.family};font-size:${cfg.font.size};` +
    `color:#000000;line-height:1.45">\n${body}\n</div>`;
}
