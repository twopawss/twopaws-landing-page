import path from "path";
import { spawnSync } from "child_process";

/**
 * Runs every post-build step in order with SSG_STRICT=true and stops at the
 * first failure, so `npm run build` cannot exit 0 with a dist/ that is missing
 * its prerendered shop pages. The chain used to be a `&&` list in package.json;
 * that still stopped on failure, but every step downgraded its own failures to
 * warnings unless SSG_STRICT was set, and nothing set it. Setting the variable
 * here (rather than inline in the npm script) keeps the command working on
 * Windows shells, which do not accept `VAR=value cmd`.
 *
 * REACT_SNAP_SKIP=true skips the react-snap step only. CI uses it when a
 * runner has no usable Chromium; the SSG pages and the dist check still run.
 */
const STEPS = [
  "generate-product-ssg.mjs",
  "generate-category-ssg.mjs",
  "generate-shop-ssg.mjs",
  "generate-download-ssg.mjs",
  "run-react-snap.mjs",
  "generate-sitemap.mjs",
  "generate-merchant-feed.mjs",
  "check-dist.mjs",
];

const skipReactSnap = String(process.env.REACT_SNAP_SKIP ?? "").toLowerCase() === "true";

for (const step of STEPS) {
  if (step === "run-react-snap.mjs" && skipReactSnap) {
    console.log("postbuild: REACT_SNAP_SKIP=true, skipping react-snap.");
    continue;
  }
  const script = path.join(process.cwd(), "scripts", step);
  console.log(`postbuild: ${step}`);
  const result = spawnSync(process.execPath, [script], {
    stdio: "inherit",
    env: { ...process.env, SSG_STRICT: "true" },
  });
  if (result.status !== 0) {
    console.error(`postbuild: ${step} failed (exit ${result.status ?? "signal"}).`);
    process.exit(result.status || 1);
  }
}
