const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; font-size: 13px; line-height: 1.6; }
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #4338ca; }
  .brand { font-size: 18px; font-weight: 800; color: #4338ca; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; color: #888; margin-top: 2px; }
  .doc-id { text-align: right; }
  .doc-id h1 { font-size: 26px; font-weight: 800; color: #1a1a2e; }
  .doc-id .date { font-size: 12px; color: #888; margin-top: 4px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
  .badge-draft, .badge-ordered { background: #e5e7eb; color: #374151; }
  .badge-sent, .badge-partially-received { background: #dbeafe; color: #1e40af; }
  .badge-paid, .badge-accepted, .badge-fully-received, .badge-confirmed { background: #d1fae5; color: #065f46; }
  .badge-overdue, .badge-rejected, .badge-cancelled { background: #fee2e2; color: #991b1b; }
  .badge-expired { background: #fef3c7; color: #92400e; }
  .badge-default { background: #f3f4f6; color: #374151; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .meta-section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; }
  .meta-section h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; font-weight: 700; }
  .meta-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
  .meta-row .lbl { color: #6b7280; }
  .meta-row .val { font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  thead th { background: #ede9fe; color: #4338ca; text-align: left; padding: 9px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .totals-box { margin-left: auto; width: 280px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
  .total-row.sub { color: #6b7280; }
  .total-row.discount { color: #d97706; }
  .total-row.final { border-top: 2px solid #4338ca; margin-top: 8px; padding-top: 10px; font-size: 15px; font-weight: 800; color: #4338ca; }
  .note-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; }
  .note-box strong { color: #92400e; display: block; margin-bottom: 2px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .addresses { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .address-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; font-size: 12px; }
  .address-card strong { display: block; color: #4338ca; font-weight: 700; margin-bottom: 4px; }
  .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
  .progress-bar { background: #e5e7eb; border-radius: 4px; height: 6px; overflow: hidden; margin-top: 4px; }
  .progress-fill { background: #4338ca; height: 100%; border-radius: 4px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print { body { padding: 0; } @page { margin: 18mm; size: A4; } }
`;

function printedOn() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function badgeClass(status: string) {
  const s = status.toLowerCase().replace(/\s+/g, "-");
  const known = ["draft","sent","paid","overdue","accepted","rejected","expired","confirmed","ordered","partially-received","fully-received","cancelled"];
  return `badge badge-${known.includes(s) ? s : "default"}`;
}

function footer() {
  return `<div class="footer"><span>Customize Duniya — Corporate Gifting ERP</span><span>Printed on ${printedOn()}</span></div>`;
}

function openWin(title: string, html: string) {
  const w = window.open("", "_blank", "width=960,height=720,scrollbars=yes");
  if (!w) { alert("Pop-ups are blocked. Please allow pop-ups for this site to print."); return; }
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body>${html}${footer()}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

export function printInvoice(inv: {
  invoiceNumber: string;
  clientName: string | null;
  orderNumber?: string | null;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  dueDate?: string | null;
}) {
  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Corporate Gifting ERP</div></div>
      <div class="doc-id">
        <h1>${inv.invoiceNumber}</h1>
        <div class="date">Printed ${printedOn()}</div>
        <span class="${badgeClass(inv.status)}">${inv.status}</span>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Billed To</h3>
        <div class="meta-row"><span class="lbl">Client</span><span class="val">${inv.clientName ?? "—"}</span></div>
        ${inv.orderNumber ? `<div class="meta-row"><span class="lbl">Sales Order</span><span class="val">${inv.orderNumber}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Payment Details</h3>
        <div class="meta-row"><span class="lbl">Due Date</span><span class="val">${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></div>
        <div class="meta-row"><span class="lbl">Status</span><span class="val">${inv.status}</span></div>
      </div>
    </div>
    <div class="totals-box" style="margin-bottom:24px;width:100%;max-width:340px;margin-left:auto;">
      <div class="total-row sub"><span>Subtotal</span><span>₹${inv.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      <div class="total-row sub"><span>GST (18%)</span><span>₹${inv.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      <div class="total-row final"><span>Total</span><span>₹${inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;">This is a computer-generated document. No signature is required.</p>
  `;
  openWin(inv.invoiceNumber, html);
}

export function printSalesOrder(order: {
  orderNumber: string;
  clientName: string;
  status: string;
  totalAmount: string | number;
  createdAt: string;
  occasion?: string | null;
  notes?: string | null;
  items?: Array<{ id: number; product?: { name: string } | null; productName?: string; quantity: number; unitPrice: string | number; totalPrice: string | number }>;
  deliveryAddresses?: Array<{ id: number; recipientName: string; address: string; phone?: string | null }>;
}) {
  const items = order.items ?? [];
  const addresses = order.deliveryAddresses ?? [];
  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Sales Order</div></div>
      <div class="doc-id">
        <h1>${order.orderNumber}</h1>
        <div class="date">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
        <span class="${badgeClass(order.status)}">${order.status}</span>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Customer</h3>
        <div class="meta-row"><span class="lbl">Client</span><span class="val">${order.clientName}</span></div>
        ${order.occasion ? `<div class="meta-row"><span class="lbl">Occasion</span><span class="val">${order.occasion}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Order Info</h3>
        <div class="meta-row"><span class="lbl">Total Amount</span><span class="val">₹${Number(order.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
        <div class="meta-row"><span class="lbl">Order Date</span><span class="val">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
      </div>
    </div>
    ${order.notes ? `<div class="note-box"><strong>Notes</strong>${order.notes}</div>` : ""}
    <div class="section-title">Line Items</div>
    <table>
      <thead><tr><th>Product</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
      <tbody>
        ${items.map(item => `<tr>
          <td class="font-bold">${item.product?.name ?? item.productName ?? "—"}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">₹${Number(item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-bold">₹${Number(item.totalPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div class="totals-box">
        <div class="total-row final"><span>Grand Total</span><span>₹${Number(order.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
    ${addresses.length ? `
      <div class="section-title">Delivery Addresses</div>
      <div class="addresses">
        ${addresses.map(a => `<div class="address-card"><strong>${a.recipientName}</strong><span>${a.address}</span>${a.phone ? `<br><span>${a.phone}</span>` : ""}</div>`).join("")}
      </div>
    ` : ""}
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;">Order Confirmation — Customize Duniya Corporate Gifting</p>
  `;
  openWin(order.orderNumber, html);
}

export function printPurchaseOrder(order: {
  poNumber: string;
  vendorName: string;
  status: string;
  totalAmount: string | number;
  createdAt: string;
  expectedDelivery?: string | null;
  salesOrderId?: number | null;
  items?: Array<{ id: number; product?: { name: string } | null; productName?: string; quantity: number; receivedQty?: number; receivedQuantity?: number; unitPrice: string | number; totalPrice: string | number }>;
}) {
  const items = order.items ?? [];
  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Purchase Order</div></div>
      <div class="doc-id">
        <h1>${order.poNumber}</h1>
        <div class="date">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
        <span class="${badgeClass(order.status)}">${order.status}</span>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Vendor</h3>
        <div class="meta-row"><span class="lbl">Supplier</span><span class="val">${order.vendorName}</span></div>
        ${order.salesOrderId ? `<div class="meta-row"><span class="lbl">Related SO</span><span class="val">SO-${order.salesOrderId}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Delivery</h3>
        <div class="meta-row"><span class="lbl">PO Date</span><span class="val">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
        <div class="meta-row"><span class="lbl">Expected</span><span class="val">${order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></div>
        <div class="meta-row"><span class="lbl">Total Amount</span><span class="val">₹${Number(order.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
    <div class="section-title">Line Items</div>
    <table>
      <thead><tr><th>Product</th><th class="text-right">Unit Price</th><th class="text-center">Ordered</th><th class="text-center">Received</th><th class="text-right">Total</th></tr></thead>
      <tbody>
        ${items.map(item => {
          const qty = Number(item.quantity ?? 0);
          const rcv = Number(item.receivedQty ?? item.receivedQuantity ?? 0);
          const pct = qty > 0 ? Math.round((rcv / qty) * 100) : 0;
          return `<tr>
            <td class="font-bold">${item.product?.name ?? item.productName ?? "—"}</td>
            <td class="text-right">₹${Number(item.unitPrice).toFixed(2)}</td>
            <td class="text-center">${qty}</td>
            <td class="text-center">
              ${rcv} / ${qty}
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            </td>
            <td class="text-right font-bold">₹${Number(item.totalPrice ?? Number(item.unitPrice) * qty).toFixed(2)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div class="totals-box">
        <div class="total-row final"><span>Grand Total</span><span>₹${Number(order.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;">Official Purchase Order — Customize Duniya Corporate Gifting</p>
  `;
  openWin(order.poNumber, html);
}

export function printQuote(q: {
  quoteNumber: string;
  clientName: string | null;
  totalAmount: number;
  gstAmount: number;
  subtotal?: number;
  discountPct: number;
  validUntil?: string | null;
  notes?: string | null;
  status: string;
}) {
  const subtotalAmt = q.subtotal ?? (Number(q.totalAmount) - Number(q.gstAmount));
  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Quotation</div></div>
      <div class="doc-id">
        <h1>${q.quoteNumber}</h1>
        <div class="date">Printed ${printedOn()}</div>
        <span class="${badgeClass(q.status)}">${q.status}</span>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Quoted To</h3>
        <div class="meta-row"><span class="lbl">Client</span><span class="val">${q.clientName ?? "—"}</span></div>
        ${q.validUntil ? `<div class="meta-row"><span class="lbl">Valid Until</span><span class="val">${new Date(q.validUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Amount Summary</h3>
        <div class="meta-row"><span class="lbl">Subtotal</span><span class="val">₹${subtotalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
        ${q.discountPct > 0 ? `<div class="meta-row"><span class="lbl">Discount</span><span class="val">${q.discountPct}%</span></div>` : ""}
        <div class="meta-row"><span class="lbl">GST (18%)</span><span class="val">₹${Number(q.gstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
    ${q.notes ? `<div class="note-box"><strong>Notes</strong>${q.notes}</div>` : ""}
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div class="totals-box">
        <div class="total-row sub"><span>Subtotal</span><span>₹${subtotalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
        ${q.discountPct > 0 ? `<div class="total-row discount"><span>Discount (${q.discountPct}%)</span><span>applied</span></div>` : ""}
        <div class="total-row sub"><span>GST 18%</span><span>₹${Number(q.gstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
        <div class="total-row final"><span>Quote Total</span><span>₹${Number(q.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;">This quotation is valid until ${q.validUntil ? new Date(q.validUntil).toLocaleDateString("en-IN") : "further notice"}. Prices are subject to change.</p>
  `;
  openWin(q.quoteNumber, html);
}

export function printCreditNote(cn: {
  creditNoteNumber: string;
  clientName: string | null;
  invoiceNumber?: string | null;
  amount: number;
  reason: string;
  status: string;
  issuedDate: string;
}) {
  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Credit Note</div></div>
      <div class="doc-id">
        <h1>${cn.creditNoteNumber}</h1>
        <div class="date">${new Date(cn.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
        <span class="${badgeClass(cn.status)}">${cn.status}</span>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Issued To</h3>
        <div class="meta-row"><span class="lbl">Client</span><span class="val">${cn.clientName ?? "—"}</span></div>
        ${cn.invoiceNumber ? `<div class="meta-row"><span class="lbl">Against Invoice</span><span class="val">${cn.invoiceNumber}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Credit Details</h3>
        <div class="meta-row"><span class="lbl">Issue Date</span><span class="val">${new Date(cn.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
        <div class="meta-row"><span class="lbl">Credit Amount</span><span class="val" style="color:#dc2626;">−₹${Number(cn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
    <div class="note-box"><strong>Reason for Credit</strong>${cn.reason}</div>
    <div style="display:flex;justify-content:flex-end;">
      <div class="totals-box">
        <div class="total-row final" style="color:#dc2626;"><span>Credit Amount</span><span>−₹${Number(cn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">This credit note has been issued by Customize Duniya and is valid against future purchases.</p>
  `;
  openWin(cn.creditNoteNumber, html);
}

export function printGrn(g: {
  grnNumber: string;
  purchaseOrderId: number;
  receivedDate: string;
  status: string;
  notes?: string | null;
}) {
  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Goods Receipt Note</div></div>
      <div class="doc-id">
        <h1>${g.grnNumber}</h1>
        <div class="date">${new Date(g.receivedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
        <span class="${badgeClass(g.status)}">${g.status}</span>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Receipt Info</h3>
        <div class="meta-row"><span class="lbl">GRN Number</span><span class="val">${g.grnNumber}</span></div>
        <div class="meta-row"><span class="lbl">Purchase Order</span><span class="val">PO-${g.purchaseOrderId}</span></div>
      </div>
      <div class="meta-section">
        <h3>Date &amp; Status</h3>
        <div class="meta-row"><span class="lbl">Received Date</span><span class="val">${new Date(g.receivedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
        <div class="meta-row"><span class="lbl">Status</span><span class="val">${g.status}</span></div>
      </div>
    </div>
    ${g.notes ? `<div class="note-box"><strong>Notes</strong>${g.notes}</div>` : ""}
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:40px;">Goods received and verified by Customize Duniya Warehouse Team.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px;">
      <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;">Received By (Signature)</div>
      <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;">Authorised By (Signature)</div>
    </div>
  `;
  openWin(g.grnNumber, html);
}
