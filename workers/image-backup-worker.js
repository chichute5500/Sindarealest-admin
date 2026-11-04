// Independent scheduled Worker: Pages Functions do not run Cron Triggers.
// Deployment is intentionally separate from the storefront/production Pages app.
import { runImageBackup } from "../functions/_lib/image-backup.js";

export default {
  // No public, authenticated or administrative HTTP backup entrypoint.
  async fetch() {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  },
  async scheduled(_controller, env) {
    const result = await runImageBackup(env);
    // Never log object paths, customer details, tokens or bucket contents.
    console.log("SinDarealest image backup:", JSON.stringify({
      skipped: result.skipped || null,
      busy: !!result.busy,
      phase: result.state?.phase || "idle",
      scanned: result.state?.scanned || 0,
      copied: result.state?.copied || 0,
    }));
  },
};
