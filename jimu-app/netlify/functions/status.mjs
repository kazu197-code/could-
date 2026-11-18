import { checkPasscode, json } from "../../lib/auth.mjs";
import { driveConfigured } from "../../lib/drive.mjs";

// アプリの画面が、合言葉の正しさと各設定の有無を確かめるために使う（値そのものは返さない）
export default async (req) => {
  const denied = checkPasscode(req);
  if (denied) return denied;
  return json(200, {
    drive: driveConfigured(),
    has: {
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      GAS_URL: Boolean(process.env.GAS_URL),
      GAS_TOKEN: Boolean(process.env.GAS_TOKEN),
    },
  });
};

export const config = { path: "/api/status" };
