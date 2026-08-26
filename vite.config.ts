import { sites } from "@openai/sites-vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";
import rawHostingConfig from "./.openai/hosting.json" with { type: "json" };

interface HostingConfig {
  d1: null | { database_name: string };
  r2: null | { bucket_name: string };
}

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID = "00000000-0000-4000-8000-000000000000";
const { d1, r2 } = rawHostingConfig as HostingConfig;
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "vinext/server/app-router-entry",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [{ binding: "D1", database_name: d1.database_name, database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID }]
    : [],
  r2_buckets: r2 ? [{ binding: "R2", bucket_name: r2.bucket_name }] : [],
};

export default defineConfig(async () => {
  if (process.env.VITEST) return {};
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
