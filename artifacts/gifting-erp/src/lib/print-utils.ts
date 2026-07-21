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

const GST_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 18px; }
  .top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
  .top-gstin { font-size: 10px; }
  .top-right { text-align: right; font-size: 10px; line-height: 1.8; }
  .doc-title { text-align: center; font-size: 15px; font-weight: bold; margin: 4px 0; text-decoration: underline; letter-spacing: 1px; }
  .company-header { text-align: center; margin: 6px 0 8px; line-height: 1.7; }
  .company-name { font-size: 20px; font-weight: bold; }
  .company-sub { font-size: 10px; }
  hr { border: 0; border-top: 1px solid #000; margin: 6px 0; }
  .doc-meta { display: flex; justify-content: space-between; padding: 4px 0 6px; font-size: 11px; }
  .party-block { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; margin-bottom: 6px; }
  .party-col { padding: 6px 8px; font-size: 10px; line-height: 1.7; }
  .party-col:first-child { border-right: 1px solid #000; }
  .party-label { font-weight: bold; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th, td { border: 1px solid #000; padding: 4px 5px; font-size: 10px; }
  th { text-align: center; font-weight: bold; background: #f9f9f9; line-height: 1.4; }
  td { vertical-align: middle; }
  .num { text-align: right; }
  .ctr { text-align: center; }
  .bold { font-weight: bold; }
  .words-row { border: 1px solid #000; padding: 5px 8px; font-size: 10px; margin-bottom: 6px; }
  .declaration { text-align: center; font-size: 10px; margin: 6px 0 8px; }
  .declaration b { display: block; text-decoration: underline; margin-bottom: 3px; }
  .bank { font-size: 10px; margin: 0 0 8px; line-height: 1.9; }
  .footer-row { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; margin-top: 6px; min-height: 110px; }
  .footer-left { padding: 8px; font-size: 10px; border-right: 1px solid #000; line-height: 1.8; }
  .footer-right { padding: 8px; font-size: 10px; text-align: right; display: flex; flex-direction: column; justify-content: space-between; }
  .sig-block { border-top: 1px solid #000; padding-top: 4px; margin-top: 6px; }
  @media print { body { padding: 0; } @page { margin: 10mm; size: A4; } }
`;

const CO = {
  gstin: "36CSNPK3414P1Z7",
  pan: "CSNPK3414P",
  name: "CUSTOMIZE DUNIYA",
  address: "Plot No 32 & 33, 1st Floor, Sathya Mansion, Chitta Reddy Colony, Tar Bund X Road, Secunderabad, Telangana 500003",
  email: "customizeduniya@gmail.com",
  bankAcct: "922030040473792",
  bankIfsc: "UTIB0000008",
  bankName: "Axis Bank",
  bankBranch: "Greenlands, Begumpet",
};

const DEFAULT_TC = [
  "We take confirmation through 50% payment advance with PO and the rest 50% during delivery.",
  "Goods once sold will not be taken back.",
  "Interest @ 18% p.a. will be charged if the payment is not made within the stipulated time.",
];

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

function gstOpenWin(title: string, html: string) {
  const w = window.open("", "_blank", "width=960,height=720,scrollbars=yes");
  if (!w) { alert("Pop-ups are blocked. Please allow pop-ups for this site to print."); return; }
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${GST_CSS}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

function fmtGstDate(d: string | null | undefined): string {
  if (!d) return printedOn();
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
}

function amountToWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tensArr = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function tw(n: number): string {
    if (n <= 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tensArr[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + tw(n % 100);
    if (n < 100000) return tw(Math.floor(n / 1000)) + "Thousand " + tw(n % 1000);
    if (n < 10000000) return tw(Math.floor(n / 100000)) + "Lakh " + tw(n % 100000);
    return tw(Math.floor(n / 10000000)) + "Crore " + tw(n % 10000000);
  }
  const r = Math.floor(amount);
  const p = Math.round((amount - r) * 100);
  let words = "Rupees " + (tw(r).trim() || "Zero");
  if (p > 0) words += " and Paisa " + tw(p).trim();
  return words + " Only";
}

interface GstLine {
  sn: number;
  description: string;
  hsnCode?: string | null;
  qty: number;
  unit: string;
  taxableUnitPrice: number;
  taxableLineTotal: number;
  cgstRate: number;
  cgstAmt: number;
  sgstRate: number;
  sgstAmt: number;
  lineGrandTotal: number;
}

function buildGstHtml(p: {
  docTitle: string;
  docNumber: string;
  docDate: string;
  docLabel: string;
  clientName: string;
  clientAddress?: string | null;
  clientGst?: string | null;
  clientPoc?: string | null;
  items: GstLine[];
  grandTotal: number;
  notes?: string | null;
  declarationLines?: string;
  termsAndConditions?: string | null;
  wordsOverride?: string;
}): string {
  const fmt = (n: number | null | undefined) =>
    Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalCgst = p.items.reduce((s, i) => s + i.cgstAmt, 0);
  const totalSgst = p.items.reduce((s, i) => s + i.sgstAmt, 0);
  const totalQty  = p.items.reduce((s, i) => s + i.qty, 0);

  const hsnMap = new Map<string, { taxable: number; cgst: number; sgst: number; rate: number }>();
  for (const it of p.items) {
    const key = it.hsnCode || "—";
    const ex = hsnMap.get(key) ?? { taxable: 0, cgst: 0, sgst: 0, rate: it.cgstRate + it.sgstRate };
    hsnMap.set(key, { taxable: ex.taxable + it.taxableLineTotal, cgst: ex.cgst + it.cgstAmt, sgst: ex.sgst + it.sgstAmt, rate: ex.rate });
  }

  const itemRows = p.items.map(it => `
    <tr>
      <td class="ctr">${it.sn}.</td>
      <td>${it.description}</td>
      <td class="ctr">${it.hsnCode || ""}</td>
      <td class="num">${it.qty.toFixed(2)}</td>
      <td class="ctr">${it.unit}</td>
      <td class="num">${fmt(it.taxableUnitPrice)}</td>
      <td class="ctr">${it.cgstRate.toFixed(2)} %</td>
      <td class="num">${fmt(it.cgstAmt)}</td>
      <td class="ctr">${it.sgstRate.toFixed(2)} %</td>
      <td class="num">${fmt(it.sgstAmt)}</td>
      <td class="num">${fmt(it.lineGrandTotal)}</td>
    </tr>`).join("");

  const hsnRows = Array.from(hsnMap.entries()).map(([hsn, v]) => `
    <tr>
      <td>${hsn}</td>
      <td class="ctr">${v.rate}%</td>
      <td class="num">${fmt(v.taxable)}</td>
      <td class="num">${fmt(v.cgst)}</td>
      <td class="num">${fmt(v.sgst)}</td>
      <td class="num">${fmt(v.cgst + v.sgst)}</td>
    </tr>`).join("");

  const addrHtml = (p.clientAddress || "").replace(/\n/g, "<br>");
  const decl = p.declarationLines || "Payment terms: 50% advance 50% Immediately post delivery<br>Shipment charges are applicable on actuals";
  const words = p.wordsOverride || amountToWords(p.grandTotal);

  const tcLines = (p.termsAndConditions || DEFAULT_TC.join("\n"))
    .split("\n").filter(Boolean)
    .map((line, i) => `${i + 1}. ${line.replace(/^\d+\.\s*/, "")}`)
    .join("<br>");

  return `
<div class="top-row">
  <div class="top-gstin">GSTIN : ${CO.gstin}</div>
  <div class="top-right">Original Copy<br>Pre Authenticated by<br><strong>for ${CO.name}</strong></div>
</div>

<div class="doc-title">${p.docTitle}</div>

<div class="company-header">
  <div class="company-name">${CO.name}</div>
  <div class="company-sub">${CO.address}</div>
  <div class="company-sub">PAN : ${CO.pan} &nbsp;&nbsp;&nbsp; email : ${CO.email}</div>
</div>

<hr>

<div class="doc-meta">
  <span><strong>${p.docLabel} No.</strong>&nbsp;&nbsp;: ${p.docNumber}</span>
  <span><strong>Date</strong>&nbsp;&nbsp;: ${p.docDate}</span>
</div>

<div class="party-block">
  <div class="party-col">
    <div class="party-label">${p.docLabel} to :</div>
    <strong>${p.clientName}</strong>
    ${addrHtml ? `<br>${addrHtml}` : ""}
    ${p.clientPoc ? `<br>POC: ${p.clientPoc}` : ""}
    ${p.clientGst ? `<br>GSTIN / UIN &nbsp;&nbsp;&nbsp; : ${p.clientGst}` : ""}
  </div>
  <div class="party-col">
    <div class="party-label">Shipped to :</div>
    <strong>${p.clientName}</strong>
    ${addrHtml ? `<br>${addrHtml}` : ""}
    ${p.clientPoc ? `<br>POC: ${p.clientPoc}` : ""}
    ${p.clientGst ? `<br>GSTIN / UIN &nbsp;&nbsp;&nbsp; : ${p.clientGst}` : ""}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:4%">S.N.</th>
      <th style="width:23%">Description of Goods</th>
      <th style="width:9%">HSN/SAC<br>Code</th>
      <th style="width:6%">Qty.</th>
      <th style="width:5%">Unit</th>
      <th style="width:8%">Price</th>
      <th style="width:6%">CGST<br>Rate</th>
      <th style="width:8%">CGST<br>Amount</th>
      <th style="width:6%">SGST<br>Rate</th>
      <th style="width:8%">SGST<br>Amount</th>
      <th style="width:10%">Amount(&#8377;)</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows || `<tr><td colspan="11" class="ctr" style="padding:14px">No items</td></tr>`}
    <tr class="bold">
      <td colspan="3" class="ctr">Grand Total</td>
      <td class="num">${totalQty.toFixed(2)} Pcs</td>
      <td></td><td></td><td></td>
      <td class="num">${fmt(totalCgst)}</td>
      <td></td>
      <td class="num">${fmt(totalSgst)}</td>
      <td class="num">&#8377;&nbsp;${fmt(p.grandTotal)}</td>
    </tr>
  </tbody>
</table>

<table>
  <thead>
    <tr>
      <th>HSN/SAC</th>
      <th>Tax Rate</th>
      <th>Taxable Amt.</th>
      <th>CGST Amt.</th>
      <th>SGST Amt.</th>
      <th>Total Tax</th>
    </tr>
  </thead>
  <tbody>
    ${hsnRows || `<tr><td colspan="6" class="ctr">—</td></tr>`}
  </tbody>
</table>

<div class="words-row">${words}</div>

${p.notes ? `<div style="font-size:10px;margin:4px 0 6px"><strong>Notes:</strong> ${p.notes}</div>` : ""}

<div class="declaration">
  <b>Declaration</b>
  ${decl}
</div>

<div class="bank">
  Bank Details : ACCN NO: ${CO.bankAcct}, IFSC code: ${CO.bankIfsc}<br>
  <span style="display:inline-block;width:82px">&nbsp;</span>BANK: ${CO.bankName}, Branch: ${CO.bankBranch}
</div>

<div class="footer-row">
  <div class="footer-left">
    <strong>Terms &amp; Conditions</strong><br>
    ${tcLines}
  </div>
  <div class="footer-right">
    <div>Receiver's Signature &nbsp;&nbsp;:</div>
    <div>
      <div>For ${CO.name}</div>
      <div class="sig-block"><strong>Authorised Signatory</strong></div>
    </div>
  </div>
</div>`;
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
  const gstAmount = Number(order.gstAmount) || 0;
  const grandTotal = Number(order.grandTotal) || (subtotal + gstAmount);
  const discountAmt = discountPct > 0 && subtotal > 0
    ? subtotal / (1 - discountPct / 100) * (discountPct / 100)
    : 0;

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
  clientName?: string | null;
  contactPerson?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientGst?: string | null;
  billingAddress?: string | null;
  totalAmount: number;
  gstAmount: number;
  subtotal?: number;
  discountPct?: number | null;
  validUntil?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  paymentTerms?: string | null;
  status?: string;
  createdAt?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    hsnCode?: string | null;
    imageUrl?: string | null;
  }>;
}) {
  const disc = 1 - (Number(q.discountPct ?? 0) / 100);
  const gstItems: GstLine[] = (q.items ?? []).map((it, idx) => {
    const taxableLine = it.lineTotal * disc;
    const cgst = taxableLine * 0.09;
    const sgst = taxableLine * 0.09;
    return {
      sn: idx + 1,
      description: it.description,
      hsnCode: it.hsnCode ?? null,
      qty: it.quantity,
      unit: "Pcs",
      taxableUnitPrice: it.unitPrice * disc,
      taxableLineTotal: taxableLine,
      cgstRate: 9,
      cgstAmt: cgst,
      sgstRate: 9,
      sgstAmt: sgst,
      lineGrandTotal: taxableLine + cgst + sgst,
    };
  });

  const poc = [q.contactPerson, q.clientPhone ? `(${q.clientPhone})` : null].filter(Boolean).join(" ");
  const decl = q.paymentTerms
    ? `Payment terms: ${q.paymentTerms}<br>Shipment charges are applicable on actuals`
    : "Payment terms: 50% advance 50% Immediately post delivery<br>Shipment charges are applicable on actuals";

  gstOpenWin(q.quoteNumber, buildGstHtml({
    docTitle: "SALES QUOTATION",
    docNumber: q.quoteNumber,
    docDate: fmtGstDate(q.createdAt),
    docLabel: "Quotation",
    clientName: q.clientName ?? "—",
    clientAddress: q.billingAddress,
    clientGst: q.clientGst,
    clientPoc: poc || undefined,
    items: gstItems,
    grandTotal: Number(q.totalAmount),
    notes: q.notes,
    declarationLines: decl,
    termsAndConditions: q.termsAndConditions,
  }));
}

export function printProformaInvoice(pi: {
  piNumber: string;
  clientName?: string | null;
  contactPerson?: string | null;
  clientPhone?: string | null;
  clientGst?: string | null;
  billingAddress?: string | null;
  subtotal: number;
  discountPct: number;
  gstAmount: number;
  totalAmount: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  paymentTerms?: string | null;
  createdAt: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    hsnCode?: string | null;
  }>;
}) {
  const disc = 1 - (pi.discountPct / 100);
  const gstItems: GstLine[] = (pi.items ?? []).map((it, idx) => {
    const taxableLine = it.lineTotal * disc;
    const cgst = taxableLine * 0.09;
    const sgst = taxableLine * 0.09;
    return {
      sn: idx + 1,
      description: it.description,
      hsnCode: it.hsnCode ?? null,
      qty: it.quantity,
      unit: "Pcs",
      taxableUnitPrice: it.unitPrice * disc,
      taxableLineTotal: taxableLine,
      cgstRate: 9,
      cgstAmt: cgst,
      sgstRate: 9,
      sgstAmt: sgst,
      lineGrandTotal: taxableLine + cgst + sgst,
    };
  });

  const poc = [pi.contactPerson, pi.clientPhone ? `(${pi.clientPhone})` : null].filter(Boolean).join(" ");
  const decl = pi.paymentTerms
    ? `Payment terms: ${pi.paymentTerms}<br>Shipment charges are applicable on actuals`
    : "Payment terms: 50% advance 50% Immediately post delivery<br>Shipment charges are applicable on actuals";

  gstOpenWin(pi.piNumber, buildGstHtml({
    docTitle: "PROFORMA INVOICE",
    docNumber: pi.piNumber,
    docDate: fmtGstDate(pi.createdAt),
    docLabel: "Invoice",
    clientName: pi.clientName ?? "—",
    clientAddress: pi.billingAddress,
    clientGst: pi.clientGst,
    clientPoc: poc || undefined,
    items: gstItems,
    grandTotal: Number(pi.totalAmount),
    notes: pi.notes,
    declarationLines: decl,
    termsAndConditions: pi.termsAndConditions,
  }));
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
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
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
  contactPerson?: string | null;
  clientPhone?: string | null;
  salesOrderId?: number | null;
  orderNumber?: string | null;
  createdAt: string;
  totalAmount: number;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  grandTotal: number;
  amountInWords?: string | null;
  paymentTerms?: string | null;
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
  const lines = inv.lines ?? [];
  const gstItems: GstLine[] = lines.map((l, idx) => {
    const cgstAmt = Number(l.cgst ?? 0);
    const sgstAmt = Number(l.sgst ?? 0);
    const igstAmt = Number(l.igst ?? 0);
    const isIgst = igstAmt > 0 && cgstAmt === 0 && sgstAmt === 0;
    return {
      sn: idx + 1,
      description: l.description,
      hsnCode: l.hsnCode,
      qty: l.quantity,
      unit: l.uom || "Pcs",
      taxableUnitPrice: l.unitPrice,
      taxableLineTotal: l.lineTotal,
      cgstRate: isIgst ? l.gstRate : l.gstRate / 2,
      cgstAmt: isIgst ? igstAmt : cgstAmt,
      sgstRate: isIgst ? 0 : l.gstRate / 2,
      sgstAmt: isIgst ? 0 : sgstAmt,
      lineGrandTotal: l.lineGrandTotal,
    };
  });

  const poc = [inv.contactPerson, inv.clientPhone ? `(${inv.clientPhone})` : null].filter(Boolean).join(" ");
  const words = inv.amountInWords || amountToWords(Number(inv.grandTotal));
  const decl = inv.paymentTerms
    ? `Payment terms: ${inv.paymentTerms}<br>Shipment charges are applicable on actuals`
    : "Payment terms: 50% advance 50% Immediately post delivery<br>Shipment charges are applicable on actuals";

  gstOpenWin(inv.invoiceNumber, buildGstHtml({
    docTitle: "TAX INVOICE",
    docNumber: inv.invoiceNumber,
    docDate: fmtGstDate(inv.createdAt),
    docLabel: "Invoice",
    clientName: inv.clientName ?? "—",
    clientAddress: inv.billingAddress,
    clientGst: inv.clientGst,
    clientPoc: poc || undefined,
    items: gstItems,
    grandTotal: Number(inv.grandTotal),
    declarationLines: decl,
    wordsOverride: words,
  }));
}

export function printCatalogue(opts: {
  title: string;
  clientName?: string | null;
  products: Array<{
    id: number;
    name: string;
    sku?: string | null;
    brand?: string | null;
    category: string;
    sellingPrice: string | number;
    imageUrl?: string | null;
    brandable?: boolean;
  }>;
}) {
  const { title, clientName, products } = opts;

  const cardCss = `
    .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .cat-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; break-inside: avoid; }
    .cat-img { width: 100%; height: 150px; object-fit: cover; background: #ede9fe; display: block; }
    .cat-img-placeholder { width: 100%; height: 150px; background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%); display: flex; align-items: center; justify-content: center; font-size: 48px; }
    .cat-body { padding: 10px 12px 12px; }
    .cat-name { font-weight: 700; font-size: 12px; color: #1a1a2e; margin-bottom: 3px; line-height: 1.3; }
    .cat-cat { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .cat-price { font-size: 14px; font-weight: 800; color: #4338ca; }
    .cat-brand { font-size: 10px; color: #9ca3af; margin-top: 2px; }
    .cat-brandable { display: inline-block; font-size: 9px; font-weight: 700; color: #7c3aed; background: #ede9fe; border-radius: 4px; padding: 1px 5px; margin-top: 4px; }
    @media print { body { padding: 0; } @page { margin: 14mm; size: A4; } .cat-grid { grid-template-columns: repeat(3, 1fr); } }
  `;

  const productCards = products.map(p => `
    <div class="cat-card">
      ${p.imageUrl
        ? `<img class="cat-img" src="${p.imageUrl}" alt="${p.name}" />`
        : `<div class="cat-img-placeholder">🎁</div>`}
      <div class="cat-body">
        <div class="cat-name">${p.name}</div>
        <div class="cat-cat">${p.category}</div>
        <div class="cat-price">₹${Number(p.sellingPrice).toLocaleString("en-IN")}</div>
        ${p.brand ? `<div class="cat-brand">${p.brand}</div>` : ""}
        ${p.brandable ? `<div class="cat-brandable">✦ Brandable</div>` : ""}
      </div>
    </div>
  `).join("");

  const html = `
    <style>${cardCss}</style>
    <div class="doc-header">
      <div>
        <div class="brand">Customize Duniya</div>
        <div class="brand-sub">Corporate Gifting Solutions</div>
      </div>
      <div class="doc-id">
        <h1 style="font-size:20px;">${title}</h1>
        ${clientName ? `<div class="date" style="margin-top:4px;">Prepared for: <strong>${clientName}</strong></div>` : ""}
        <div class="date">Date: ${printedOn()}</div>
      </div>
    </div>

    <p style="font-size:12px;color:#6b7280;margin-bottom:20px;">
      ${products.length} product${products.length !== 1 ? "s" : ""} · All prices are inclusive of applicable taxes.
      ${products.some(p => p.brandable) ? " ✦ = Can be branded with your company logo." : ""}
    </p>

    <div class="cat-grid">
      ${productCards}
    </div>

    <div style="margin-top:16px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:11px;color:#6b7280;background:#f9fafb;">
      <strong style="display:block;color:#374151;margin-bottom:3px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Terms &amp; Conditions</strong>
      Prices are indicative and subject to change based on quantity and customization. Minimum order quantities may apply.
      Delivery timelines vary by product. Please contact us for bulk pricing and branding options.
    </div>
  `;
  openWin(`Catalogue-${title}`, html);
}

export function printReturnNote(so: {
  sampleNumber: string;
  clientName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  opportunityTitle?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  items?: Array<{
    productName: string;
    quantity: number;
    returnedQty: number;
    disposition: "gift" | "invoice" | null;
    notes?: string | null;
  }>;
}) {
  const items = so.items ?? [];
  const customer = so.clientName ?? so.customerName ?? "—";
  const totalSent = items.reduce((s, i) => s + i.quantity, 0);
  const totalReturned = items.reduce((s, i) => s + i.returnedQty, 0);
  const totalKept = totalSent - totalReturned;

  const dispLabel = (d: "gift" | "invoice" | null, keptQty: number) => {
    if (keptQty === 0) return "—";
    if (d === "gift") return `<span style="color:#7c3aed;font-weight:700;">Gift</span>`;
    if (d === "invoice") return `<span style="color:#0369a1;font-weight:700;">Invoice</span>`;
    return `<span style="color:#d97706;font-weight:700;">Pending</span>`;
  };

  const itemRows = items.map(item => {
    const keptQty = item.quantity - item.returnedQty;
    return `<tr>
      <td class="font-bold">${item.productName}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-center">${item.returnedQty}</td>
      <td class="text-center">${keptQty > 0 ? keptQty : "—"}</td>
      <td class="text-center">${dispLabel(item.disposition, keptQty)}</td>
      <td style="color:#6b7280;">${item.notes ?? "—"}</td>
    </tr>`;
  }).join("");

  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Sample Return Note</div></div>
      <div class="doc-id">
        <h1>${so.sampleNumber}</h1>
        <div class="date">${new Date(so.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
        <span class="${badgeClass(so.status)}">${so.status}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-section">
        <h3>Customer</h3>
        <div class="meta-row"><span class="lbl">Name</span><span class="val">${customer}</span></div>
        ${so.customerPhone ? `<div class="meta-row"><span class="lbl">Phone</span><span class="val">${so.customerPhone}</span></div>` : ""}
        ${so.customerEmail ? `<div class="meta-row"><span class="lbl">Email</span><span class="val">${so.customerEmail}</span></div>` : ""}
        ${so.opportunityTitle ? `<div class="meta-row"><span class="lbl">Opportunity</span><span class="val">${so.opportunityTitle}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Return Summary</h3>
        <div class="meta-row"><span class="lbl">Sample #</span><span class="val">${so.sampleNumber}</span></div>
        <div class="meta-row"><span class="lbl">Total Sent</span><span class="val">${totalSent}</span></div>
        <div class="meta-row"><span class="lbl">Total Returned</span><span class="val">${totalReturned}</span></div>
        ${totalKept > 0 ? `<div class="meta-row"><span class="lbl">Kept by Customer</span><span class="val">${totalKept}</span></div>` : ""}
      </div>
    </div>

    ${so.notes ? `<div class="note-box"><strong>Notes</strong>${so.notes}</div>` : ""}

    <div class="section-title">Item-wise Return Details</div>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th class="text-center" style="width:75px;">Sent</th>
          <th class="text-center" style="width:80px;">Returned</th>
          <th class="text-center" style="width:65px;">Kept</th>
          <th class="text-center" style="width:85px;">Disposition</th>
          <th style="width:140px;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `<tr><td colspan="6" class="text-center" style="color:#9ca3af;padding:20px;">No items</td></tr>`}
      </tbody>
    </table>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px;">
      <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;">Customer Signature</div>
      <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;">Authorised By (Customize Duniya)</div>
    </div>
  `;
  openWin(`Return-${so.sampleNumber}`, html);
}

export function printSampleOrder(so: {
  sampleNumber: string;
  clientName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  opportunityTitle?: string | null;
  items?: Array<{ productName: string; quantity: number; notes?: string | null }>;
}) {
  const items = so.items ?? [];
  const customer = so.clientName ?? so.customerName ?? "—";
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const html = `
    <div class="doc-header">
      <div><div class="brand">Customize Duniya</div><div class="brand-sub">Sample Order — Product Samples for Evaluation</div></div>
      <div class="doc-id">
        <h1>${so.sampleNumber}</h1>
        <div class="date">${new Date(so.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
        <span class="${badgeClass(so.status)}">${so.status}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-section">
        <h3>Sample For</h3>
        <div class="meta-row"><span class="lbl">Customer</span><span class="val">${customer}</span></div>
        ${so.customerPhone ? `<div class="meta-row"><span class="lbl">Phone</span><span class="val">${so.customerPhone}</span></div>` : ""}
        ${so.customerEmail ? `<div class="meta-row"><span class="lbl">Email</span><span class="val">${so.customerEmail}</span></div>` : ""}
      </div>
      <div class="meta-section">
        <h3>Sample Details</h3>
        <div class="meta-row"><span class="lbl">Sample #</span><span class="val">${so.sampleNumber}</span></div>
        <div class="meta-row"><span class="lbl">Date</span><span class="val">${new Date(so.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
        <div class="meta-row"><span class="lbl">Status</span><span class="val">${so.status}</span></div>
        ${so.opportunityTitle ? `<div class="meta-row"><span class="lbl">Opportunity</span><span class="val">${so.opportunityTitle}</span></div>` : ""}
      </div>
    </div>

    ${so.notes ? `<div class="note-box"><strong>Notes</strong>${so.notes}</div>` : ""}

    <div class="section-title">Sample Items</div>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th class="text-center" style="width:80px;">Qty</th>
          <th style="width:220px;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${items.length ? items.map(item => `<tr>
          <td class="font-bold">${item.productName}</td>
          <td class="text-center">${item.quantity}</td>
          <td style="color:#6b7280;">${item.notes ?? "—"}</td>
        </tr>`).join("") : `<tr><td colspan="3" class="text-center" style="color:#9ca3af;padding:20px;">No items</td></tr>`}
      </tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div class="totals-box">
        <div class="total-row sub"><span>Total Items</span><span>${items.length}</span></div>
        <div class="total-row final"><span>Total Quantity</span><span>${totalQty}</span></div>
      </div>
    </div>

    <div style="margin-top:24px;padding:12px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:#6b7280;background:#f9fafb;">
      <strong style="display:block;color:#374151;margin-bottom:4px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Note</strong>
      These product samples are provided for evaluation purposes. Kindly review and share your feedback so we can proceed with your order.
    </div>

    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:20px;">Sample Order — Customize Duniya Corporate Gifting</p>
  `;
  openWin(so.sampleNumber, html);
}
