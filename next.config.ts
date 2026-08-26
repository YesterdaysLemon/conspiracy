import type { NextConfig } from "next";
import { WEBMCP_ORIGIN_TRIAL_TOKEN } from "./src/webmcp/originTrial";

const nextConfig: NextConfig = {
  async headers() {
    const originTrialHeader = [{ key: "Origin-Trial", value: WEBMCP_ORIGIN_TRIAL_TOKEN }];

    return [
      {
        source: "/",
        headers: originTrialHeader,
      },
      {
        source: "/:path*",
        headers: originTrialHeader,
      },
    ];
  },
};

export default nextConfig;
