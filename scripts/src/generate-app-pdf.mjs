import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("exports/GiftERP-Application-Overview.pdf");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const C = {
  teal: "#0d5c5c",
  amber: "#d97706",
  ink: "#1f2937",
  sub: "#6b7280",
  line: "#e5e7eb",
  light: "#f9fafb",
};

const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const PAGE_W = doc.page.width;
const ML = 50;
const MR = 50;
const CW = PAGE_W - ML - MR;
const BOTTOM = doc.page.height - 60;

function ensure(space) {
  if (doc.y + space > BOTTOM) doc.addPage();
}

function h1(text) {
  ensure(60);
  doc.moveDown(0.3);
  doc.fillColor(C.teal).font("Helvetica-Bold").fontSize(15).text(text, ML);
  const y = doc.y + 3;
  doc.moveTo(ML, y).lineTo(ML + CW, y).lineWidth(2).strokeColor(C.amber).stroke();
  doc.moveDown(0.6);
}

function h2(text) {
  ensure(40);
  doc.moveDown(0.3);
  doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(11.5).text(text, ML);
  doc.moveDown(0.2);
}

function para(text) {
  doc.fillColor(C.ink).font("Helvetica").fontSize(10).text(text, ML, doc.y, { width: CW, align: "left", lineGap: 2 });
  doc.moveDown(0.3);
}

function bullet(label, desc) {
  ensure(24);
  const startY = doc.y;
  doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(10).text("•", ML, startY, { width: 12 });
  doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(10).text(label, ML + 14, startY, { continued: true, width: CW - 14 });
  doc.fillColor(C.sub).font("Helvetica").fontSize(10).text(desc ? " — " + desc : "");
  doc.moveDown(0.2);
}

function table(headers, rows, widths) {
  const startX = ML;
  const rowH = 20;
  ensure(rowH + 30);
  let y = doc.y;
  doc.rect(startX, y, CW, rowH).fill(C.teal);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  let x = startX;
  headers.forEach((hdr, i) => {
    doc.text(hdr, x + 6, y + 6, { width: widths[i] - 12 });
    x += widths[i];
  });
  y += rowH;
  rows.forEach((row, ri) => {
    let maxLines = 1;
    row.forEach((cell, i) => {
      const h = doc.font("Helvetica").fontSize(9).heightOfString(String(cell), { width: widths[i] - 12 });
      maxLines = Math.max(maxLines, Math.ceil(h / 11));
    });
    const thisH = Math.max(rowH, maxLines * 11 + 8);
    if (y + thisH > BOTTOM) {
      doc.addPage();
      y = doc.y;
    }
    if (ri % 2 === 0) doc.rect(startX, y, CW, thisH).fill(C.light);
    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor(i === 0 ? C.ink : C.sub).font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      doc.text(String(cell), x + 6, y + 5, { width: widths[i] - 12 });
      x += widths[i];
    });
    doc.moveTo(startX, y + thisH).lineTo(startX + CW, y + thisH).lineWidth(0.5).strokeColor(C.line).stroke();
    y += thisH;
  });
  doc.y = y + 8;
}

// ---------- TITLE BANNER ----------
doc.rect(0, 0, PAGE_W, 140).fill(C.teal);
doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(28).text("GiftERP", ML, 40);
doc.fillColor("#fcd34d").font("Helvetica-Bold").fontSize(14).text("Application Overview", ML, 78);
doc.fillColor("#d1fae5").font("Helvetica").fontSize(9.5).text(
  "An end-to-end ERP for running a corporate gifting business — CRM, catalog, orders, warehouse, logistics and finance in one place.",
  ML, 102, { width: CW }
);
doc.y = 160;
doc.fillColor(C.sub).font("Helvetica").fontSize(9).text(
  "Generated " + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  ML
);
doc.moveDown(0.5);

// ---------- WHAT IS IT ----------
h1("What is GiftERP?");
para(
  "GiftERP is a full-stack ERP purpose-built for corporate gifting companies. It covers the complete commercial workflow — from finding and qualifying a lead, quoting and winning the deal, sourcing and assembling the gift kits, to shipping, invoicing and collecting payment. Everything runs in a single web application with a live analytics dashboard, so sales, operations and finance teams work off the same real-time data."
);
para(
  "The system is organised into eight functional areas spanning twenty-plus modules. All monetary values use Indian Rupees (₹) with GST-aware tax handling, making it suited to Indian operations."
);

// ---------- AT A GLANCE ----------
h1("At a Glance");
bullet("8 functional areas", "Overview, CRM, Catalog, Orders, Operations, Logistics, Finance, Admin.");
bullet("Real-time dashboard", "KPI cards, revenue trend, sales pipeline, top products, AR aging and a sales leaderboard.");
bullet("Quote-to-cash", "Leads → Opportunities → Quotes → Sales Orders → Invoices → Payments, fully linked.");
bullet("Procure-to-receive", "Purchase Orders → Goods Receipts (GRN) → Inventory, with vendor tracking.");
bullet("Warehouse & production", "Inventory, storage locations, kit assembly and artwork approval workflows.");
bullet("Secure access", "Token-based login with role-aware user management.");

