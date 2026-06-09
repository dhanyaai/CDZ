export default function Slide07Purchasing() {
  const vendors = [
    { name: "PrintWorks India", rate: 96, orders: 42, total: "₹8.4L", badge: "#10b981" },
    { name: "TextileCo Pvt.", rate: 88, orders: 28, total: "₹5.1L", badge: "#f59e0b" },
    { name: "PackagePro Ltd", rate: 72, orders: 15, total: "₹2.9L", badge: "#f97316" },
    { name: "MetalCraft Co.", rate: 94, orders: 11, total: "₹1.8L", badge: "#10b981" },
  ];

  return (
    <div style={{ width: 1920, height: 1080, background: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "absolute", top: -200, right: -200, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />

      <div style={{ position: "absolute", top: 80, left: 100, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎁</div>
        <span style={{ color: "#475569", fontSize: 20, fontWeight: 500 }}>Customize Duniya ERP</span>
      </div>

      <div style={{ padding: "80px 100px 0", display: "flex", gap: 80 }}>
        {/* Left */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 100, padding: "8px 24px", marginBottom: 20 }}>
            <span style={{ color: "#a78bfa", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Feature · Purchasing</span>
          </div>
          <h2 style={{ margin: "0 0 16px", fontSize: 60, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Vendor management &amp;<br />purchase orders</h2>
          <p style={{ fontSize: 20, color: "#64748b", margin: "0 0 40px", lineHeight: 1.7 }}>
            Raise POs with auto-filled cost prices, track delivery status, and monitor vendor fulfilment rates — all in one place.
          </p>

          {/* PO stats */}
          <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
            {[
              { label: "Total Spend", value: "₹18.2L", color: "#8b5cf6" },
              { label: "In Transit", value: "6 POs", color: "#d97706" },
              { label: "Received", value: "84 POs", color: "#10b981" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 14, color: "#64748b" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {["🏭 Multi-vendor PO management", "🔄 Auto-fill cost from product catalog", "⚠️ Overdue delivery highlighting", "📈 Vendor fulfilment rate tracking"].map(feat => (
              <div key={feat} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 17, color: "#94a3b8" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", flexShrink: 0 }} />
                {feat}
              </div>
            ))}
          </div>
        </div>

        {/* Right: vendor performance */}
        <div style={{ flex: 1 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px 32px" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 28 }}>🏆 Vendor Performance</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {vendors.map(({ name, rate, orders, total, badge }) => (
                <div key={name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 600, color: "#e2e8f0" }}>{name}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{orders} orders · {total}</div>
                    </div>
                    <div style={{ background: `${badge}22`, color: badge, borderRadius: 100, padding: "6px 16px", fontSize: 15, fontWeight: 800 }}>{rate}%</div>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.07)", borderRadius: 4 }}>
                    <div style={{ height: 8, width: `${rate}%`, background: badge, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>7 / 10</div>
    </div>
  );
}
