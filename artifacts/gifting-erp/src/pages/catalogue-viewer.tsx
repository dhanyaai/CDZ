import { useEffect, useState } from "react";

type Product = {
  id: number; name: string; category: string;
  sellingPrice: number; imageUrl: string | null; description: string | null;
};

type CatalogueData = {
  token: string; companyName: string; opportunityTitle: string;
  clientName: string | null; catalogueType: string;
  expiresAt: string | null; createdAt: string;
  products: Product[];
};

function Watermark({ text }: { text: string }) {
  const items = [];
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 7; col++) {
      items.push(
        <div key={`${row}-${col}`} style={{
          position: "absolute",
          left: `${col * 220 - 80}px`,
          top: `${row * 110 - 40}px`,
          transform: "rotate(-35deg)",
          fontSize: "15px",
          fontWeight: 700,
          whiteSpace: "nowrap",
          color: "#000",
          letterSpacing: "3px",
          userSelect: "none",
        }}>
          {text.toUpperCase()}
        </div>
      );
    }
  }
  return (
    <div style={{
      position: "fixed", inset: 0, opacity: 0.055,
      pointerEvents: "none", zIndex: 50, overflow: "hidden",
    }}>
      {items}
    </div>
  );
}

export function CatalogueViewer({ token }: { token: string }) {
  const [data, setData] = useState<CatalogueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    fetch(`${base}/api/v1/public/catalogue/${token}`)
      .then(r => r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Error")))
      .then((d: CatalogueData) => setData(d))
      .catch((e: string) => setError(typeof e === "string" ? e : "Failed to load catalogue"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const prevent = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@media print { body { display: none !important; } }`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading catalogue…</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">📭</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Catalogue Unavailable</h2>
        <p className="text-gray-500 text-sm">{error ?? "This catalogue link is invalid or has expired."}</p>
      </div>
    </div>
  );

  const expiryDate = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ userSelect: "none" }}
      onContextMenu={e => e.preventDefault()}
    >
      <Watermark text={data.companyName} />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-8 relative">
        <div className="max-w-5xl mx-auto">
          <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-1">{data.companyName}</p>
          <h1 className="text-2xl font-bold mb-1">{data.catalogueType}</h1>
          <p className="text-blue-100 text-sm">{data.opportunityTitle}</p>
          {data.clientName && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
              Prepared exclusively for <strong className="ml-1">{data.clientName}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
        <p className="text-amber-700 text-xs text-center font-medium max-w-5xl mx-auto">
          🔒 This catalogue is confidential and prepared exclusively for the recipient. Sharing, copying or reproducing the content is not permitted.
          {expiryDate && <span className="ml-2 text-amber-600">· Valid until {expiryDate}</span>}
        </p>
      </div>

      {/* Product grid */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-sm text-gray-500 mb-6">{data.products.length} product{data.products.length !== 1 ? "s" : ""} in this catalogue</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {/* Image with overlay to block right-click save */}
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                {p.imageUrl ? (
                  <>
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                      style={{ pointerEvents: "none" }}
                    />
                    <div className="absolute inset-0" style={{ background: "transparent", zIndex: 1 }} />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🎁</div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-1 flex-1">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{p.category}</p>
                <h3 className="font-semibold text-gray-800 leading-snug">{p.name}</h3>
                {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-700">₹{p.sellingPrice.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-gray-400">per piece</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-6 py-4 mt-4">
        <p className="text-center text-xs text-gray-400 max-w-5xl mx-auto">
          © {new Date().getFullYear()} {data.companyName} · All rights reserved · This catalogue was generated by {data.companyName} ERP
        </p>
      </div>
    </div>
  );
}
