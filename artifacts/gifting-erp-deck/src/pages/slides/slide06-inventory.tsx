export default function Slide06Inventory() {
  const products = [
    { name: "Branded Coffee Mug", sku: "MUG-001", stock: 340, min: 50, price: "₹240", status: "ok" },
    { name: "Eco Tote Bag", sku: "BAG-012", stock: 28, min: 50, price: "₹360", status: "low" },
    { name: "Custom Notebook A5", sku: "NB-003", stock: 0, min: 30, price: "₹180", status: "out" },
    { name: "Corporate Pen Set", sku: "PEN-002", stock: 820, min: 100, price: "₹30", status: "ok" },
    { name: "Gift Hamper Box", sku: "HAM-007", stock: 15, min: 25, price: "₹1,200", status: "low" },
  ];

  const statusStyle = (s: string) => s === "ok"
    ? { bg: "rgba(16,185,129,0.12)", color: "#10b981", label: "In Stock" }
    : s === "low"
      ? { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Low Stock" }
      : { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Out of Stock" };

  return (
    <div style={{ width: 1920, height: 1080, background: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "absolute", bottom: -200, right: -100, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)" }} />

      <div style={{ position: "absolute", top: 80, left: 100, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎁</div>
        <span style={{ color: "#475569", fontSize: 20, fontWeight: 500 }}>Customize Duniya ERP</span>
      </div>

      <div style={{ padding: "80px 100px 0", display: "flex", gap: 80 }}>
        {/* Left: content */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 100, padding: "8px 24px", marginBottom: 20 }}>
            <span style={{ color: "#34d399", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Feature · Inventory & Products</span>
          </div>
          <h2 style={{ margin: "0 0 16px", fontSize: 60, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Never run out of<br />stock again</h2>
          <p style={{ fontSize: 20, color: "#64748b", margin: "0 0 40px", lineHeight: 1.7 }}>
            Live stock levels, fill-rate progress bars, low-stock alerts, and a full movement log across all SKUs and categories.
          </p>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            {[
              { label: "Total SKUs", value: "247", color: "#3b82f6" },
              { label: "Stock Value", value: "₹18.4L", color: "#d97706" },
              { label: "Low Stock", value: "8 items", color: "#f59e0b" },
              { label: "Out of Stock", value: "3 items", color: "#ef4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 14, color: "#64748b" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {["📊 Fill-level visual bars per SKU", "🔔 Automated low-stock alerts", "📝 Movement log (in / out)", "🗂️ Category & product manager"].map(feat => (
              <div key={feat} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 17, color: "#94a3b8" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                {feat}
              </div>
            ))}
          </div>
        </div>

        {/* Right: table */}
        <div style={{ flex: 1.4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden", alignSelf: "flex-start" }}>
          <div style={{ padding: "24px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Stock Levels</div>
          {products.map((p, i) => {
            const st = statusStyle(p.status);
            const fillPct = p.stock === 0 ? 0 : Math.min(100, Math.round((p.stock / (p.min * 6)) * 100));
            const barColor = p.status === "ok" ? "#10b981" : p.status === "low" ? "#f59e0b" : "#ef4444";
            return (
              <div key={p.sku} style={{ padding: "18px 32px", borderBottom: i < products.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>{p.sku}</div>
                  </div>
                  <div style={{ fontSize: 15, color: "#94a3b8", width: 80, textAlign: "right" }}>{p.stock} units</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", width: 80, textAlign: "right" }}>{p.price}</div>
                  <div style={{ background: st.bg, color: st.color, borderRadius: 100, padding: "5px 14px", fontSize: 12, fontWeight: 700, width: 100, textAlign: "center" }}>{st.label}</div>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                  <div style={{ height: 6, width: `${fillPct}%`, background: barColor, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>6 / 10</div>
    </div>
  );
}
