export default function Slide01Title() {
  return (
    <div
      style={{ width: 1920, height: 1080, background: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden" }}
    >
      {/* Background grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)", backgroundSize: "48px 48px" }} />

      {/* Amber glow top-left */}
      <div style={{ position: "absolute", top: -200, left: -200, width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.25) 0%, transparent 70%)" }} />
      {/* Violet glow bottom-right */}
      <div style={{ position: "absolute", bottom: -300, right: -200, width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)" }} />

      {/* Logo mark */}
      <div style={{ position: "absolute", top: 80, left: 100, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🎁</div>
        <span style={{ color: "#94a3b8", fontSize: 24, fontWeight: 500, letterSpacing: "0.05em" }}>Customize Duniya</span>
      </div>

      {/* Main content */}
      <div style={{ position: "absolute", top: "50%", left: 100, transform: "translateY(-50%)", maxWidth: 900 }}>
        <div style={{ display: "inline-block", background: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 100, padding: "8px 24px", marginBottom: 40 }}>
          <span style={{ color: "#f59e0b", fontSize: 18, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>ERP Platform · App Walkthrough</span>
        </div>
        <h1 style={{ margin: "0 0 32px", fontSize: 96, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em", color: "#f8fafc" }}>
          The Command Center<br />
          <span style={{ background: "linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            for Corporate Gifting
          </span>
        </h1>
        <p style={{ margin: 0, fontSize: 28, color: "#94a3b8", lineHeight: 1.6, maxWidth: 700 }}>
          Manage clients, catalog, orders, production and finance — all in one beautifully organised workspace.
        </p>
      </div>

      {/* Right side feature pills */}
      <div style={{ position: "absolute", right: 120, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 20 }}>
        {[
          { icon: "📊", label: "Live Analytics" },
          { icon: "🗂️", label: "CRM Pipeline" },
          { icon: "📦", label: "Inventory" },
          { icon: "💰", label: "Invoicing" },
          { icon: "🏭", label: "Production" },
          { icon: "🤝", label: "Vendor Management" },
        ].map(({ icon, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 28px" }}>
            <span style={{ fontSize: 28 }}>{icon}</span>
            <span style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />

      {/* Slide number */}
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>1 / 10</div>
    </div>
  );
}
