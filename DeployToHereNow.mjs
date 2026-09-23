import fs from "fs";
import path from "path";
import crypto from "crypto";

const [, , slug, dir = "dist"] = process.argv;
const KEY = process.env.HERENOW_API_KEY;

const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".map": "application/json",
};

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

const files = walk(dir).map((abs) => {
  const buf = fs.readFileSync(abs);
  return {
    abs,
    path: path.relative(dir, abs).split(path.sep).join("/"),
    size: buf.length,
    contentType: types[path.extname(abs).toLowerCase()] || "application/octet-stream",
    hash: crypto.createHash("sha256").update(buf).digest("hex"),
  };
});

const H = {
  Authorization: `Bearer ${KEY}`,
  "content-type": "application/json",
  "X-HereNow-Client": "custom/update-script",
};

// 1. Request the update
const r = await fetch(`https://here.now/api/v1/publish/${slug}`, {
  method: "PUT",
  headers: H,
  body: JSON.stringify({ files: files.map(({ abs, ...meta }) => meta) }),
});
const j = await r.json();
if (!r.ok) { console.error(j); process.exit(1); }

// 2. Upload changed files (unchanged ones are skipped automatically via hash)
for (const u of j.upload.uploads) {
  const f = files.find((x) => x.path === u.path);
  const res = await fetch(u.url, { method: u.method, headers: u.headers, body: fs.readFileSync(f.abs) });
  if (!res.ok) { console.error("Upload failed:", u.path, res.status); process.exit(1); }
}

// 3. Finalize
const fin = await fetch(j.upload.finalizeUrl, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ versionId: j.upload.versionId }),
});
console.log(await fin.json());