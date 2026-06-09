export default function Slide09Features() {
  const modules = [
    { icon: "🎯", label: "Leads", color: "#6366f1" },
    { icon: "🔭", label: "Opportunities", color: "#3b82f6" },
    { icon: "📋", label: "Quotes", color: "#d97706" },
    { icon: "🛒", label: "Sales Orders", color: "#f59e0b" },
    { icon: "💳", label: "Invoices", color: "#10b981" },
    { icon: "📦", label: "Inventory", color: "#06b6d4" },
    { icon: "🏷️", label: "Products", color: "#ec4899" },
    { icon: "🗂️", label: "Categories", color: "#8b5cf6" },
    { icon: "🏭", label: "Purchase Orders", color: "#a78bfa" },
    { icon: "👥", label: "Clients", color: "#22d3ee" },
    { icon: "👤", label: "Contacts", color: "#34d399" },
    { icon: "📊", label: "Dashboard", color: "#fb923c" },
  ];

  const highlights = [
    { stat: "12", label: "ERP modules" },
    { stat: "₹", label: "INR-native" },
    { stat: "100%", label: "Real-time data" },
    { stat: "0", label: "Data silos" },
  ];

  return (
    <div style={{ width: 1920, height: 1080, background: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 1000, height: 1000, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.06) 0%, transparent 70%)" }} />

      <div style={{ position: "absolute", top: 80, left: 100, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎁</div>
        <span style={{ color: "#475569", fontSize: 20, fontWeight: 500 }}>Customize Duniya ERP</span>
      </div>

      <div style={{ padding: "80px 100px 0", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)", borderRadius: 100, padding: "8px 24px", marginBottom: 24 }}>
          <span style={{ color: "#f59e0b", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Complete Platform</span>
        </div>
        <h2 style={{ margin: "0 0 16px", fontSize: 64, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>Everything you need, fully integrated</h2>
        <p style={{ fontSize: 22, color: "#64748b", margin: "0 auto 48px", maxWidth: 800 }}>12 interconnected modules working together — no copy-pasting, no double entry, no gaps.</p>
      </div>

      {/* Module grid */}
      <div style={{ padding: "0 100px", display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", marginBottom: 40 }}>
        {modules.map(({ icon, label, color }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}33`, borderRadius: 16, padding: "20px 28px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{icon}</div>
            <span style={{ fontSize: 17, fontWeight: 600, color: "#e2e8f0" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{ padding: "0 100px", display: "flex", gap: 24, justifyContent: "center" }}>
        {highlights.map(({ stat, label }) => (
          <div key={label} style={{ flex: 1, maxWidth: 300, background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 20, padding: "24px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#f59e0b", marginBottom: 4 }}>{stat}</div>
            <div style={{ fontSize: 16, color: "#64748b", fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>9 / 10</div>
    </div>
  );
}
