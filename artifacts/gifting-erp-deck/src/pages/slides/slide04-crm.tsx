export default function Slide04CRM() {
  const stages = [
    { label: "Leads", count: 24, color: "#6366f1", icon: "🎯", items: ["Inbound enquiries", "Trade show contacts", "Website forms"] },
    { label: "Opportunities", count: 15, color: "#3b82f6", icon: "🔭", items: ["Qualified prospects", "Pricing discussed", "Demo completed"] },
    { label: "Quotes", count: 9, color: "#d97706", icon: "📋", items: ["Proposal sent", "Customization agreed", "Awaiting sign-off"] },
    { label: "Won", count: 6, color: "#10b981", icon: "✅", items: ["PO received", "Order confirmed", "Advance paid"] },
  ];

  return (
    <div style={{ width: 1920, height: 1080, background: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "absolute", bottom: -200, left: -100, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />

      <div style={{ position: "absolute", top: 80, left: 100, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎁</div>
        <span style={{ color: "#475569", fontSize: 20, fontWeight: 500 }}>Customize Duniya ERP</span>
      </div>

      <div style={{ padding: "80px 100px 0" }}>
        <div style={{ display: "inline-block", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 100, padding: "8px 24px", marginBottom: 20 }}>
          <span style={{ color: "#818cf8", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Feature · CRM Pipeline</span>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 60, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>From first enquiry to signed order</h2>
        <p style={{ fontSize: 22, color: "#64748b", margin: "0 0 48px" }}>Kanban-style pipeline with detailed drawers, activity logs, and one-click conversions between stages.</p>
      </div>

      <div style={{ padding: "0 100px", display: "flex", gap: 24 }}>
        {stages.map(({ label, count, color, icon, items }) => (
          <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${color}33`, borderRadius: 20, overflow: "hidden" }}>
            {/* Column header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${color}22`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>{label}</span>
              </div>
              <div style={{ background: `${color}22`, color, borderRadius: 100, padding: "4px 14px", fontSize: 15, fontWeight: 700 }}>{count}</div>
            </div>
            {/* Cards */}
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map(item => (
                <div key={item} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ fontSize: 14, color: "#cbd5e1", fontWeight: 500 }}>{item}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <div style={{ height: 4, flex: 1, background: color, borderRadius: 2, opacity: 0.6 }} />
                    <div style={{ height: 4, flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
              {/* Convert button hint */}
              <div style={{ marginTop: 8, padding: "12px 16px", border: `1px dashed ${color}44`, borderRadius: 12, textAlign: "center" }}>
                <span style={{ fontSize: 13, color: color, fontWeight: 600 }}>+ Add / Convert →</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature callouts */}
      <div style={{ padding: "32px 100px 0", display: "flex", gap: 24 }}>
        {["🔄 One-click stage conversion", "📝 Side-drawer detail view", "🏷️ Smart status badges", "📊 Pipeline value stats bar"].map(feat => (
          <div key={feat} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "14px 20px", fontSize: 15, color: "#94a3b8", fontWeight: 500, border: "1px solid rgba(255,255,255,0.06)" }}>
            {feat}
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>4 / 10</div>
    </div>
  );
}
