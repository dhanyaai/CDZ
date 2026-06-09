export default function Slide03Dashboard() {
  const kpis = [
    { label: "Total Clients", value: "284", color: "#3b82f6", icon: "👥" },
    { label: "Active Orders", value: "47", color: "#d97706", icon: "🛒" },
    { label: "Pending Assembly", value: "12", color: "#8b5cf6", icon: "⚙️" },
    { label: "Overdue Invoices", value: "3", color: "#ef4444", icon: "⚠️" },
    { label: "Low Stock Items", value: "8", color: "#f97316", icon: "📦" },
    { label: "Pending POs", value: "6", color: "#6366f1", icon: "🏭" },
  ];

  const revenueData = [30, 48, 38, 65, 52, 80, 72, 90, 68, 95, 85, 110];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const maxVal = 120;
  const chartH = 140;
  const chartW = 680;

  return (
    <div style={{ width: 1920, height: 1080, background: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "absolute", top: -200, left: -100, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)" }} />

      <div style={{ position: "absolute", top: 80, left: 100, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎁</div>
        <span style={{ color: "#475569", fontSize: 20, fontWeight: 500 }}>Customize Duniya ERP</span>
      </div>

      <div style={{ padding: "80px 100px 0" }}>
        <div style={{ display: "inline-block", background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)", borderRadius: 100, padding: "8px 24px", marginBottom: 20 }}>
          <span style={{ color: "#f59e0b", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Feature · Dashboard</span>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 56, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>Your command center at a glance</h2>
        <p style={{ fontSize: 20, color: "#64748b", margin: "0 0 36px" }}>Real-time KPIs, revenue trends, AR aging, and top clients — all on one screen.</p>
      </div>

      {/* KPI row */}
      <div style={{ padding: "0 100px", display: "flex", gap: 20, marginBottom: 32 }}>
        {kpis.map(({ label, value, color, icon }) => (
          <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${color}22`, borderRadius: 16, padding: "24px 20px" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ padding: "0 100px", display: "flex", gap: 28 }}>
        {/* Revenue chart */}
        <div style={{ flex: 2, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px 32px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 20 }}>📈 Revenue Trend (₹ lakhs)</div>
          <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
              </linearGradient>
            </defs>
            {revenueData.map((v, i) => {
              const x = (i / (revenueData.length - 1)) * chartW;
              const y = chartH - (v / maxVal) * chartH;
              return i === 0 ? null : (
                <line key={i} x1={(i - 1) / (revenueData.length - 1) * chartW} y1={chartH - (revenueData[i - 1] / maxVal) * chartH}
                  x2={x} y2={y} stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
              );
            })}
            {revenueData.map((v, i) => {
              const x = (i / (revenueData.length - 1)) * chartW;
              const y = chartH - (v / maxVal) * chartH;
              return <circle key={i} cx={x} cy={y} r="5" fill="#f59e0b" />;
            })}
            {months.map((m, i) => (
              <text key={m} x={(i / (months.length - 1)) * chartW} y={chartH + 4} fill="#475569" fontSize="12" textAnchor="middle" dominantBaseline="hanging">{m}</text>
            ))}
          </svg>
        </div>

        {/* AR Aging */}
        <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px 32px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 24 }}>⏰ AR Aging</div>
          {[
            { label: "Current", pct: 65, color: "#10b981", val: "₹4.2L" },
            { label: "1–30 days", pct: 22, color: "#f59e0b", val: "₹1.4L" },
            { label: "31–60 days", pct: 9, color: "#f97316", val: "₹58k" },
            { label: "60+ days", pct: 4, color: "#ef4444", val: "₹26k" },
          ].map(({ label, pct, color, val }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
                <span style={{ color: "#94a3b8" }}>{label}</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{val}</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
                <div style={{ height: 8, width: `${pct}%`, background: color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Top clients */}
        <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px 32px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 20 }}>🏆 Top Clients</div>
          {[
            { name: "TechCorp India", rev: "₹12.4L", pct: 100 },
            { name: "FinBank Ltd", rev: "₹9.8L", pct: 79 },
            { name: "RetailPro Co.", rev: "₹7.1L", pct: 57 },
            { name: "ManuFab Pvt.", rev: "₹5.3L", pct: 43 },
          ].map(({ name, rev, pct }) => (
            <div key={name} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
                <span style={{ color: "#94a3b8" }}>{name}</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{rev}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
                <div style={{ height: 6, width: `${pct}%`, background: "linear-gradient(90deg, #d97706, #f59e0b)", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>3 / 10</div>
    </div>
  );
}