// ---------- TECH STACK ----------
h1("Technology");
table(
  ["Layer", "Technology"],
  [
    ["Frontend", "React + TypeScript, Vite, Tailwind CSS, Shadcn/UI (Radix)"],
    ["Routing", "wouter (lightweight client-side routing)"],
    ["Data layer", "TanStack Query with a generated, type-safe API client"],
    ["Forms & validation", "react-hook-form + Zod schemas"],
    ["Charts & icons", "Recharts for analytics, lucide-react for iconography"],
    ["Backend", "Express 5 (Node.js) REST API"],
    ["Database", "PostgreSQL with Drizzle ORM"],
    ["Auth", "Token-based (Bearer/JWT), route-guarded login"],
  ],
  [120, CW - 120]
);

// ---------- MODULES BY AREA ----------
h1("Modules by Functional Area");

h2("Overview");
bullet("Dashboard", "Real-time business health: KPI cards, revenue trend & pipeline charts, top products, AR aging, sales leaderboard and top clients.");

h2("CRM — Customer Relationship Management");
bullet("Clients", "Directory of corporate clients with search, industry filtering and contact details.");
bullet("Client Detail", "360° client view with contacts, interaction logging (calls/emails/meetings) and activity history.");
bullet("Leads", "Pipeline of potential business across stages (New, Qualified, Proposal…) with estimated values.");
bullet("Opportunities", "Qualified deals tracked by value, win probability and expected close date.");
bullet("Quotes", "Line-item quotation builder with discounts, GST, validity dates and status (Draft / Sent / Accepted).");

h2("Catalog — Product Management");
bullet("Products", "Master product list with pricing (cost/selling), categories and low-stock thresholds.");
bullet("Bundles", "Gift-kit builder that groups products into curated sets, including a “Suggest Bundle” tool by occasion and budget.");
bullet("Categories", "Hierarchical catalog organisation via names and slugs.");

h2("Orders & Procurement");
bullet("Sales Orders", "Client orders through the fulfilment lifecycle (Draft → Delivered) with multi-item entry and occasion tagging.");
bullet("Sales Order Detail", "Status advancement, delivery addresses and internal notes.");
bullet("Purchase Orders", "Vendor procurement, linkable to sales orders for back-to-back ordering.");
bullet("Purchase Order Detail", "Tracks delivery and receipt progress against vendors.");
bullet("Vendors", "Supplier directory with contact info, lead times and performance.");

h2("Operations & Warehouse");
bullet("Inventory", "Stock monitoring with manual inward/outward adjustments and batch tracking.");
bullet("Locations", "Warehouse bins, zones and storage types to optimise picking and placement.");
bullet("Goods Receipts (GRN)", "Receive goods against POs with partial-receipt and quality-rejection logging.");
bullet("Assembly", "Production tracking for building kits/bundles (Pending / In Progress / Completed).");
bullet("Artwork", "Creative approval workflow for branding assets (logos, mockups) and client sign-off.");

h2("Logistics");
bullet("Shipments", "Courier and delivery management linking sales orders to carriers and tracking numbers.");

h2("Finance");
bullet("Invoices", "Tax invoices generated from sales orders with automated GST and due-date tracking.");
bullet("Payments", "Accounts-receivable logging of advance, partial and full payments against invoices.");
bullet("Credit Notes", "Returns and billing adjustments, issuing credit against client accounts.");

h2("Admin");
bullet("Users", "Identity & access management — accounts and roles (Admin, Sales, Warehouse…).");
bullet("Settings", "Global configuration: company profile, GST/PAN tax IDs and document number prefixes.");

// ---------- WORKFLOWS ----------
h1("How the Pieces Connect");
h2("Quote-to-Cash");
para("Lead → Opportunity → Quote → Sales Order → Invoice → Payment. Each step carries data forward, so a won opportunity becomes a quote, an accepted quote becomes an order, and a fulfilled order becomes an invoice tracked through to payment.");
h2("Procure-to-Receive");
para("A sales order can spawn a linked Purchase Order to a vendor. Goods are received via a GRN (supporting partial receipts and rejections), which updates Inventory. Kits are then built in Assembly and shipped via Logistics.");

// ---------- FOOTER ----------
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  const fy = doc.page.height - 38;
  doc.moveTo(ML, fy).lineTo(ML + CW, fy).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.fillColor(C.sub).font("Helvetica").fontSize(8);
  doc.text("GiftERP · Application Overview", ML, fy + 6, { width: CW / 2, align: "left" });
  doc.text("Page " + (i + 1) + " of " + range.count, ML + CW / 2, fy + 6, { width: CW / 2, align: "right" });
}

doc.end();
console.log("Wrote", OUT);
