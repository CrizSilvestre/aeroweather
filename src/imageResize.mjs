// src/imageResize.mjs — browser-only. Resize to a standard width, keep aspect
// ratio, return a base64 data URL ready to embed in the .eml.
//
// Crispness notes:
//  - Reducing a large image to the target in ONE drawImage call looks soft.
//    We step down by halves first, which keeps fine detail (radar text, coastlines).
//  - We never upscale (ratio capped at 1), so small sources keep their native size
//    instead of being blown up and blurred.
import { CONFIG } from './config.mjs';

export async function resizeImage(file, opts = {}) {
  const cfg = { ...CONFIG.image, ...opts };
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(cfg.width / bitmap.width, cfg.maxHeight / bitmap.height, 1);
  const tw = Math.max(1, Math.round(bitmap.width * ratio));
  const th = Math.max(1, Math.round(bitmap.height * ratio));

  // Progressive halving down to ~target, for a sharper result on big reductions.
  let src = bitmap;
  let cw = bitmap.width;
  let ch = bitmap.height;
  while (cw > tw * 2 && ch > th * 2) {
    cw = Math.max(tw, Math.round(cw / 2));
    ch = Math.max(th, Math.round(ch / 2));
    const step = Object.assign(document.createElement('canvas'), { width: cw, height: ch });
    const sx = step.getContext('2d');
    sx.imageSmoothingQuality = 'high';
    sx.drawImage(src, 0, 0, cw, ch);
    src = step;
  }

  const canvas = Object.assign(document.createElement('canvas'), { width: tw, height: th });
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';                 // white matte: evita zonas transparentes/negras en el correo
  ctx.fillRect(0, 0, tw, th);
  ctx.drawImage(src, 0, 0, tw, th);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL(cfg.mime, cfg.quality);
  return { dataUrl, width: tw, height: th, mime: cfg.mime, bytes: Math.round((dataUrl.length - 22) * 0.75) };
}
