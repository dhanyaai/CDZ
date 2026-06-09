export default function Slide02Problem() {
  const problems = [
    { emoji: "📋", title: "Scattered spreadsheets", desc: "Orders tracked across dozens of Excel files with no single source of truth" },
    { emoji: "📞", title: "Missed follow-ups", desc: "Leads and client interactions lost in email threads and WhatsApp chats" },
    { emoji: "🔍", title: "Inventory blind spots", desc: "No real-time visibility on stock levels, leading to order delays and oversells" },
    { emoji: "💸", title: "Payment gaps", desc: "Invoices sent manually, overdue payments slip through with no alerts" },
  ];

  return (
    <div style={{ width: 1920, height: 1080, background: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "absolute", top: -100, right: -100, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)" }} />

      {/* Header */}
      <div style={{ padding: "80px 120px 0" }}>
        <div style={{ display: "inline-block", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 100, padding: "8px 24px", marginBottom: 32 }}>
          <span style={{ color: "#f87171", fontSize: 18, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>The Challenge</span>
        </div>
        <h2 style={{ margin: "0 0 16px", fontSize: 72, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          Running a gifting business<br />
          <span style={{ background: "linear-gradient(90deg, #f87171, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>is complex without the right tools</span>
        </h2>
        <p style={{ fontSize: 24, color: "#64748b", margin: "0 0 64px" }}>Corporate gifting operations involve hundreds of moving parts — most teams cobble together tools that don't talk to each other.</p>
      </div>

      {/* Problem cards */}
      <div style={{ padding: "0 120px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {problems.map(({ emoji, title, desc }) => (
          <div key={title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "36px 40px", display: "flex", gap: 28, alignItems: "flex-start" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
              {emoji}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 18, color: "#64748b", lineHeight: 1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>2 / 10</div>
      <div style={{ position: "absolute", top: 80, left: 100, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎁</div>
        <span style={{ color: "#475569", fontSize: 20, fontWeight: 500 }}>Customize Duniya ERP</span>
      </div>
    </div>
  );
}
