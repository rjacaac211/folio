import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next writes AGENTS.md / CLAUDE.md into the project root on dev startup.
  // They are generated files, so they are not kept in version control.
  agentRules: false,
};

export default nextConfig;
