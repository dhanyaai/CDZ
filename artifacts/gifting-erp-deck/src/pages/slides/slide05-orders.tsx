export default function Slide05Orders() {
  const steps = [
    { label: "Draft", color: "#6366f1", active: true },
    { label: "Confirmed", color: "#3b82f6", active: true },
    { label: "In Production", color: "#d97706", active: true },
    { label: "Ready", color: "#10b981", active: false },
    { label: "Dispatched", color: "#8b5cf6", active: false },
    { label: "Delivered", color: "#22c55e", active: false },
  ];

  const orders = [
    { id: "SO-0042", client: "TechCorp India", items: "200× Branded Mugs", value: "₹48,000", status: "In Production", statusColor: "#d97706" },
    { id: "SO-0041", client: "FinBank Ltd", items: "150× Gift Hampers", value: "₹1,12,500", status: "Confirmed", statusColor: "#3b82f6" },
    { id: "SO-0040", client: "RetailPro Co.", items: "80× Eco Tote Bags", value: "₹28,800", status: "Ready", statusColor: "#10b981" },
    { id: "SO-0039", client: "ManuFab Pvt.", items: "500× Branded Pens", value: "₹15,000", status: "Delivered", statusColor: "#22c55e" },
  ];

  return (
    <div style={{ width: 1920, height: 1080, background: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "absolute", top: -100, right: -100, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)" }} />

      <div style={{ position: "absolute", top: 80, left: 100, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎁</div>
        <span style={{ color: "#475569", fontSize: 20, fontWeight: 500 }}>Customize Duniya ERP</span>
      </div>

      <div style={{ padding: "80px 100px 0", display: "flex", gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)", borderRadius: 100, padding: "8px 24px", marginBottom: 20 }}>
            <span style={{ color: "#f59e0b", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Feature · Sales Orders & Invoices</span>
          </div>
          <h2 style={{ margin: "0 0 16px", fontSize: 60, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Order lifecycle &amp;<br />payment tracking</h2>
          <p style={{ fontSize: 20, color: "#64748b", margin: "0 0 40px", lineHeight: 1.7 }}>
            Track every order through a 6-stage production stepper. Generate invoices, send payment reminders, and mark receipts — all in one click.
          </p>

          {/* Status stepper */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px 32px", marginBottom: 32 }}>
            <div style={{ fontSize: 16, color: "#64748b", marginBottom: 20, fontWeight: 600 }}>Order Status Stepper</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {steps.map(({ label, color, active }, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: active ? color : "rgba(255,255,255,0.06)", border: `2px solid ${active ? color : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {active && <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <span style={{ fontSize: 12, color: active ? color : "#475569", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: active && steps[i + 1].active ? color : "rgba(255,255,255,0.06)", margin: "0 4px", marginBottom: 28 }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invoice features */}
          <div style={{ display: "flex", gap: 16 }}>
            {["📄 Auto-generate invoices", "💬 Send reminders", "✅ Mark as Paid"].map(feat => (
              <div key={feat} style={{ flex: 1, background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 14, padding: "16px 20px", fontSize: 15, color: "#fbbf24", fontWeight: 600 }}>{feat}</div>
            ))}
          </div>
        </div>

        {/* Orders table */}
        <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" }}>
          <div style={{ padding: "24px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Recent Sales Orders</div>
          <div>
            {orders.map((order, i) => (
              <div key={order.id} style={{ padding: "20px 32px", borderBottom: i < orders.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ fontFamily: "monospace", fontSize: 14, color: "#d97706", fontWeight: 700, width: 80 }}>{order.id}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0" }}>{order.client}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{order.items}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", width: 100, textAlign: "right" }}>{order.value}</div>
                <div style={{ background: `${order.statusColor}22`, color: order.statusColor, borderRadius: 100, padding: "6px 16px", fontSize: 13, fontWeight: 700, width: 120, textAlign: "center" }}>{order.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #d97706, #f59e0b, #8b5cf6, transparent)" }} />
      <div style={{ position: "absolute", bottom: 40, right: 100, color: "#475569", fontSize: 18 }}>5 / 10</div>
    </div>
  );
}
