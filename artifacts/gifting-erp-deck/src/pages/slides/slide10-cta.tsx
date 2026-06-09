export default function Slide10CTA() {
  return (
    <div style={{ width: 1920, height: 1080, background: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Background grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)", backgroundSize: "48px 48px" }} />

      {/* Central glow */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 1200, height: 1200, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.18) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)" }} />

      {/* Logo */}
      <div style={{ position: "absolute", top: 80, left: 100, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎁</div>
        <span style={{ color: "#475569", fontSize: 20, fontWeight: 500 }}>Customize Duniya ERP</span>
      </div>

      {/* Main content */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-55%)", textAlign: "center", width: 1400 }}>
        <div style={{ display: "inline-block", background: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 100, padding: "10px 32px", marginBottom: 40 }}>
          <span style={{ color: "#f59e0b", fontSize: 20, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Ready to get started?</span>
        </div>

        <h1 style={{ margin: "0 0 32px", fontSize: 100, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f8fafc" }}>
          Your gifting business,<br />
          <span style={{ background: "linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            finally under control
          </span>
        </h1>

        <p style={{ margin: "0 auto 60px", fontSize: 28, color: "#64748b", lineHeight: 1.6, maxWidth: 900 }}>
          Log in with demo credentials and explore the full ERP — all 12 modules, live data, and real analytics.
        </p>

        {/* Demo badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 32, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "28px 48px" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Demo Access</div>
            <div style={{ fontSize: 20, color: "#e2e8f0", fontFamily: "monospace", fontWeight: 600 }}>admin@gifterp.com</div>
          </div>
          <div style={{ width: 1, height: 48, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Password</div>
            <div style={{ fontSize: 20, color: "#e2e8f0", fontFamily: "monospace", fontWeight: 600 }}>admin123</div>
          </div>
          <div style={{ width: 1, height: 48, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Built with</div>
            <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 600 }}>React · Express · PostgreSQL</div>
          </div>
        </div>
      </div>

      {/* Feature dots */}
      <div style={{ position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 40 }}>
        {["🎯 CRM Pipeline", "📦 Inventory", "💰 Invoicing", "📊 Analytics", "🏭 Vendor Mgmt"].map(feat => (
          <div key={feat} style={{ fontSize: 18, color: "#475569", fontWeight: 500 }}>{feat}</div>
        ))}
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>10 / 10</div>
    </div>
  );
}
