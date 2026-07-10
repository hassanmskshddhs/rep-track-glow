import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type Props = {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
};

async function cropToDataUrl(
  imageSrc: string,
  area: Area,
  maxWidth = 800,
  quality = 0.82,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });

  const scale = Math.min(1, maxWidth / area.width);
  const outW = Math.round(area.width * scale);
  const outH = Math.round(area.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);

  // Prefer WebP where supported, fall back to JPEG. Target under ~150KB.
  const tryEncode = (type: string, q: number) => canvas.toDataURL(type, q);
  let url = tryEncode("image/webp", quality);
  if (!url.startsWith("data:image/webp")) url = tryEncode("image/jpeg", quality);
  // Rough size guard: shrink quality if the base64 payload is huge (~200KB).
  let q = quality;
  while (url.length > 210_000 && q > 0.5) {
    q -= 0.1;
    url = tryEncode(url.startsWith("data:image/webp") ? "image/webp" : "image/jpeg", q);
  }
  return url;
}

export function ImageCropperDialog({ open, imageSrc, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleConfirm = async () => {
    if (!imageSrc || !area) return;
    setBusy(true);
    try {
      const url = await cropToDataUrl(imageSrc, area);
      onConfirm(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Adjust cover</DialogTitle>
        </DialogHeader>
        <div
          className="relative mt-3 h-[360px] w-full bg-black"
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        >
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 10}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
              objectFit="cover"
              zoomWithScroll
            />
          )}
        </div>
        <div className="px-4 pt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Zoom</span>
            <span className="tabular-nums">{zoom.toFixed(2)}x</span>
          </div>
          <Slider
            min={1}
            max={4}
            step={0.01}
            value={[zoom]}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
          />
        </div>
        <DialogFooter className="gap-2 px-4 pb-4 pt-3 sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={busy || !area}>
            {busy ? "Saving…" : "Save cover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
