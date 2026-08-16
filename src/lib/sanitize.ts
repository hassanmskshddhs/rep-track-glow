// Shared input sanitation helpers (used on both client and server).

export const MAX_TEXT_CHARS = 6000;
export const MAX_CONTEXT_CHARS = 4000;
export const MAX_ATTACHMENTS = 4;
export const MAX_MESSAGES = 20;
// data: URLs are base64 — cap the whole payload well under worker limits.
export const MAX_ATTACHMENT_CHARS = 26_000_000;

/** Strip control characters / zero-width chars and clamp length. */
export function sanitizeText(value: unknown, max = MAX_TEXT_CHARS): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200F\u2028\u2029\u202A-\u202E\uFEFF]/g, "")
    .slice(0, max)
    .trim();
}

/** Only allow inline base64 media the user just picked — no remote/JS URLs. */
export function isSafeMediaDataUrl(url: unknown, kind: "image" | "video"): url is string {
  if (typeof url !== "string" || url.length > MAX_ATTACHMENT_CHARS) return false;
  const re =
    kind === "image"
      ? /^data:image\/(png|jpe?g|webp|gif|heic|heif);base64,[A-Za-z0-9+/=\s]+$/
      : /^data:video\/(mp4|webm|quicktime|ogg);base64,[A-Za-z0-9+/=\s]+$/;
  return re.test(url);
}
