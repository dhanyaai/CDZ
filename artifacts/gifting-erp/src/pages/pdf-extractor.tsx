import { useState, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { Upload, Download, FileImage, X, ImageDown, Loader2, Archive, FileSpreadsheet, Table2, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCreateProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ExtractedImage {
  page: number;
  dataUrl: string;
  blob: Blob;
  filename: string;
}

interface SheetRow {
  [col: string]: string;
}

interface ExtractedSheet {
  page: number;
  name: string;
  rows: SheetRow[];
}

type Format = "png" | "jpg";
type Mode = "images" | "excel";

interface CellData { text: string; x: number; }

interface PdfTextItem {
  str: string;
  transform: number[];
}

async function getImagePositions(page: pdfjsLib.PDFPageProxy): Promise<{ x: number; y: number }[]> {
  const opList = await page.getOperatorList();
  const positions: { x: number; y: number }[] = [];
  const ctmStack: number[][] = [];
  let ctm = [1, 0, 0, 1, 0, 0];

  const IMAGE_OPS = new Set([
    pdfjsLib.OPS.paintImageXObject,
    pdfjsLib.OPS.paintXObject,
    pdfjsLib.OPS.paintInlineImageXObject,
    pdfjsLib.OPS.paintImageMaskXObject,
  ]);

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i] as number[];
    if (fn === pdfjsLib.OPS.save) {
      ctmStack.push([...ctm]);
    } else if (fn === pdfjsLib.OPS.restore) {
      ctm = ctmStack.pop() ?? [1, 0, 0, 1, 0, 0];
    } else if (fn === pdfjsLib.OPS.transform) {
      const [a, b, c, d, e, f] = args;
      const [ca, cb, cc, cd, ce, cf] = ctm;
      ctm = [
        ca * a + cc * b, cb * a + cd * b,
        ca * c + cc * d, cb * c + cd * d,
        ca * e + cc * f + ce, cb * e + cd * f + cf,
      ];
    } else if (IMAGE_OPS.has(fn)) {
      positions.push({ x: ctm[4], y: ctm[5] });
    }
  }
  return positions;
}

function groupTextByRows(items: PdfTextItem[], yTolerance = 5): { y: number; cells: CellData[] }[] {
  if (!items.length) return [];

  // Sort top-to-bottom (Y descending in PDF coords), left-to-right within a row
  const sorted = [...items].sort((a, b) => {
    const ay = a.transform[5];
    const by = b.transform[5];
    if (Math.abs(ay - by) > yTolerance) return by - ay;
    return a.transform[4] - b.transform[4];
  });

  // Step 1: group into rows by Y proximity
  const rows: { y: number; items: PdfTextItem[] }[] = [];
  for (const item of sorted) {
    const y = item.transform[5];
    const existing = rows.find((r) => Math.abs(r.y - y) <= yTolerance);
    if (existing) {
      existing.items.push(item);
    } else {
      rows.push({ y, items: [item] });
    }
  }

  // Step 2: merge nearby items into cells, track starting X of each cell for image insertion
  return rows.map((row) => {
    const lineItems = [...row.items].sort((a, b) => a.transform[4] - b.transform[4]);
    const cells: CellData[] = [];
    let currentText = "";
    let cellStartX = 0;
    let prevRight = -Infinity;

    for (const item of lineItems) {
      const x = item.transform[4];
      const fontSize = Math.abs(item.transform[0]) || 10;
      const estimatedWidth = item.str.length * fontSize * 0.55;
      const colGapThreshold = fontSize * 2;
      const gap = x - prevRight;

      if (currentText === "") {
        currentText = item.str;
        cellStartX = x;
      } else if (gap > colGapThreshold) {
        cells.push({ text: currentText.trim(), x: cellStartX });
        currentText = item.str;
        cellStartX = x;
      } else {
        const spacer = gap > 0.5 ? " " : "";
        currentText += spacer + item.str;
      }
      prevRight = x + estimatedWidth;
    }
    if (currentText.trim()) cells.push({ text: currentText.trim(), x: cellStartX });
    return { y: row.y, cells };
  }).filter((row) => row.cells.length > 0 && row.cells.some((c) => c.text.trim() !== ""));
}

const ITEM_CATEGORIES = [
  "Office Gifts","Stationery","Drinkware","Apparel","Bags & Accessories",
  "Electronics","Lifestyle","Wellness","Festive","Eco-Friendly","Other",
];

interface CreateItemForm {
  name: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  imageUrl: string;
}

