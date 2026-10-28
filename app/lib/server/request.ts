export class RequestBodyError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export async function readJsonBody(request: Request) {
  if (!request.body) throw new RequestBodyError("リクエスト本文がありません。");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new RequestBodyError("リクエストが大きすぎます。", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new RequestBodyError("JSONの形式が正しくありません。");
    }
  } finally {
    reader.releaseLock();
  }
}
