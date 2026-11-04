// Turns a full-length workout video into one compact "contact sheet" image
// (evenly spaced keyframes with timestamps) so any size/length clip can be
// form-checked without uploading the raw video.

export const FORM_CHECK_PREFIX = "Form check";

function seek(video: HTMLVideoElement, t: number) {
  return new Promise<void>((res, rej) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      res();
    };
    video.addEventListener("seeked", done);
    video.addEventListener("error", () => rej(new Error("seek failed")), { once: true });
    video.currentTime = t;
  });
}

export async function videoToContactSheet(
  file: File,
): Promise<{ url: string; frames: number; duration: number }> {
  const src = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = src;
  try {
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error("unsupported video"));
    });
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration || !video.videoWidth) throw new Error("unreadable video");

    const frames = duration < 4 ? 6 : duration < 15 ? 9 : 12;
    const cols = 3;
    const rows = Math.ceil(frames / cols);
    const cellW = 360;
    const cellH = Math.round((cellW * video.videoHeight) / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = cellW * cols;
    canvas.height = cellH * rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < frames; i++) {
      const t = Math.min(duration - 0.05, (duration * (i + 0.5)) / frames);
      await seek(video, t);
      const x = (i % cols) * cellW;
      const y = Math.floor(i / cols) * cellH;
      ctx.drawImage(video, x, y, cellW, cellH);
      const label = `#${i + 1}  ${t.toFixed(1)}s`;
      ctx.font = "bold 20px sans-serif";
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(x + 6, y + 6, w, 30);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 14, y + 28);
    }
    return { url: canvas.toDataURL("image/jpeg", 0.82), frames, duration };
  } finally {
    URL.revokeObjectURL(src);
    video.removeAttribute("src");
    video.load();
  }
}