const EMPTY_ITEM: CreateItemForm = { name: "", category: "", costPrice: "", sellingPrice: "", imageUrl: "" };

export function PdfExtractor() {
  const [mode, setMode] = useState<Mode>("images");

  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [format, setFormat] = useState<Format>("png");
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(2);

  const [sheets, setSheets] = useState<ExtractedSheet[]>([]);
  const [previewSheet, setPreviewSheet] = useState<number>(0);
  const [exporting, setExporting] = useState(false);

  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pdfName, setPdfName] = useState("");
  const [zipping, setZipping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const excelFileRef = useRef<HTMLInputElement>(null);

  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createItemForm, setCreateItemForm] = useState<CreateItemForm>(EMPTY_ITEM);
  const [createItemUploading, setCreateItemUploading] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setCreateItemOpen(false);
        setCreateItemForm(EMPTY_ITEM);
        toast({ title: "Item created", description: "Product added to your catalogue." });
      },
      onError: () => toast({ title: "Failed to create item", variant: "destructive" }),
    },
  });

  const resizeToThumbnail = (dataUrl: string, maxWidth = 600, jpegQuality = 0.72): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const w = Math.round(image.width * scale);
        const h = Math.round(image.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(image, 0, 0, w, h);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Resize failed")), "image/jpeg", jpegQuality);
      };
      image.onerror = reject;
      image.src = dataUrl;
    });

  const handleCreateItem = async (img: ExtractedImage) => {
    setCreateItemForm(EMPTY_ITEM);
    setCreateItemUploading(true);
    setCreateItemOpen(true);
    try {
      const thumb = await resizeToThumbnail(img.dataUrl);
      const fd = new FormData();
      fd.append("image", thumb, img.filename.replace(/\.(png|jpg)$/i, ".jpg"));
      const res = await fetch("/api/v1/uploads/image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      setCreateItemForm(f => ({ ...f, imageUrl: url }));
    } catch {
      toast({ title: "Image upload failed", description: "You can still create the item without an image.", variant: "destructive" });
    } finally {
      setCreateItemUploading(false);
    }
  };

  const submitCreateItem = () => {
    if (!createItemForm.name.trim()) { toast({ title: "Item name is required", variant: "destructive" }); return; }
    if (!createItemForm.category) { toast({ title: "Category is required", variant: "destructive" }); return; }
    createProduct.mutate({
      data: {
        name: createItemForm.name.trim(),
        category: createItemForm.category,
        costPrice: Number(createItemForm.costPrice) || 0,
        sellingPrice: Number(createItemForm.sellingPrice) || 0,
        imageUrl: createItemForm.imageUrl || undefined,
        stockLevel: 0,
        lowStockThreshold: 10,
      },
    });
  };

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

  const extractExcel = useCallback(async (file: File) => {
    setSheets([]);
    setProgress(0);
    setTotal(0);
    setProcessing(true);
    setPreviewSheet(0);
    setPdfName(file.name.replace(/\.pdf$/i, ""));
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;
      setTotal(pageCount);
      const results: ExtractedSheet[] = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const [content, imagePositions] = await Promise.all([
          page.getTextContent(),
          getImagePositions(page),
        ]);
        const textItems = (content.items as unknown[]).filter(
          (item): item is PdfTextItem => typeof (item as PdfTextItem).str === "string" && (item as PdfTextItem).str !== "",
        );
        const textRows = groupTextByRows(textItems);

        // Deduplicate image positions (same image can fire multiple paint ops)
        const seenImgKeys = new Set<string>();
        const uniqueImages = imagePositions.filter(({ x, y }) => {
          const key = `${Math.round(x / 10)},${Math.round(y / 10)}`;
          if (seenImgKeys.has(key)) return false;
          seenImgKeys.add(key);
          return true;
        });

        // Insert [Photo] placeholder into the row whose Y is closest to the image Y
        for (const img of uniqueImages) {
          let closest: (typeof textRows)[0] | null = null;
          let minDist = 30; // only match if within 30pt
          for (const row of textRows) {
            const dist = Math.abs(row.y - img.y);
            if (dist < minDist) { minDist = dist; closest = row; }
          }
          if (closest) {
            // Only insert if no existing cell is at a similar X (avoid duplicates)
            const alreadyThere = closest.cells.some((c) => Math.abs(c.x - img.x) < 20);
            if (!alreadyThere) {
              closest.cells.push({ text: "[Photo]", x: img.x });
              closest.cells.sort((a, b) => a.x - b.x);
            }
          }
        }

        const maxCols = Math.max(0, ...textRows.map((r) => r.cells.length));
        const rows: SheetRow[] = textRows.map(({ cells }) => {
          const row: SheetRow = {};
          for (let c = 0; c < maxCols; c++) {
            row[String.fromCharCode(65 + c)] = cells[c]?.text ?? "";
          }
          return row;
        });
        const name = `Page ${i}`;
        results.push({ page: i, name, rows });
        setProgress(i);
        setSheets([...results]);
      }
    } finally {
      setProcessing(false);
    }
  }, []);

  const onFile = (file: File) => {
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) return;
    if (mode === "images") extractImages(file);
    else extractExcel(file);
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
      for (const img of images) folder.file(img.filename, img.blob);
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

  const downloadExcel = async () => {
    if (!sheets.length) return;
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      for (const sheet of sheets) {
        if (!sheet.rows.length) {
          const ws = XLSX.utils.aoa_to_sheet([["(No text content on this page)"]]);
          XLSX.utils.book_append_sheet(wb, ws, sheet.name);
          continue;
        }
        const maxCols = Math.max(...sheet.rows.map((r) => Object.keys(r).length));
        const aoa: string[][] = sheet.rows.map((row) =>
          Array.from({ length: maxCols }, (_, i) => row[String.fromCharCode(65 + i)] ?? ""),
        );
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      }
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfName || "pdf-data"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const reset = () => {
    setImages([]);
    setSheets([]);
    setProgress(0);
    setTotal(0);
    setPdfName("");
    if (fileRef.current) fileRef.current.value = "";
    if (excelFileRef.current) excelFileRef.current.value = "";
  };

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  const hasResults = mode === "images" ? images.length > 0 : sheets.length > 0;
  const activeSheet = sheets[previewSheet];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileImage className="text-primary" size={26} />
            PDF Extractor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Extract pages as images or export text content to Excel
          </p>
        </div>
        {hasResults && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-1">
            <X size={14} /> Clear
          </Button>
        )}
      </div>

      {/* Mode switcher */}
      <div className="flex rounded-xl overflow-hidden border border-border w-fit">
        <button
          onClick={() => { reset(); setMode("images"); }}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors",
            mode === "images"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          <FileImage size={15} /> Extract Images
        </button>
        <button
          onClick={() => { reset(); setMode("excel"); }}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors",
            mode === "excel"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          <FileSpreadsheet size={15} /> PDF to Excel
        </button>
      </div>

      {/* Settings bar — images mode only */}
      {mode === "images" && (
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
                type="range" min={0.5} max={1} step={0.05} value={quality}
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
              <Button size="sm" onClick={downloadAll} disabled={zipping || processing} className="gap-1.5">
                {zipping ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                {zipping ? "Zipping…" : "Download All (.zip)"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Excel mode toolbar */}
      {mode === "excel" && sheets.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/40 rounded-xl border border-border">
          <Badge variant="secondary">{sheets.length} page{sheets.length !== 1 ? "s" : ""} extracted</Badge>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" onClick={downloadExcel} disabled={exporting || processing} className="gap-1.5">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              {exporting ? "Exporting…" : "Download .xlsx"}
            </Button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      {!hasResults && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !processing && (mode === "images" ? fileRef : excelFileRef).current?.click()}
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
            type="file" accept=".pdf,application/pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <input
            ref={excelFileRef}
            type="file" accept=".pdf,application/pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {processing ? (
            <Loader2 size={48} className="text-primary animate-spin" />
          ) : (
            <Upload size={48} className={cn("transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
          )}
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {processing
                ? mode === "images"
                  ? `Rendering page ${progress} of ${total}…`
                  : `Extracting text from page ${progress} of ${total}…`
                : "Drop a PDF here or click to browse"}
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

      {/* Progress while processing */}
      {processing && hasResults && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {mode === "images"
                ? `Rendering page ${progress} of ${total}…`
                : `Extracting text from page ${progress} of ${total}…`}
            </span>
            <span>{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      )}

      {/* Image grid */}
      {mode === "images" && images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => (
            <div
              key={img.page}
              className="group relative rounded-xl border border-border overflow-hidden bg-muted/20 shadow-sm hover:shadow-md transition-shadow"
            >
              <img src={img.dataUrl} alt={`Page ${img.page}`} className="w-full object-contain block" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => downloadOne(img)}
                  className="bg-white text-gray-900 rounded-lg px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <ImageDown size={13} /> Download
                </button>
                <button
                  onClick={() => handleCreateItem(img)}
                  className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus size={13} /> Create Item
                </button>
              </div>
              <div className="px-2 py-1.5 flex items-center justify-between bg-background border-t border-border">
                <span className="text-xs text-muted-foreground font-medium">Page {img.page}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCreateItem(img)}
                    className="text-primary hover:text-primary/80 transition-colors"
                    title="Create product from this page"
                  >
                    <Package size={13} />
                  </button>
                  <button
                    onClick={() => downloadOne(img)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={`Download ${img.filename}`}
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
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

      {/* Excel preview */}
      {mode === "excel" && sheets.length > 0 && (
        <div className="space-y-4">
          {/* Page tabs */}
          <div className="flex gap-1 flex-wrap">
            {sheets.map((s, idx) => (
              <button
                key={s.page}
                onClick={() => setPreviewSheet(idx)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                  idx === previewSheet
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted",
                )}
              >
                {s.name}
              </button>
            ))}
            {processing &&
              Array.from({ length: total - sheets.length }).map((_, i) => (
                <div key={`tab-skeleton-${i}`} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 animate-pulse w-14" />
              ))}
          </div>

          {/* Table preview */}
          {activeSheet && (
            <div className="rounded-xl border border-border overflow-auto max-h-[500px]">
              {activeSheet.rows.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <Table2 size={32} className="text-muted-foreground/50" />
                  No text content detected on this page
                </div>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {activeSheet.rows.map((row, ri) => {
                      const cols = Object.keys(row);
                      return (
                        <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="px-2 py-1 text-muted-foreground border-r border-border font-mono select-none w-8 text-right">{ri + 1}</td>
                          {cols.map((col) => (
                            <td key={col} className="px-3 py-1.5 border-r border-border last:border-r-0 whitespace-nowrap">
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Re-upload link */}
      {hasResults && !processing && (
        <div className="flex justify-center">
          <button
            onClick={() => { reset(); setTimeout(() => (mode === "images" ? fileRef : excelFileRef).current?.click(), 50); }}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            {mode === "images" ? "Extract from another PDF" : "Convert another PDF"}
          </button>
        </div>
      )}

      {/* Create Item dialog */}
      <Dialog open={createItemOpen} onOpenChange={(open) => { if (!open && !createProduct.isPending) { setCreateItemOpen(false); setCreateItemForm(EMPTY_ITEM); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package size={18} className="text-primary" /> Create Product from Page
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image preview */}
            {(createItemUploading || createItemForm.imageUrl) && (
              <div className="flex justify-center">
                {createItemUploading ? (
                  <div className="w-32 h-32 rounded-lg border border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                    <Loader2 size={20} className="animate-spin text-primary" />
                    Uploading image…
                  </div>
                ) : (
                  <img src={createItemForm.imageUrl} alt="Product" className="max-h-32 rounded-lg border border-border object-contain" />
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ci-name" className="text-sm">Item Name <span className="text-destructive">*</span></Label>
              <Input
                id="ci-name"
                placeholder="e.g. Leather Laptop Bag"
                value={createItemForm.name}
                onChange={e => setCreateItemForm(f => ({ ...f, name: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Category <span className="text-destructive">*</span></Label>
              <Select
                value={createItemForm.category}
                onValueChange={v => setCreateItemForm(f => ({ ...f, category: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {ITEM_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ci-cost" className="text-sm">Cost Price (₹)</Label>
                <Input
                  id="ci-cost"
                  type="number" min={0} step={0.01}
                  placeholder="0.00"
                  value={createItemForm.costPrice}
                  onChange={e => setCreateItemForm(f => ({ ...f, costPrice: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ci-sell" className="text-sm">Selling Price (₹)</Label>
                <Input
                  id="ci-sell"
                  type="number" min={0} step={0.01}
                  placeholder="0.00"
                  value={createItemForm.sellingPrice}
                  onChange={e => setCreateItemForm(f => ({ ...f, sellingPrice: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              You can fill in additional details (SKU, HSN, vendors, stock) from the Products page after creation.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setCreateItemOpen(false); setCreateItemForm(EMPTY_ITEM); }} disabled={createProduct.isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitCreateItem} disabled={createProduct.isPending || createItemUploading} className="gap-1.5">
              {createProduct.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {createProduct.isPending ? "Creating…" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
