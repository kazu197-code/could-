import { checkPasscode, json } from "../../lib/auth.mjs";
import { driveConfigured } from "../../lib/drive.mjs";

// アプリの画面が、ドライブ連携の有無と合言葉の正しさを確かめるために使う
export default async (req) => {
  const denied = checkPasscode(req);
  if (denied) return denied;
  return json(200, { drive: driveConfigured() });
};

export const config = { path: "/api/status" };
