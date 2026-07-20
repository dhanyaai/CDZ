import { useEffect, useState } from "react";

type Product = {
  id: number; name: string; category: string;
  sellingPrice: number; imageUrl: string | null;
};

type CatalogueData = {
  token: string; companyName: string; opportunityTitle: string;
  clientName: string | null; catalogueType: string;
  opportunityId: number | null; clientId: number | null;
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
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  function toggleProduct(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function requestSamples() {
    if (!data || selected.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      const res = await fetch(`${base}/api/v1/public/catalogue/${token}/request-samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to submit");
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

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

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="text-6xl mb-5">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Sample Request Sent!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Your sample request for <strong>{selected.size}</strong> product{selected.size !== 1 ? "s" : ""} has been received.
          Our team will get in touch with you shortly.
        </p>
        <p className="text-xs text-gray-400">{data.companyName}</p>
      </div>
    </div>
  );

  const expiryDate = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <div
      className="min-h-screen bg-gray-50 pb-28"
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

      {/* Instruction bar */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
        <p className="text-blue-700 text-sm text-center font-medium max-w-5xl mx-auto">
          👇 Tap the products you'd like to receive as samples, then click <strong>Request Samples</strong> below.
        </p>
      </div>

      {/* Product grid */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-sm text-gray-500 mb-6">{data.products.length} product{data.products.length !== 1 ? "s" : ""} in this catalogue</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.products.map(p => {
            const isSelected = selected.has(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggleProduct(p.id)}
                className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 shadow-blue-100 shadow-md ring-2 ring-blue-200"
                    : "border-gray-100 hover:border-blue-200 hover:shadow"
                }`}
              >
                {/* Image with overlay */}
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

                  {/* Selection badge */}
                  <div className={`absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                    isSelected
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white/80 border-gray-300"
                  }`}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-1 flex-1">
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{p.category}</p>
                  <h3 className="font-semibold text-gray-800 leading-snug">{p.name}</h3>
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-700">₹{p.sellingPrice.toLocaleString("en-IN")}</span>
                    <span className="text-xs text-gray-400">per piece</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-6 py-4">
        <p className="text-center text-xs text-gray-400 max-w-5xl mx-auto">
          © {new Date().getFullYear()} {data.companyName} · All rights reserved · This catalogue was generated by {data.companyName} ERP
        </p>
      </div>

      {/* Sticky Request Samples bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-6 py-4 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            {selected.size === 0
              ? <span className="text-gray-400">Tap products to select them for sampling</span>
              : <span><strong className="text-blue-700">{selected.size}</strong> product{selected.size !== 1 ? "s" : ""} selected</span>
            }
          </div>
          <div className="flex items-center gap-3">
            {submitError && <p className="text-xs text-red-500">{submitError}</p>}
            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Clear
              </button>
            )}
            <button
              disabled={selected.size === 0 || submitting}
              onClick={requestSamples}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selected.size === 0 || submitting
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              }`}
            >
              {submitting ? "Submitting…" : `Request Samples (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
