export type WechatCallbackResult =
  | { code: string }
  | { error: "cancelled" | "invalid_callback" };

export function parseWechatCallback(search: string): WechatCallbackResult {
  const params = new URLSearchParams(search);
  const code = params.get("code");
  if (code && !params.get("error")) return { code };
  return {
    error: params.get("error") === "cancelled" ? "cancelled" : "invalid_callback",
  };
}