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


export function printSalesOrder(order: {
  orderNumber: string;
  clientName: string;
  contactPerson?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientGst?: string | null;
  billingAddress?: string | null;
  status: string;
  totalAmount: string | number;
  discountPct?: string | number | null;
  gstAmount?: string | number | null;
  grandTotal?: string | number | null;
  paymentTerms?: string | null;
  deliveryDate?: string | null;
  poNumber?: string | null;
  occasion?: string | null;
  notes?: string | null;
  createdAt: string;
  items?: Array<{ id: number; product?: { name: string } | null; productName?: string; productImage?: string | null; quantity: number; unitPrice: string | number; totalPrice: string | number }>;
  deliveryAddresses?: Array<{ id: number; name: string; address: string; city?: string | null; pincode?: string | null; phone?: string | null }>;
}) {
  const items = order.items ?? [];
  const addresses = order.deliveryAddresses ?? [];
  const subtotal = Number(order.totalAmount ?? 0);
  const discountPct = Number(order.discountPct ?? 0);
  const gstAmount = Number(order.gstAmount ?? 0);
  const grandTotal = Number(order.grandTotal ?? subtotal + gstAmount);
  const discountAmt = discountPct > 0 ? subtotal * (discountPct / 100) : 0;

  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Sales Order Confirmation</div></div>
      <div class="doc-id">
        <h1>${order.orderNumber}</h1>
        <div class="date">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
        <span class="${badgeClass(order.status)}">${order.status}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-section">
        <h3>Bill To</h3>
        <div class="meta-row"><span class="lbl">Client</span><span class="val">${order.clientName}</span></div>
        ${order.contactPerson ? `<div class="meta-row"><span class="lbl">Contact</span><span class="val">${order.contactPerson}</span></div>` : ""}
        ${order.clientEmail ? `<div class="meta-row"><span class="lbl">Email</span><span class="val">${order.clientEmail}</span></div>` : ""}
        ${order.clientPhone ? `<div class="meta-row"><span class="lbl">Phone</span><span class="val">${order.clientPhone}</span></div>` : ""}
        ${order.clientGst ? `<div class="meta-row"><span class="lbl">GSTIN</span><span class="val" style="font-family:monospace;font-size:11px;">${order.clientGst}</span></div>` : ""}
        ${order.billingAddress ? `<div class="meta-row"><span class="lbl">Billing Addr.</span><span class="val" style="max-width:160px;text-align:right;">${order.billingAddress}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Order Details</h3>
        <div class="meta-row"><span class="lbl">Order Date</span><span class="val">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
        ${order.poNumber ? `<div class="meta-row"><span class="lbl">Customer PO#</span><span class="val">${order.poNumber}</span></div>` : ""}
        ${order.deliveryDate ? `<div class="meta-row"><span class="lbl">Delivery Date</span><span class="val">${new Date(order.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>` : ""}
        ${order.paymentTerms ? `<div class="meta-row"><span class="lbl">Payment Terms</span><span class="val">${order.paymentTerms}</span></div>` : ""}
        ${order.occasion ? `<div class="meta-row"><span class="lbl">Occasion</span><span class="val">${order.occasion}</span></div>` : ""}
      </div>
    </div>

    ${order.notes ? `<div class="note-box"><strong>Notes</strong>${order.notes}</div>` : ""}

    <div class="section-title">Line Items</div>
    <table>
      <thead>
        <tr>
          <th style="width:48px;"></th>
          <th>Product</th>
          <th class="text-right" style="width:60px;">Qty</th>
          <th class="text-right" style="width:110px;">Unit Price</th>
          <th class="text-right" style="width:120px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `<tr>
          <td style="padding:8px 12px;">
            ${item.productImage
              ? `<img src="${item.productImage}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid #e5e7eb;display:block;" />`
              : `<div style="width:40px;height:40px;border-radius:6px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:18px;">🎁</div>`}
          </td>
          <td class="font-bold">${item.product?.name ?? item.productName ?? "—"}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">₹${Number(item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-bold">₹${Number(item.totalPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>`).join("")}
      </tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div class="totals-box">
        <div class="total-row sub"><span>Subtotal</span><span>₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
        ${discountPct > 0 ? `<div class="total-row discount"><span>Discount (${discountPct}%)</span><span>−₹${discountAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>` : ""}
        <div class="total-row sub"><span>GST 18%</span><span>₹${gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
        <div class="total-row final"><span>Grand Total</span><span>₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>

    ${addresses.length ? `
      <div class="section-title">Delivery Addresses</div>
      <div class="addresses">
        ${addresses.map(a => `<div class="address-card">
          <strong>${a.name}</strong>
          ${a.phone ? `<span style="color:#6b7280;font-size:11px;display:block;margin-bottom:3px;">${a.phone}</span>` : ""}
          <span>${a.address}</span>
          ${(a.city || a.pincode) ? `<span style="display:block;color:#6b7280;">${[a.city, a.pincode].filter(Boolean).join(" — ")}</span>` : ""}
        </div>`).join("")}
      </div>
    ` : ""}

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;">Order Confirmation — Customize Duniya Corporate Gifting</p>
  `;
  openWin(order.orderNumber, html);
}

export function printPurchaseOrder(order: {
  poNumber: string;
  vendorName: string;
  vendorContactPerson?: string | null;
  vendorEmail?: string | null;
  vendorPhone?: string | null;
  vendorGst?: string | null;
  vendorAddress?: string | null;
  vendorCity?: string | null;
  vendorState?: string | null;
  vendorPincode?: string | null;
  vendorPaymentTerms?: string | null;
  vendorLeadTimeDays?: number | null;
  status: string;
  totalAmount: string | number;
  createdAt: string;
  expectedDelivery?: string | null;
  salesOrderId?: number | null;
  orderNumber?: string | null;
  items?: Array<{
    id: number;
    product?: { name: string } | null;
    productName?: string;
    quantity: number;
    receivedQty?: number;
    receivedQuantity?: number;
    unitPrice: string | number;
    lineTotal?: string | number;
    totalPrice?: string | number;
  }>;
}) {
  const items = order.items ?? [];
  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtAmt = (n: string | number) =>
    `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const vendorAddress = [order.vendorAddress, order.vendorCity, order.vendorState, order.vendorPincode]
    .filter(Boolean).join(", ");

  const itemsHtml = items.map(item => {
    const qty = Number(item.quantity ?? 0);
    const rcv = Number(item.receivedQty ?? item.receivedQuantity ?? 0);
    const unitP = Number(item.unitPrice ?? 0);
    const total = Number(item.lineTotal ?? item.totalPrice ?? unitP * qty);
    const pct = qty > 0 ? Math.round((rcv / qty) * 100) : 0;
    const name = item.product?.name ?? item.productName ?? "—";
    return `<tr>
      <td class="font-bold">${name}</td>
      <td class="text-right">${fmtAmt(unitP)}</td>
      <td class="text-center">${qty}</td>
      <td class="text-center">
        <span style="font-weight:600;">${rcv}</span> / ${qty}
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </td>
      <td class="text-right font-bold">${fmtAmt(total)}</td>
    </tr>`;
  }).join("");

  const html = `
    <div class="doc-header">
      <div>
        <div class="brand">Customize Duniya</div>
        <div class="brand-sub">Corporate Gifting ERP — Purchase Order</div>
      </div>
      <div class="doc-id">
        <h1>${order.poNumber}</h1>
        <div class="date">PO Date: ${fmtDate(order.createdAt)}</div>
        <span class="${badgeClass(order.status)}">${order.status}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-section">
        <h3>Vendor / Supplier</h3>
        <div class="meta-row"><span class="lbl">Name</span><span class="val">${order.vendorName}</span></div>
        ${order.vendorContactPerson ? `<div class="meta-row"><span class="lbl">Contact Person</span><span class="val">${order.vendorContactPerson}</span></div>` : ""}
        ${order.vendorPhone ? `<div class="meta-row"><span class="lbl">Phone</span><span class="val">${order.vendorPhone}</span></div>` : ""}
        ${order.vendorEmail ? `<div class="meta-row"><span class="lbl">Email</span><span class="val">${order.vendorEmail}</span></div>` : ""}
        ${order.vendorGst ? `<div class="meta-row"><span class="lbl">GST No.</span><span class="val">${order.vendorGst}</span></div>` : ""}
        ${vendorAddress ? `<div class="meta-row"><span class="lbl">Address</span><span class="val" style="text-align:right;max-width:180px;">${vendorAddress}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Order Details</h3>
        <div class="meta-row"><span class="lbl">PO Number</span><span class="val">${order.poNumber}</span></div>
        <div class="meta-row"><span class="lbl">PO Date</span><span class="val">${fmtDate(order.createdAt)}</span></div>
        <div class="meta-row"><span class="lbl">Expected Delivery</span><span class="val">${fmtDate(order.expectedDelivery)}</span></div>
        <div class="meta-row"><span class="lbl">Status</span><span class="val">${order.status}</span></div>
        ${order.orderNumber ? `<div class="meta-row"><span class="lbl">Linked Sales Order</span><span class="val">${order.orderNumber}</span></div>` : order.salesOrderId ? `<div class="meta-row"><span class="lbl">Linked Sales Order</span><span class="val">SO-${order.salesOrderId}</span></div>` : ""}
        ${order.vendorPaymentTerms ? `<div class="meta-row"><span class="lbl">Payment Terms</span><span class="val">${order.vendorPaymentTerms}</span></div>` : ""}
        ${order.vendorLeadTimeDays ? `<div class="meta-row"><span class="lbl">Lead Time</span><span class="val">${order.vendorLeadTimeDays} days</span></div>` : ""}
      </div>
    </div>

    <div class="section-title">Line Items</div>
    <table>
      <thead>
        <tr>
          <th>Product / Description</th>
          <th class="text-right" style="width:95px;">Unit Price</th>
          <th class="text-center" style="width:85px;">Qty Ordered</th>
          <th class="text-center" style="width:95px;">Qty Received</th>
          <th class="text-right" style="width:95px;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td colspan="5" class="text-center" style="color:#9ca3af;padding:20px;">No items</td></tr>`}
      </tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:28px;">
      <div class="totals-box">
        <div class="total-row sub"><span>Subtotal (${items.length} item${items.length !== 1 ? "s" : ""})</span><span>${fmtAmt(order.totalAmount)}</span></div>
        <div class="total-row final"><span>Grand Total</span><span>${fmtAmt(order.totalAmount)}</span></div>
      </div>
    </div>

    <div style="margin-top:24px;padding:12px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:#6b7280;background:#f9fafb;">
      <strong style="display:block;color:#374151;margin-bottom:4px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Terms &amp; Conditions</strong>
      Please supply the items as per the specifications listed above. Goods must be delivered by the expected delivery date.
      ${order.vendorPaymentTerms ? `Payment terms: ${order.vendorPaymentTerms}.` : ""}
      For queries, contact our procurement team.
    </div>

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:20px;">
      Official Purchase Order — Customize Duniya Corporate Gifting &nbsp;|&nbsp; Printed ${printedOn()}
    </p>
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
  items?: Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number; imageUrl?: string | null }>;
}) {
  const subtotalAmt = q.subtotal ?? (Number(q.totalAmount) - Number(q.gstAmount));
  const items = q.items ?? [];
  const itemsHtml = items.length > 0 ? `
    <div class="section-title" style="margin-top:4px;">Quoted Items</div>
    <table>
      <thead>
        <tr>
          <th style="width:52px;"></th>
          <th>Product / Description</th>
          <th class="text-right" style="width:60px;">Qty</th>
          <th class="text-right" style="width:110px;">Unit Price</th>
          <th class="text-right" style="width:120px;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `<tr>
          <td style="padding:8px 12px;">
            ${item.imageUrl
              ? `<img src="${item.imageUrl}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid #e5e7eb;display:block;" />`
              : `<div style="width:40px;height:40px;border-radius:6px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:18px;">🎁</div>`
            }
          </td>
          <td class="font-bold">${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">₹${Number(item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-bold">₹${Number(item.lineTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  ` : "";
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
    ${itemsHtml}
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
  poNumber?: string | null;
  vendorName?: string | null;
  receivedDate: string;
  status: string;
  notes?: string | null;
  items?: Array<{ productName: string; quantityReceived: number; quantityRejected: number; remarks?: string | null }>;
}) {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const items = g.items ?? [];
  const totalReceived = items.reduce((s, i) => s + i.quantityReceived, 0);

  const itemsHtml = items.length > 0 ? `
    <div class="section-title" style="margin-top:4px;">Items Received</div>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th class="text-center" style="width:100px;">Qty Received</th>
          <th class="text-center" style="width:100px;">Qty Rejected</th>
          <th style="width:130px;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `<tr>
          <td class="font-bold">${item.productName}</td>
          <td class="text-center">${item.quantityReceived}</td>
          <td class="text-center">${item.quantityRejected || 0}</td>
          <td>${item.remarks || "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  ` : `<p style="color:#9ca3af;font-size:12px;margin-bottom:20px;text-align:center;">No line items recorded.</p>`;

  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Goods Receipt Note</div></div>
      <div class="doc-id">
        <h1>${g.grnNumber}</h1>
        <div class="date">${fmtDate(g.receivedDate)}</div>
        <span class="${badgeClass(g.status)}">${g.status}</span>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Receipt Info</h3>
        <div class="meta-row"><span class="lbl">GRN Number</span><span class="val">${g.grnNumber}</span></div>
        <div class="meta-row"><span class="lbl">Purchase Order</span><span class="val">${g.poNumber ?? `PO-${g.purchaseOrderId}`}</span></div>
        ${g.vendorName ? `<div class="meta-row"><span class="lbl">Vendor</span><span class="val">${g.vendorName}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Date &amp; Status</h3>
        <div class="meta-row"><span class="lbl">Received Date</span><span class="val">${fmtDate(g.receivedDate)}</span></div>
        <div class="meta-row"><span class="lbl">Status</span><span class="val">${g.status}</span></div>
        ${items.length > 0 ? `<div class="meta-row"><span class="lbl">Products</span><span class="val">${items.length} SKU${items.length !== 1 ? "s" : ""}</span></div>
        <div class="meta-row"><span class="lbl">Total Qty Received</span><span class="val">${totalReceived}</span></div>` : ""}
      </div>
    </div>
    ${g.notes ? `<div class="note-box"><strong>Notes</strong>${g.notes}</div>` : ""}
    ${itemsHtml}
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">Goods received and verified by Customize Duniya Warehouse Team.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px;">
      <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;">Received By (Signature)</div>
      <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;">Authorised By (Signature)</div>
    </div>
  `;
  openWin(g.grnNumber, html);
}

export function printDeliveryChallan(shipment: {
  shipmentNumber: string;
  salesOrderId: number;
  orderNumber?: string | null;
  courierPartner: string;
  trackingNumber?: string | null;
  dispatchDate?: string | null;
  estimatedDelivery?: string | null;
  numberOfBoxes?: number | null;
  totalWeight?: number | null;
  freightCost?: number;
  items?: Array<{ deliveryName: string; address: string; awbNumber?: string | null; status: string }>;
}) {
  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const items = shipment.items ?? [];

  const deliveryRows = items.map(it => `<tr>
    <td class="font-bold">${it.deliveryName}</td>
    <td style="word-break:break-word;">${it.address}</td>
    <td style="font-family:monospace;font-size:11px;word-break:break-all;">${it.awbNumber || "—"}</td>
    <td>${it.status}</td>
  </tr>`).join("");

  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Delivery Challan</div></div>
      <div class="doc-id">
        <h1>${shipment.shipmentNumber}</h1>
        <div class="date">${shipment.dispatchDate ? fmtDate(shipment.dispatchDate) : printedOn()}</div>
        <span class="badge badge-default">${shipment.courierPartner}</span>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Shipment Info</h3>
        <div class="meta-row"><span class="lbl">Shipment #</span><span class="val">${shipment.shipmentNumber}</span></div>
        <div class="meta-row"><span class="lbl">Sales Order</span><span class="val">${shipment.orderNumber ?? `SO-${shipment.salesOrderId}`}</span></div>
        <div class="meta-row"><span class="lbl">Courier</span><span class="val">${shipment.courierPartner}</span></div>
        ${shipment.trackingNumber ? `<div class="meta-row"><span class="lbl">Tracking #</span><span class="val" style="font-family:monospace;">${shipment.trackingNumber}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Dispatch Details</h3>
        <div class="meta-row"><span class="lbl">Dispatch Date</span><span class="val">${fmtDate(shipment.dispatchDate)}</span></div>
        <div class="meta-row"><span class="lbl">Est. Delivery</span><span class="val">${fmtDate(shipment.estimatedDelivery)}</span></div>
        ${shipment.numberOfBoxes != null ? `<div class="meta-row"><span class="lbl">Boxes</span><span class="val">${shipment.numberOfBoxes}</span></div>` : ""}
        ${shipment.totalWeight != null ? `<div class="meta-row"><span class="lbl">Total Weight</span><span class="val">${shipment.totalWeight} kg</span></div>` : ""}
        ${shipment.freightCost && shipment.freightCost > 0 ? `<div class="meta-row"><span class="lbl">Freight Cost</span><span class="val">₹${Number(shipment.freightCost).toLocaleString("en-IN")}</span></div>` : ""}
      </div>
    </div>
    ${items.length > 0 ? `
      <div class="section-title">Delivery Addresses</div>
      <table>
        <thead><tr>
          <th style="width:22%;">Name</th>
          <th style="width:44%;">Address</th>
          <th style="width:20%;">AWB #</th>
          <th style="width:14%;">Status</th>
        </tr></thead>
        <tbody>${deliveryRows}</tbody>
      </table>
    ` : ""}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px;">
      <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;">Prepared By (Signature)</div>
      <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;">Received By (Signature)</div>
    </div>
  `;
  openWin(shipment.shipmentNumber, html);
}

export function printTaxInvoice(inv: {
  invoiceNumber: string;
  clientName: string | null;
  clientGst?: string | null;
  billingAddress?: string | null;
  salesOrderId?: number | null;
  orderNumber?: string | null;
  createdAt: string;
  totalAmount: number;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  grandTotal: number;
  amountInWords?: string | null;
  lines?: Array<{
    description: string;
    hsnCode?: string | null;
    quantity: number;
    uom?: string | null;
    unitPrice: number;
    lineTotal: number;
    gstRate: number;
    cgst?: number | null;
    sgst?: number | null;
    igst?: number | null;
    lineGrandTotal: number;
  }>;
}) {
  const isIntra = (Number(inv.cgst ?? 0) + Number(inv.sgst ?? 0)) > 0;
  const lines = inv.lines ?? [];
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const fmt = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const lineRows = lines.map(l => `<tr>
    <td>${l.description}</td>
    <td>${l.hsnCode || "—"}</td>
    <td class="text-right">${l.quantity}${l.uom ? " " + l.uom : ""}</td>
    <td class="text-right">₹${fmt(l.unitPrice)}</td>
    <td class="text-right">₹${fmt(l.lineTotal)}</td>
    <td class="text-center">${l.gstRate}%</td>
    ${isIntra
      ? `<td class="text-right">₹${fmt(l.cgst)}</td><td class="text-right">₹${fmt(l.sgst)}</td>`
      : `<td class="text-right">₹${fmt(l.igst)}</td>`}
    <td class="text-right font-bold">₹${fmt(l.lineGrandTotal)}</td>
  </tr>`).join("");

  const gstHeaders = isIntra
    ? `<th class="text-right" style="width:9%;">CGST</th><th class="text-right" style="width:9%;">SGST</th>`
    : `<th class="text-right" style="width:18%;">IGST</th>`;

  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Tax Invoice</div></div>
      <div class="doc-id">
        <h1>${inv.invoiceNumber}</h1>
        <div class="date">${fmtDate(inv.createdAt)}</div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-section">
        <h3>Bill To</h3>
        <div class="meta-row"><span class="lbl">Client</span><span class="val">${inv.clientName ?? "—"}</span></div>
        ${inv.clientGst ? `<div class="meta-row"><span class="lbl">GSTIN</span><span class="val" style="font-family:monospace;font-size:11px;">${inv.clientGst}</span></div>` : ""}
        ${inv.billingAddress ? `<div class="meta-row"><span class="lbl">Address</span><span class="val" style="text-align:right;max-width:180px;">${inv.billingAddress}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Invoice Details</h3>
        <div class="meta-row"><span class="lbl">Invoice #</span><span class="val">${inv.invoiceNumber}</span></div>
        <div class="meta-row"><span class="lbl">Invoice Date</span><span class="val">${fmtDate(inv.createdAt)}</span></div>
        ${inv.orderNumber ? `<div class="meta-row"><span class="lbl">Sales Order</span><span class="val">${inv.orderNumber}</span></div>` : ""}
        <div class="meta-row"><span class="lbl">Supply Type</span><span class="val">${isIntra ? "Intra-State (CGST + SGST)" : "Inter-State (IGST)"}</span></div>
      </div>
    </div>
    ${lines.length > 0 ? `
      <div class="section-title">Line Items</div>
      <table style="font-size:11px;">
        <thead>
          <tr>
            <th style="width:27%;">Description</th>
            <th style="width:9%;">HSN</th>
            <th class="text-right" style="width:7%;">Qty</th>
            <th class="text-right" style="width:10%;">Rate</th>
            <th class="text-right" style="width:10%;">Taxable</th>
            <th class="text-center" style="width:7%;">GST%</th>
            ${gstHeaders}
            <th class="text-right" style="width:11%;">Total</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
      </table>
    ` : ""}
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div class="totals-box">
        <div class="total-row sub"><span>Taxable Amount</span><span>₹${fmt(inv.totalAmount)}</span></div>
        ${isIntra
          ? `<div class="total-row sub"><span>CGST</span><span>₹${fmt(inv.cgst)}</span></div>
             <div class="total-row sub"><span>SGST</span><span>₹${fmt(inv.sgst)}</span></div>`
          : `<div class="total-row sub"><span>IGST</span><span>₹${fmt(inv.igst)}</span></div>`}
        <div class="total-row final"><span>Grand Total</span><span>₹${fmt(inv.grandTotal)}</span></div>
      </div>
    </div>
    ${inv.amountInWords ? `<p style="font-style:italic;font-size:12px;color:#4b5563;margin-bottom:16px;">Amount in words: ${inv.amountInWords}</p>` : ""}
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:8px;">This is a computer-generated Tax Invoice. No signature required.</p>
  `;
  openWin(inv.invoiceNumber, html);
}
