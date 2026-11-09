#!/usr/bin/env node
/**
 * Builds the Expo web app into `dist/` so it can be uploaded to Vercel.
 *
 * Why this exists: `expo export` copies required assets to
 * `dist/assets/node_modules/...` (this is how the @expo/vector-icons fonts are
 * emitted). Vercel silently drops any `node_modules` directory from an upload,
 * so those fonts were never deployed: every Ionicons/Material/Feather glyph fell
 * back to an empty box on the deployed site (the Google and Apple sign-in
 * buttons, the password eye toggle, …).
 *
 * The build therefore moves that directory to `dist/assets/vendor` and rewrites
 * the matching asset URLs inside the exported bundles, then writes the
 * `vercel.json` used for SPA routing.
 *
 * Usage: npm run web:build
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");

const run = (cmd, args) => {
  execFileSync(cmd, args, { cwd: root, stdio: "inherit" });
  return undefined;
};

console.log("▸ expo export (web)");
run(path.join(root, "node_modules/.bin/expo"), [
  "export",
  "--platform",
  "web",
  "--output-dir",
  "dist",
]);

// 1. node_modules/assets → vendor/assets so Vercel uploads them.
const nmDir = path.join(dist, "assets", "node_modules");
const vendorDir = path.join(dist, "assets", "vendor");
if (fs.existsSync(nmDir)) {
  fs.rmSync(vendorDir, { recursive: true, force: true });
  fs.renameSync(nmDir, vendorDir);
  console.log("▸ moved dist/assets/node_modules → dist/assets/vendor");
}

// 2. Point the bundles at the new location.
const FROM = "assets/node_modules/";
const TO = "assets/vendor/";
let rewritten = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(js|css|json|html)$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, "utf8");
    if (!source.includes(FROM)) continue;
    fs.writeFileSync(full, source.split(FROM).join(TO));
    rewritten += 1;
  }
};
walk(dist);

if (fs.existsSync(vendorDir)) {
  const stillReferenced = [];
  const scan = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (/\.(js|css|json|html)$/.test(entry.name) &&
        fs.readFileSync(full, "utf8").includes(FROM)) stillReferenced.push(full);
    }
  };
  scan(dist);
  if (stillReferenced.length) {
    console.error("✖ some bundles still reference assets/node_modules:");
    for (const f of stillReferenced) console.error("  " + path.relative(root, f));
    process.exit(1);
  }
  console.log(`▸ rewrote asset URLs in ${rewritten} file(s)`);
}

// 3. SPA routing: every path serves the app shell so deep links work.
fs.writeFileSync(
  path.join(dist, "vercel.json"),
  JSON.stringify(
    {
      version: 2,
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    },
    null,
    2
  ) + "\n"
);
console.log("▸ wrote dist/vercel.json (SPA rewrites)");
console.log(
  "\nDeploy with: npm run web:deploy\n" +
    "(or: npx vercel deploy --prod --yes dist --project tunisiska-services-web --scope alcatrazdevs-projects)"
);
