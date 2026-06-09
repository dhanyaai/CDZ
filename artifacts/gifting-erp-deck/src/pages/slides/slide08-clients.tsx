export default function Slide08Clients() {
  const clients = [
    { name: "TechCorp India", contact: "Rahul Sharma", industry: "Technology", orders: 18, value: "₹12.4L", initials: "TC", color: "#6366f1" },
    { name: "FinBank Ltd", contact: "Priya Mehta", industry: "Finance", orders: 12, value: "₹9.8L", initials: "FB", color: "#d97706" },
    { name: "RetailPro Co.", contact: "Anil Gupta", industry: "Retail", orders: 9, value: "₹7.1L", initials: "RP", color: "#10b981" },
    { name: "ManuFab Pvt.", contact: "Seema Joshi", industry: "Manufacturing", orders: 7, value: "₹5.3L", initials: "MF", color: "#8b5cf6" },
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
          <span style={{ color: "#818cf8", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Feature · Clients & Contacts</span>
        </div>
        <h2 style={{ margin: "0 0 16px", fontSize: 60, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>Every relationship, perfectly organised</h2>
        <p style={{ fontSize: 20, color: "#64748b", margin: "0 0 40px" }}>Table and card views, industry filters, GST tracking, full order history, and contact interaction logs per client.</p>
      </div>

      <div style={{ padding: "0 100px", display: "flex", gap: 28 }}>
        {/* Client cards */}
        <div style={{ flex: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {clients.map(({ name, contact, industry, orders, value, initials, color }) => (
            <div key={name} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${color}, ${color}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{name}</div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>{contact}</div>
                </div>
                <div style={{ marginLeft: "auto", background: `${color}22`, color, borderRadius: 100, padding: "5px 14px", fontSize: 12, fontWeight: 600 }}>{industry}</div>
              </div>
              <div style={{ display: "flex", gap: 0, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{orders}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Orders</div>
                </div>
                <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ flex: 1, paddingLeft: 24 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}{...{}}>{value}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Total Revenue</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            { icon: "🗃️", title: "Table & Card views", desc: "Switch between grid and list display modes" },
            { icon: "🔍", title: "Industry filter", desc: "Quick-filter by vertical, region, or tag" },
            { icon: "📋", title: "Full order history", desc: "Every order linked directly to the client profile" },
            { icon: "💬", title: "Interaction log", desc: "Track calls, emails, and meetings per contact" },
            { icon: "🧾", title: "GST & billing info", desc: "Store tax numbers, addresses, and payment terms" },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 14, color: "#64748b" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>8 / 10</div>
    </div>
  );
}
