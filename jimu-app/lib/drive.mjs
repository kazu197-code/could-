// Google Apps Script（gas/Code.gs）を経由してドライブを読む・保存する
export function driveConfigured() {
  return Boolean(process.env.GAS_URL && process.env.GAS_TOKEN);
}

export async function callDrive(action, payload) {
  const url = process.env.GAS_URL;
  const token = process.env.GAS_TOKEN;
  if (!url || !token) throw new DriveError("ドライブ連携がまだ設定されていません（GAS_URL / GAS_TOKEN）。");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token, action, ...payload }),
    redirect: "follow",
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new DriveError("ドライブ連携から正しい返事がありませんでした。Apps Script のデプロイ設定（全員がアクセス可）を確認してください。");
  }
  if (data.error === "unauthorized") throw new DriveError("ドライブ連携の合言葉が一致しません。Apps Script の TOKEN を確認してください。");
  if (data.error) throw new DriveError(`ドライブ連携でエラーが起きました：${data.error}`);
  return data;
}

export class DriveError extends Error {}
