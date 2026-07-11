import { useState, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";
import { Upload, Download, FileImage, X, ImageDown, Loader2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ExtractedImage {
  page: number;
  dataUrl: string;
  blob: Blob;
  filename: string;
}

type Format = "png" | "jpg";

export function PdfExtractor() {
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [format, setFormat] = useState<Format>("png");
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(2);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pdfName, setPdfName] = useState("");
  const [zipping, setZipping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const extractImages = useCallback(
    async (file: File) => {
      setImages([]);
      setProgress(0);
      setTotal(0);
      setProcessing(true);
      setPdfName(file.name.replace(/\.pdf$/i, ""));

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = pdf.numPages;
        setTotal(pageCount);

        const results: ExtractedImage[] = [];

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;

          const mime = format === "jpg" ? "image/jpeg" : "image/png";
          const ext = format === "jpg" ? "jpg" : "png";
          const dataUrl = canvas.toDataURL(mime, quality);
          const blob = await new Promise<Blob>((res) =>
            canvas.toBlob((b) => res(b!), mime, quality),
          );
          const filename = `page-${String(i).padStart(3, "0")}.${ext}`;
          results.push({ page: i, dataUrl, blob, filename });
          setProgress(i);
          setImages([...results]);
        }
      } finally {
        setProcessing(false);
      }
    },
    [format, quality, scale],
  );

  const onFile = (file: File) => {
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) return;
    extractImages(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const downloadOne = (img: ExtractedImage) => {
    const a = document.createElement("a");
    a.href = img.dataUrl;
    a.download = img.filename;
    a.click();
  };

  const downloadAll = async () => {
    if (!images.length) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(pdfName || "pdf-images")!;
      for (const img of images) {
        folder.file(img.filename, img.blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfName || "pdf-images"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  };

  const reset = () => {
    setImages([]);
    setProgress(0);
    setTotal(0);
    setPdfName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileImage className="text-primary" size={26} />
            PDF Image Extractor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload a PDF to extract every page as a high-quality image
          </p>
        </div>
        {images.length > 0 && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-1">
            <X size={14} /> Clear
          </Button>
        )}
      </div>

      {/* Settings bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Format</span>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["png", "jpg"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  format === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {format === "jpg" && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Quality</span>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground w-8">{Math.round(quality * 100)}%</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Resolution</span>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {[1, 1.5, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors",
                  scale === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {images.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary">{images.length} page{images.length !== 1 ? "s" : ""}</Badge>
            <Button
              size="sm"
              onClick={downloadAll}
              disabled={zipping || processing}
              className="gap-1.5"
            >
              {zipping ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Archive size={14} />
              )}
              {zipping ? "Zipping…" : "Download All (.zip)"}
            </Button>
          </div>
        )}
      </div>

      {/* Drop zone — only show when no images yet */}
      {images.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !processing && fileRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            processing && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {processing ? (
            <Loader2 size={48} className="text-primary animate-spin" />
          ) : (
            <Upload size={48} className={cn("transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
          )}
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {processing ? `Extracting page ${progress} of ${total}…` : "Drop a PDF here or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {processing ? "" : "All processing happens in your browser — nothing is uploaded"}
            </p>
          </div>
          {processing && (
            <div className="w-64">
              <Progress value={percent} className="h-2" />
              <p className="text-xs text-center text-muted-foreground mt-1">{percent}%</p>
            </div>
          )}
        </div>
      )}

      {/* Progress bar while processing with images already showing */}
      {processing && images.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Extracting page {progress} of {total}…</span>
            <span>{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => (
            <div
              key={img.page}
              className="group relative rounded-xl border border-border overflow-hidden bg-muted/20 shadow-sm hover:shadow-md transition-shadow"
            >
              <img
                src={img.dataUrl}
                alt={`Page ${img.page}`}
                className="w-full object-contain block"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => downloadOne(img)}
                  className="bg-white text-gray-900 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <ImageDown size={13} />
                  Download
                </button>
              </div>
              <div className="px-2 py-1.5 flex items-center justify-between bg-background border-t border-border">
                <span className="text-xs text-muted-foreground font-medium">Page {img.page}</span>
                <button
                  onClick={() => downloadOne(img)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={`Download ${img.filename}`}
                >
                  <Download size={13} />
                </button>
              </div>
            </div>
          ))}

          {/* Skeleton cards while still processing */}
          {processing &&
            Array.from({ length: total - images.length }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="rounded-xl border border-border overflow-hidden bg-muted/20 animate-pulse"
                style={{ aspectRatio: "0.707" }}
              >
                <div className="w-full h-full bg-muted/50" />
              </div>
            ))}
        </div>
      )}

      {/* Empty state after upload zone (re-upload prompt) */}
      {images.length > 0 && !processing && (
        <div className="flex justify-center">
          <button
            onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 50); }}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Extract from another PDF
          </button>
        </div>
      )}
    </div>
  );
}
