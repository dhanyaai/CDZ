import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("exports/GiftERP-Module-Reference.pdf");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const C = {
  teal: "#0d5c5c",
  amber: "#d97706",
  ink: "#1f2937",
  sub: "#6b7280",
  line: "#e5e7eb",
  light: "#f9fafb",
  chip: "#fef3c7",
};

const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const PAGE_W = doc.page.width;
const ML = 50;
const CW = PAGE_W - ML - 50;
const BOTTOM = doc.page.height - 60;

function ensure(space) {
  if (doc.y + space > BOTTOM) doc.addPage();
}
function areaHeader(text) {
  ensure(50);
  doc.moveDown(0.4);
  doc.rect(ML, doc.y, CW, 24).fill(C.teal);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13).text(text, ML + 8, doc.y + 6);
  doc.moveDown(0.4);
  doc.y += 6;
}
function moduleCard(name, route, purpose, features) {
  const needed = 40 + features.length * 14;
  ensure(needed);
  doc.moveDown(0.2);
  // name + route
  const y = doc.y;
  doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(11.5).text(name, ML, y, { continued: true });
  doc.fillColor(C.sub).font("Helvetica-Oblique").fontSize(9).text("   " + route);
  doc.moveDown(0.15);
  doc.fillColor(C.ink).font("Helvetica").fontSize(9.5).text(purpose, ML, doc.y, { width: CW, lineGap: 1.5 });
  doc.moveDown(0.2);
  features.forEach((f) => {
    ensure(16);
    const sy = doc.y;
    doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(9.5).text("›", ML + 6, sy, { width: 12 });
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(9.5).text(f[0], ML + 20, sy, { continued: true, width: CW - 20 });
    doc.fillColor(C.sub).font("Helvetica").fontSize(9.5).text(f[1] ? " — " + f[1] : "");
    doc.moveDown(0.1);
  });
  doc.moveDown(0.25);
  const ly = doc.y;
  doc.moveTo(ML, ly).lineTo(ML + CW, ly).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.moveDown(0.2);
}

// ---------- TITLE ----------
doc.rect(0, 0, PAGE_W, 130).fill(C.teal);
doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(26).text("GiftERP", ML, 38);
doc.fillColor("#fcd34d").font("Helvetica-Bold").fontSize(14).text("Module Reference Guide", ML, 74);
doc.fillColor("#d1fae5").font("Helvetica").fontSize(9.5).text(
  "Detailed breakdown of every module — purpose, key actions and statuses.",
  ML, 98, { width: CW }
);
doc.y = 150;
doc.fillColor(C.sub).font("Helvetica").fontSize(9).text(
  "Generated " + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
  "  ·  21 modules across 8 areas",
  ML
);
doc.moveDown(0.4);

// ---------- OVERVIEW ----------
areaHeader("OVERVIEW");
moduleCard("Dashboard", "/dashboard",
  "The landing page and real-time command centre, summarising the health of the whole business.",
  [
    ["KPI cards", "Total Clients, Active Orders, Pending Assembly, Overdue Invoices, Low Stock Items, Pending POs"],
    ["Charts", "Revenue Overview (area) with 3/6/12/24-month filter, and Sales Pipeline (bar)"],
    ["Widgets", "Top Products, Sales Leaderboard, AR Aging buckets"],
    ["Top Clients", "Highest-value clients by revenue and order count"],
  ]
);

// ---------- CRM ----------
areaHeader("CRM — Customer Relationship Management");
moduleCard("Clients", "/clients",
  "Directory of corporate client accounts.",
  [
    ["Manage", "Create clients, search and filter by industry"],
    ["Details", "Company contact details and account summary"],
  ]
);
moduleCard("Client Detail", "/clients/:id",
  "A 360-degree view of a single client account.",
  [
    ["Contacts", "Manage multiple contact people per client"],
    ["Activity log", "Record calls, emails and meetings; view full interaction history"],
  ]
);
moduleCard("Leads", "/leads",
  "Pipeline for tracking potential new business before it qualifies.",
  [
    ["Stages", "New, Qualified, Proposal and beyond"],
    ["Value", "Estimated deal value per lead"],
  ]
);
moduleCard("Opportunities", "/opportunities",
  "Qualified deals being actively worked toward a close.",
  [
    ["Tracking", "Deal value, win probability and expected close date"],
    ["Ownership", "Assigned owner feeds the dashboard sales leaderboard"],
  ]
);
moduleCard("Quotes", "/quotes",
  "Quotation builder for sending priced proposals to clients.",
  [
    ["Line items", "Add multiple products/services with quantity and unit price"],
    ["Pricing", "Discounts and automatic 18% GST calculation"],
    ["Lifecycle", "Validity dates and status: Draft, Sent, Accepted"],
  ]
);

