// Usage: npm run qr -- https://your-site.vercel.app [--out out] [--event "Annual Dinner 2026"]
// Creates qr.png, qr.svg and a printable poster.html in the output folder.
import QRCode from "qrcode";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf("--" + name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const url = args.find((a) => /^https?:\/\//.test(a));
if (!url) {
  console.error('Give the live page address, for example:\n  npm run qr -- https://your-site.vercel.app --event "Annual Dinner 2026"');
  process.exit(1);
}
const outDir = path.resolve(flag("out", "out"));
const event = flag("event", "our event");
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

await mkdir(outDir, { recursive: true });
const opts = { errorCorrectionLevel: "H", margin: 2, color: { dark: "#11222c", light: "#ffffff" } };
await QRCode.toFile(path.join(outDir, "qr.png"), url, { ...opts, width: 1200 });
const svg = await QRCode.toString(url, { ...opts, type: "svg" });
await writeFile(path.join(outDir, "qr.svg"), svg);

const poster = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review poster - ${esc(event)}</title>
<style>
  @page { size: A5 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; color: #11222c; background: #fff; }
  .page { width: 148mm; min-height: 210mm; margin: 0 auto; padding: 16mm 14mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8mm; }
  .kicker { letter-spacing: .14em; text-transform: uppercase; font-size: 11pt; color: #0c7a6b; font-weight: 700; margin: 0; }
  h1 { font-size: 30pt; line-height: 1.1; margin: 0; }
  .qr { width: 86mm; height: 86mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  p { margin: 0; font-size: 13pt; line-height: 1.4; }
  .small { font-size: 10pt; color: #55696f; }
  .stars { font-size: 26pt; color: #f0a202; letter-spacing: 4pt; }
  @media print { .noprint { display: none; } }
  .noprint { position: fixed; top: 8px; right: 8px; background: #0c7a6b; color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 13px; }
</style></head>
<body>
<div class="noprint">Press Ctrl/Cmd + P to print (A5)</div>
<div class="page">
  <p class="kicker">Thank you for joining us</p>
  <h1>Enjoyed ${esc(event)}?</h1>
  <div class="stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
  <div class="qr">${svg}</div>
  <p><strong>Scan to leave a quick Google review</strong></p>
  <p class="small">Tap a few options, we draft it, you check the words and post. Takes about 30 seconds.</p>
</div>
</body></html>`;
await writeFile(path.join(outDir, "poster.html"), poster);

console.log("Created in " + outDir + ":\n  qr.png\n  qr.svg\n  poster.html (open in a browser and print, A5)");
console.log("QR points to: " + url);
