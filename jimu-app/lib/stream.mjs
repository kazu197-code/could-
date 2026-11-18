// 時間のかかる処理のあいだ、数秒おきに空白を送って接続を保ち、最後に JSON を送る。
// （応答の最初の1バイトが30秒以内に届かないと、Netlify が 504 で打ち切るため）
// 返す JSON はすでに 200 で送り始めているので、エラーは本文の { error } で伝える。
export function streamJson(work) {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode(" "));
      const timer = setInterval(() => controller.enqueue(enc.encode(" ")), 4000);
      let result;
      try {
        result = await work();
      } catch (err) {
        result = { error: "予期しないエラーが起きました。もう一度お試しください。" };
        console.error(err);
      }
      clearInterval(timer);
      controller.enqueue(enc.encode(JSON.stringify(result)));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}

// errorResponse() が返す Response を、本文の JSON に直す
export async function asBody(response) {
  try {
    return await response.json();
  } catch {
    return { error: "予期しないエラーが起きました。" };
  }
}