// ---------- CATALOG ----------
areaHeader("CATALOG — Product Management");
moduleCard("Products", "/products",
  "The master list of all sellable products.",
  [
    ["Attributes", "Description, category, cost price and selling price"],
    ["Stock", "Low-stock thresholds with a Low Stock filter toggle"],
  ]
);
moduleCard("Bundles", "/bundles",
  "Builder for curated gift sets / kits made from multiple products.",
  [
    ["Compose", "Group products into a single sellable bundle"],
    ["Suggest Bundle", "Wand tool that proposes kits based on occasion and budget"],
  ]
);
moduleCard("Categories", "/categories",
  "Hierarchical organisation of the product catalog.",
  [
    ["Structure", "Category names and URL slugs for grouping products"],
  ]
);

// ---------- ORDERS ----------
areaHeader("ORDERS & PROCUREMENT");
moduleCard("Sales Orders", "/sales-orders",
  "Client orders moving through the fulfilment lifecycle.",
  [
    ["Lifecycle", "Draft → Confirmed → … → Delivered"],
    ["Entry", "Multi-item orders with occasion tagging (e.g. Diwali)"],
  ]
);
moduleCard("Sales Order Detail", "/sales-orders/:id",
  "Full detail and management view of a single sales order.",
  [
    ["Advance status", "Move the order through its stages"],
    ["Logistics", "Multiple delivery addresses and internal notes"],
  ]
);
moduleCard("Purchase Orders", "/purchase-orders",
  "Procurement orders raised to vendors.",
  [
    ["Back-to-back", "Optionally linked to a sales order"],
    ["Status", "Tracks open → fully received"],
  ]
);
moduleCard("Purchase Order Detail", "/purchase-order-detail/:id",
  "Detail view tracking receipt progress against a PO.",
  [
    ["Line progress", "Received vs ordered quantity per item with progress bars"],
    ["Totals", "Per-line and order totals in ₹"],
  ]
);
moduleCard("Vendors", "/vendors",
  "Directory of suppliers used for procurement.",
  [
    ["Profile", "Contact information and lead times"],
    ["Performance", "Vendor performance metrics"],
  ]
);

// ---------- OPERATIONS ----------
areaHeader("OPERATIONS & WAREHOUSE");
moduleCard("Inventory", "/inventory",
  "Live stock levels and movement across the warehouse.",
  [
    ["Adjustments", "Manual inward / outward stock movements"],
    ["Tracking", "Batch tracking and low-stock highlighting"],
  ]
);
moduleCard("Locations", "/locations",
  "Physical storage structure of the warehouse.",
  [
    ["Definition", "Bins, zones and storage types for picking/placement"],
  ]
);
moduleCard("Goods Receipts (GRN)", "/grn",
  "Receiving process for goods arriving against purchase orders.",
  [
    ["Partial receipts", "Receive part of a PO at a time"],
    ["Quality", "Log quality rejections on receipt"],
  ]
);
moduleCard("Assembly", "/assembly",
  "Production tracking for building bundles and gift kits.",
  [
    ["Jobs", "Status: Pending, In Progress, Completed"],
    ["Output", "Kit counts per job"],
  ]
);
moduleCard("Artwork", "/artwork",
  "Creative approval workflow for branded/custom gifts.",
  [
    ["Assets", "Manage logos and mockups per order"],
    ["Approval", "Track client sign-off status"],
  ]
);

// ---------- LOGISTICS ----------
areaHeader("LOGISTICS");
moduleCard("Shipments", "/shipments",
  "Courier and delivery management for outbound orders.",
  [
    ["Carriers", "Link sales orders to courier partners"],
    ["Tracking", "Store tracking numbers and delivery status"],
  ]
);

// ---------- FINANCE ----------
areaHeader("FINANCE");
moduleCard("Invoices", "/invoices",
  "Billing documents generated from sales orders.",
  [
    ["Generation", "Create tax invoices from confirmed orders"],
    ["Tax & dates", "Automated GST calculation and due-date tracking"],
  ]
);
moduleCard("Payments", "/payments",
  "Accounts-receivable record of money collected.",
  [
    ["Logging", "Advance, partial and full payments against invoices"],
    ["Linkage", "Each payment ties back to a specific invoice"],
  ]
);
moduleCard("Credit Notes", "/credit-notes",
  "Returns and billing adjustments issued to clients.",
  [
    ["Adjustments", "Issue credit against a client account for returns/corrections"],
  ]
);

// ---------- ADMIN ----------
areaHeader("ADMIN");
moduleCard("Users", "/users",
  "Identity and access management.",
  [
    ["Accounts", "Create and manage user accounts"],
    ["Roles", "Admin, Sales, Warehouse and other roles"],
  ]
);
moduleCard("Settings", "/settings",
  "Global ERP configuration.",
  [
    ["Company", "Company profile and branding"],
    ["Compliance", "GST / PAN tax IDs"],
    ["Numbering", "Document prefixes for quotes, invoices, etc."],
  ]
);

// ---------- FOOTER ----------
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  const fy = doc.page.height - 38;
  doc.moveTo(ML, fy).lineTo(ML + CW, fy).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.fillColor(C.sub).font("Helvetica").fontSize(8);
  doc.text("GiftERP · Module Reference", ML, fy + 6, { width: CW / 2, align: "left" });
  doc.text("Page " + (i + 1) + " of " + range.count, ML + CW / 2, fy + 6, { width: CW / 2, align: "right" });
}

doc.end();
console.log("Wrote", OUT);
