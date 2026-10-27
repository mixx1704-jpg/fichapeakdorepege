import type { NextConfig } from "next";

const isGitHubPagesBuild = process.env.NEXT_OUTPUT_MODE === "static";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const basePath = isGitHubPagesBuild && repositoryName ? `/${repositoryName}` : "";

const nextConfig: NextConfig = {
  // Mantém a compilação do host atual intacta e habilita o export estático
  // somente no workflow do GitHub Pages.
  ...(isGitHubPagesBuild
    ? {
        output: "export",
        trailingSlash: true,
        basePath,
        assetPrefix: basePath,
        images: { unoptimized: true },
        // Validate the static application without the alternate Cloudflare host.
        typescript: { tsconfigPath: "tsconfig.pages.json" },
      }
    : {}),
};

export default nextConfig;
