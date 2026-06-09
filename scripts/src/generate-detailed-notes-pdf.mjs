import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("exports/CustomizeDuniya-Detailed-Notes.pdf");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const C = {
  teal: "#0d5c5c",
  amber: "#d97706",
  ink: "#1f2937",
  sub: "#6b7280",
  line: "#e5e7eb",
  light: "#f9fafb",
  tealSoft: "#e8f0f0",
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
function h1(text) {
  ensure(54);
  doc.moveDown(0.5);
  doc.rect(ML, doc.y, CW, 26).fill(C.teal);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13.5).text(text, ML + 9, doc.y + 6.5);
  doc.y += 26;
  doc.moveDown(0.45);
}
function h2(text) {
  ensure(30);
  doc.moveDown(0.25);
  doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(11.5).text(text, ML);
  doc.moveDown(0.15);
}
function para(text) {
  ensure(24);
  doc.fillColor(C.ink).font("Helvetica").fontSize(9.5).text(text, ML, doc.y, { width: CW, lineGap: 2 });
  doc.moveDown(0.25);
}
function bullets(items) {
  items.forEach((it) => {
    ensure(16);
    const sy = doc.y;
    doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(9.5).text("\u2022", ML + 4, sy, { width: 12 });
    if (Array.isArray(it)) {
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(9.5).text(it[0], ML + 18, sy, { continued: true, width: CW - 18 });
      doc.fillColor(C.sub).font("Helvetica").fontSize(9.5).text(it[1] ? " \u2014 " + it[1] : "");
    } else {
      doc.fillColor(C.ink).font("Helvetica").fontSize(9.5).text(it, ML + 18, sy, { width: CW - 18, lineGap: 1.5 });
    }
    doc.moveDown(0.12);
  });
}

// two-column key/value table
function kvTable(rows) {
  const startX = ML;
  const w = [150, CW - 150];
  const rowH = 16;
  let y = doc.y;
  rows.forEach((row, ri) => {
    let maxLines = 1;
    row.forEach((cell, i) => {
      const h = doc.font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).heightOfString(String(cell), { width: w[i] - 10 });
      maxLines = Math.max(maxLines, Math.ceil(h / 10));
    });
    const thisH = Math.max(rowH, maxLines * 10 + 6);
    if (y + thisH > BOTTOM) { doc.addPage(); y = doc.y; }
    if (ri % 2 === 0) doc.rect(startX, y, w[0] + w[1], thisH).fill(C.light);
    let x = startX;
    row.forEach((cell, i) => {
      doc.fillColor(i === 0 ? C.teal : C.ink).font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
      doc.text(String(cell), x + 5, y + 4, { width: w[i] - 10 });
      x += w[i];
    });
    y += thisH;
  });
  doc.y = y + 6;
}

// fields table: array of [name, type, notes]
function fieldsTable(title, fields) {
  ensure(40);
  doc.moveDown(0.1);
  doc.fillColor(C.teal).font("Helvetica-Bold").fontSize(8.5).text(title, ML + 4, doc.y);
  doc.moveDown(0.1);
  const startX = ML + 4;
  const w = [125, 75, CW - 4 - 125 - 75];
  const headers = ["Field", "Type", "Notes"];
  const rowH = 15;
  ensure(rowH + 18);
  let y = doc.y;
  doc.rect(startX, y, w[0] + w[1] + w[2], rowH).fill(C.tealSoft);
  doc.fillColor(C.teal).font("Helvetica-Bold").fontSize(7.5);
  let x = startX;
  headers.forEach((hh, i) => { doc.text(hh, x + 4, y + 4, { width: w[i] - 8 }); x += w[i]; });
  y += rowH;
  fields.forEach((row, ri) => {
    let maxLines = 1;
    row.forEach((cell, i) => {
      const h = doc.font("Helvetica").fontSize(7.5).heightOfString(String(cell), { width: w[i] - 8 });
      maxLines = Math.max(maxLines, Math.ceil(h / 9));
    });
    const thisH = Math.max(rowH, maxLines * 9 + 6);
    if (y + thisH > BOTTOM) { doc.addPage(); y = doc.y; }
    if (ri % 2 === 0) doc.rect(startX, y, w[0] + w[1] + w[2], thisH).fill(C.light);
    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor(i === 0 ? C.ink : C.sub).font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(7.5);
      doc.text(String(cell), x + 4, y + 4, { width: w[i] - 8 });
      x += w[i];
    });
    y += thisH;
  });
  doc.y = y + 8;
}

function moduleBlock(name, route, purpose, workflow, statuses, fieldGroups) {
  ensure(70);
  doc.moveDown(0.25);
  doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(11).text(name, ML, doc.y, { continued: true });
  doc.fillColor(C.sub).font("Helvetica-Oblique").fontSize(9).text("   " + route);
  doc.moveDown(0.12);
  doc.fillColor(C.ink).font("Helvetica").fontSize(9.5).text(purpose, ML, doc.y, { width: CW, lineGap: 1.8 });
  doc.moveDown(0.18);
  if (workflow && workflow.length) {
    doc.fillColor(C.teal).font("Helvetica-Bold").fontSize(8.5).text("Workflow & key actions", ML + 2, doc.y);
    doc.moveDown(0.08);
    bullets(workflow);
  }
  if (statuses) {
    ensure(16);
    doc.fillColor(C.teal).font("Helvetica-Bold").fontSize(8.5).text("Statuses:  ", ML + 2, doc.y, { continued: true });
    doc.fillColor(C.sub).font("Helvetica").fontSize(8.5).text(statuses);
    doc.moveDown(0.15);
  }
  if (fieldGroups) fieldGroups.forEach((g) => fieldsTable(g.title, g.fields));
  doc.moveDown(0.15);
  const ly = doc.y;
  doc.moveTo(ML, ly).lineTo(ML + CW, ly).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.moveDown(0.1);
}

// ---------------- COVER ----------------
doc.rect(0, 0, PAGE_W, 150).fill(C.teal);
doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(28).text("Customize Duniya", ML, 40);
doc.fillColor("#fcd34d").font("Helvetica-Bold").fontSize(15).text("Detailed Notes \u2014 Complete Handbook", ML, 80);
doc.fillColor("#d1fae5").font("Helvetica").fontSize(9.5).text(
  "An end-to-end reference for the corporate gifting ERP: architecture, roles, every module, workflows, statuses and data fields.",
  ML, 106, { width: CW }
);
doc.y = 170;
doc.fillColor(C.sub).font("Helvetica").fontSize(9).text(
  "Generated " + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  ML
);
doc.moveDown(0.4);

// ---------------- INTRODUCTION ----------------
h1("1. Introduction");
para(
  "Customize Duniya is a full-stack ERP purpose-built for corporate gifting businesses. It manages the complete commercial lifecycle in a single web application \u2014 from finding and qualifying a lead, quoting and winning the deal, sourcing and assembling gift kits, through to shipping, invoicing and collecting payment. Sales, operations and finance teams all work off the same real-time data, with a live analytics dashboard giving leadership an at-a-glance view of business health."
);
para(
  "The platform spans 8 functional areas and 21 modules. This document is the authoritative reference: it explains what each module does, the workflow and key actions it supports, the statuses records move through, and the exact data fields captured."
);

// ---------------- ARCHITECTURE & STACK ----------------
h1("2. Architecture & Technology");
h2("Technology stack");
kvTable([
  ["Frontend", "React + Vite, TypeScript, Tailwind CSS, shadcn/ui components"],
  ["Backend", "Express 5 (Node.js 24), session-based authentication"],
  ["Database", "PostgreSQL with Drizzle ORM"],
  ["Validation", "Zod schemas (drizzle-zod) shared across client and server"],
  ["API contract", "OpenAPI spec with Orval-generated React Query hooks"],
  ["Structure", "pnpm monorepo \u2014 separate API, web and shared library packages"],
]);
h2("Conventions");
bullets([
  ["Currency", "Indian Rupee (\u20b9) formatted with the en-IN locale throughout"],
  ["Numbering", "Documents use prefixes \u2014 invoices 'INV', quotes 'QT' (configurable in Settings)"],
  ["Tax", "GST handled on quotes and invoices; default rate configurable (18%)"],
  ["Referential integrity", "Cascades and restrictions defined per relationship to protect transactional data"],
]);

// ---------------- USER ROLES ----------------
h1("3. User Roles & Access");
para("Users authenticate with email and password over a session. Each user carries a role that frames their day-to-day focus within the system.");
kvTable([
  ["Admin", "Full access \u2014 manages users, settings and all modules"],
  ["Sales", "CRM, quotes, sales orders and client-facing workflows"],
  ["Warehouse", "Inventory, goods receipts, assembly and shipments"],
  ["Finance", "Invoices, payments and credit notes"],
]);
para("Demo credentials are available on the login screen for first-time access.");

// ---------------- OVERVIEW MODULE ----------------
h1("4. Dashboard");
moduleBlock("Dashboard", "/dashboard",
  "The landing page and real-time command centre. It pulls live data from the analytics API and is organised into a header with a global time-range filter, six KPI stat cards, two analytics charts, three insight widgets and a Top Clients list. All monetary values are shown in \u20b9 (en-IN).",
  [
    ["KPI cards", "Total Clients, Active Orders, Pending Assembly, Overdue Invoices, Low Stock Items, Pending POs"],
    ["Charts", "Revenue Overview (3 / 6 / 12 / 24-month filter) and Sales Pipeline"],
    ["Widgets", "Top Products, Sales Leaderboard, AR Aging, Top Clients"],
  ],
  null, null
);

// ---------------- CRM ----------------
h1("5. CRM \u2014 Customer Relationship Management");
moduleBlock("Clients", "/clients",
  "Directory of corporate client accounts and the hub for all relationship history.",
  [["Manage accounts", "Create, search and filter clients by industry"], ["Log interactions", "Record call / email / meeting notes against each client"]],
  null,
  [
    { title: "Client fields", fields: [
      ["companyName", "text", "Required"],
      ["contactPerson", "text", "Required"],
      ["email", "text", "Required"],
      ["phone", "text", "Optional"],
      ["gstNumber", "text", "GSTIN"],
      ["industry", "text", "Used for filtering"],
      ["tags", "text", "Free-form labels"],
      ["billingAddress / shippingAddress", "text", ""],
    ]},
    { title: "Client interaction fields", fields: [
      ["type", "text", "call / email / meeting"],
      ["notes", "text", "Required"],
    ]},
  ]
);
moduleBlock("Contacts", "/clients/:id",
  "Multiple contact people maintained under each client, one of which can be marked primary.",
  [["Primary flag", "Designate the main point of contact"]],
  null,
  [{ title: "Contact fields", fields: [
    ["firstName", "text", "Required"],
    ["lastName", "text", "Optional"],
    ["designation", "text", "Job title"],
    ["department", "text", ""],
    ["email / phone", "text", ""],
    ["isPrimary", "boolean", "Default false"],
    ["notes", "text", ""],
  ]}]
);
moduleBlock("Activities", "/clients/:id",
  "A task and activity timeline attached to a client, tracking what is due and what is done.",
  [["Track completion", "Capture due date and completion timestamp"], ["Assign", "Attribute each activity to an owner"]],
  null,
  [{ title: "Activity fields", fields: [
    ["type", "text", "Required"],
    ["subject", "text", "Required"],
    ["description", "text", ""],
    ["dueDate", "timestamp", ""],
    ["completedAt", "timestamp", "Set when done"],
    ["ownerId", "ref \u2192 users", "Assigned user"],
  ]}]
);
moduleBlock("Leads", "/leads",
  "The pipeline of potential new business, captured from various sources and qualified over time.",
  [["Qualify", "Move leads through statuses"], ["Estimate", "Capture estimated deal value and owner"]],
  "new, qualified, proposal, won, lost (default 'new')",
  [{ title: "Lead fields", fields: [
    ["title", "text", "Required"],
    ["clientId", "ref \u2192 clients", "Optional link"],
    ["companyName / contactName", "text", ""],
    ["email / phone", "text", ""],
    ["source", "text", "Lead origin"],
    ["status", "text", "Default 'new'"],
    ["estimatedValue", "numeric", "\u20b9"],
    ["ownerId", "ref \u2192 users", "Owner"],
    ["notes", "text", ""],
  ]}]
);
moduleBlock("Opportunities", "/opportunities",
  "Qualified deals being actively worked toward a close, with stage and probability tracking.",
  [["Stage tracking", "Advance deals through the sales stages"], ["Forecast", "Probability and expected close date feed the pipeline chart"]],
  "stage default 'prospect'; probability 0\u2013100%",
  [{ title: "Opportunity fields", fields: [
    ["title", "text", "Required"],
    ["clientId", "ref \u2192 clients", ""],
    ["leadId", "ref \u2192 leads", "Converted from"],
    ["stage", "text", "Default 'prospect'"],
    ["value", "numeric", "\u20b9"],
    ["probability", "integer", "Default 50"],
    ["expectedCloseDate", "timestamp", ""],
    ["ownerId", "ref \u2192 users", ""],
    ["notes", "text", ""],
  ]}]
);
moduleBlock("Quotes", "/quotes",
  "Quotation builder with line items, discount and GST. Quotes can be linked to an opportunity and converted into sales orders.",
  [["Build", "Add line items with quantity and unit price"], ["Price", "Apply discount % and auto-calculate GST and totals"]],
  "draft, sent, accepted (default 'draft')",
  [
    { title: "Quote fields", fields: [
      ["quoteNumber", "text", "Unique"],
      ["clientId", "ref \u2192 clients", "Required"],
      ["opportunityId", "ref \u2192 opps", "Optional"],
      ["status", "text", "Default 'draft'"],
      ["validUntil", "timestamp", ""],
      ["subtotal / gstAmount / totalAmount", "numeric", "\u20b9"],
      ["discountPct", "numeric", "%"],
      ["notes", "text", ""],
    ]},
    { title: "Quote item fields", fields: [
      ["description", "text", "Required"],
      ["quantity", "integer", ""],
      ["unitPrice / lineTotal", "numeric", "\u20b9"],
    ]},
  ]
);

// ---------------- CATALOG ----------------
h1("6. Catalog \u2014 Product Management");
moduleBlock("Products", "/products",
  "Master list of all sellable products with cost, selling price and stock, including low-stock highlighting.",
  [["Stock alerts", "Threshold-based low-stock indicators"], ["Sourcing", "Link a default vendor per product"]],
  null,
  [{ title: "Product fields", fields: [
    ["name", "text", "Required"],
    ["category", "text", "Required"],
    ["costPrice / sellingPrice", "numeric", "\u20b9"],
    ["stockLevel", "integer", "Default 0"],
    ["lowStockThreshold", "integer", "Default 10"],
    ["vendorId", "ref \u2192 vendors", "Default supplier"],
    ["imageUrl", "text", ""],
  ]}]
);
moduleBlock("Product Variants", "(within Products)",
  "SKU-level variations of a product (size, colour, material) with their own stock and price adjustment.",
  [],
  null,
  [{ title: "Variant fields", fields: [
    ["sku", "text", "Unique"],
    ["variantName", "text", "Required"],
    ["size / color / material", "text", "Optional attributes"],
    ["priceAdjustment", "numeric", "\u20b9 +/-"],
    ["stockLevel", "integer", ""],
  ]}]
);
moduleBlock("Pricing Tiers", "(within Products)",
  "Quantity-break pricing so larger orders get better unit rates.",
  [],
  null,
  [{ title: "Pricing tier fields", fields: [
    ["tierName", "text", "e.g. Bulk"],
    ["minQuantity", "integer", "Threshold"],
    ["unitPrice", "numeric", "\u20b9 at this tier"],
  ]}]
);
moduleBlock("Customization Options", "(within Products)",
  "Add-on customisations such as engraving or printing, each with a price uplift and extra lead time.",
  [],
  null,
  [{ title: "Customization fields", fields: [
    ["optionType", "text", "e.g. Engraving"],
    ["optionName", "text", "Required"],
    ["description", "text", ""],
    ["priceUplift", "numeric", "\u20b9 added"],
    ["leadTimeDays", "integer", "Extra days"],
  ]}]
);
moduleBlock("Bundles", "/bundles",
  "Curated gift kits built from multiple products, with a helper to suggest bundles by occasion and budget.",
  [["Suggest Bundle", "Generate a kit for an occasion within a budget"]],
  null,
  [
    { title: "Bundle fields", fields: [
      ["name", "text", "Required"],
      ["description", "text", ""],
      ["occasion", "text", "e.g. Diwali"],
      ["imageUrl", "text", ""],
    ]},
    { title: "Bundle item fields", fields: [
      ["productId", "ref \u2192 products", "Required"],
      ["quantity", "integer", "Default 1"],
    ]},
  ]
);
moduleBlock("Categories", "/categories",
  "Hierarchical organisation of the catalog with nested parent/child categories.",
  [],
  null,
  [{ title: "Category fields", fields: [
    ["name", "text", "Unique"],
    ["slug", "text", "Unique URL key"],
    ["parentId", "ref \u2192 categories", "For nesting"],
    ["description", "text", ""],
  ]}]
);

// ---------------- ORDERS & PROCUREMENT ----------------
h1("7. Orders & Procurement");
moduleBlock("Sales Orders", "/sales-orders",
  "Confirmed client orders moving through the fulfilment lifecycle, with line items and multiple delivery addresses.",
  [["Build order", "Add products with quantity and unit price"], ["Multi-drop", "Capture several delivery addresses per order"]],
  "Draft \u2192 \u2026 \u2192 Delivered (default 'Draft')",
  [
    { title: "Sales order fields", fields: [
      ["orderNumber", "text", "Unique"],
      ["clientId", "ref \u2192 clients", "Required"],
      ["status", "text", "Default 'Draft'"],
      ["totalAmount", "numeric", "\u20b9"],
      ["occasion / notes", "text", ""],
    ]},
    { title: "Order item fields", fields: [
      ["productId", "ref \u2192 products", "Required"],
      ["quantity", "integer", ""],
      ["unitPrice", "numeric", "\u20b9"],
    ]},
    { title: "Delivery address fields", fields: [
      ["name", "text", "Recipient"],
      ["address", "text", "Required"],
      ["city / pincode", "text", ""],
    ]},
  ]
);
moduleBlock("Purchase Orders", "/purchase-orders",
  "Procurement orders raised to vendors, optionally tied back-to-back to a sales order, with per-line received tracking.",
  [["Raise PO", "Order products from a vendor"], ["Receive", "Track received quantity per line toward full receipt"]],
  "Ordered \u2192 Partially Received \u2192 Fully Received (default 'Ordered')",
  [
    { title: "Purchase order fields", fields: [
      ["poNumber", "text", "Unique"],
      ["vendorId", "ref \u2192 vendors", "Required"],
      ["salesOrderId", "ref \u2192 sales orders", "Optional"],
      ["status", "text", "Default 'Ordered'"],
      ["totalAmount", "numeric", "\u20b9"],
      ["expectedDelivery", "timestamp", ""],
    ]},
    { title: "PO item fields", fields: [
      ["productId", "ref \u2192 products", "Required"],
      ["quantity", "integer", "Ordered qty"],
      ["unitPrice", "numeric", "\u20b9"],
      ["receivedQty", "integer", "Default 0"],
    ]},
  ]
);
moduleBlock("Vendors", "/vendors",
  "Supplier directory used across procurement, with expected lead times.",
  [],
  null,
  [{ title: "Vendor fields", fields: [
    ["name", "text", "Required"],
    ["contactPerson", "text", ""],
    ["email / phone", "text", ""],
    ["leadTimeDays", "integer", "Default 7"],
  ]}]
);

// ---------------- OPERATIONS ----------------
h1("8. Operations & Warehouse");
moduleBlock("Inventory", "/inventory",
  "Live stock levels with a movement ledger of every inward and outward adjustment.",
  [["Record movement", "Log inward / outward stock changes with batch and reference"]],
  null,
  [{ title: "Inventory movement fields", fields: [
    ["productId", "ref \u2192 products", "Required"],
    ["type", "text", "inward / outward"],
    ["quantity", "integer", ""],
    ["batch", "text", "Batch ref"],
    ["reference", "text", "Source document"],
  ]}]
);
moduleBlock("Locations", "/locations",
  "The physical warehouse structure \u2014 zones and bins where stock is stored.",
  [],
  "type default 'storage'",
  [{ title: "Warehouse location fields", fields: [
    ["name", "text", "Required"],
    ["code", "text", "Unique"],
    ["zone / bin", "text", ""],
    ["type", "text", "Default 'storage'"],
    ["capacity", "integer", ""],
    ["notes", "text", ""],
  ]}]
);
moduleBlock("Goods Receipts (GRN)", "/grn",
  "Formal receiving of goods against purchase orders, including quality acceptance and rejection per line.",
  [["Receive against PO", "Match incoming stock to the originating PO"], ["Quality check", "Record received and rejected quantities"]],
  "received (default)",
  [
    { title: "GRN fields", fields: [
      ["grnNumber", "text", "Unique"],
      ["purchaseOrderId", "ref \u2192 POs", "Required"],
      ["receivedDate", "timestamp", "Defaults now"],
      ["status", "text", "Default 'received'"],
      ["notes", "text", ""],
    ]},
    { title: "GRN item fields", fields: [
      ["productId", "ref \u2192 products", "Required"],
      ["quantityReceived", "integer", ""],
      ["quantityRejected", "integer", "Default 0"],
      ["remarks", "text", ""],
    ]},
  ]
);
moduleBlock("Assembly", "/assembly",
  "Production jobs that build gift kits for a sales order, tracking kit progress and per-item QC.",
  [["Plan job", "Set target kit count for a sales order"], ["Track progress", "Update completed kits and item QC status"]],
  "Pending \u2192 In Progress \u2192 Completed (default 'Pending')",
  [
    { title: "Assembly job fields", fields: [
      ["jobNumber", "text", "Unique"],
      ["salesOrderId", "ref \u2192 sales orders", "Required"],
      ["status", "text", "Default 'Pending'"],
      ["totalKits", "integer", "Target"],
      ["completedKits", "integer", "Default 0"],
      ["notes", "text", ""],
    ]},
    { title: "Assembly item fields", fields: [
      ["productId", "ref \u2192 products", "Required"],
      ["quantity", "integer", ""],
      ["status", "text", "Default 'Pending'"],
      ["qcNotes", "text", "Quality check"],
    ]},
  ]
);
moduleBlock("Artwork", "/artwork",
  "Creative approval workflow for branded gifts \u2014 mockups and logos signed off before production.",
  [["Submit asset", "Attach artwork for a client / order"], ["Approve", "Move through the approval status"]],
  "Pending \u2192 Approved (default 'Pending')",
  [{ title: "Artwork approval fields", fields: [
    ["clientId", "ref \u2192 clients", "Required"],
    ["salesOrderId", "ref \u2192 sales orders", "Optional"],
    ["assetName", "text", "Required"],
    ["assetUrl", "text", "Mockup / logo link"],
    ["status", "text", "Default 'Pending'"],
    ["notes", "text", ""],
  ]}]
);

// ---------------- LOGISTICS ----------------
h1("9. Logistics");
moduleBlock("Shipments", "/shipments",
  "Courier and delivery management, with per-parcel tracking across multiple delivery destinations.",
  [["Dispatch", "Assign a courier partner and dispatch date"], ["Track", "Tracking numbers at shipment and parcel level"]],
  "Preparing \u2192 Dispatched \u2192 Delivered (default 'Preparing')",
  [
    { title: "Shipment fields", fields: [
      ["shipmentNumber", "text", "Unique"],
      ["salesOrderId", "ref \u2192 sales orders", "Required"],
      ["courierPartner", "text", "Required"],
      ["status", "text", "Default 'Preparing'"],
      ["trackingNumber", "text", ""],
      ["dispatchDate", "timestamp", ""],
    ]},
    { title: "Shipment item fields", fields: [
      ["deliveryAddressId", "ref \u2192 addresses", "Optional"],
      ["deliveryName / address", "text", "Required"],
      ["status", "text", "Default 'Pending'"],
      ["trackingNumber", "text", "Per-parcel"],
    ]},
  ]
);

// ---------------- FINANCE ----------------
h1("10. Finance");
moduleBlock("Invoices", "/invoices",
  "Tax invoices generated from sales orders, with GST broken out and a running status.",
  [["Generate", "Create an invoice from a sales order"], ["GST", "Net, GST and grand total captured separately"]],
  "Draft \u2192 Sent \u2192 Paid / Overdue (default 'Draft')",
  [{ title: "Invoice fields", fields: [
    ["invoiceNumber", "text", "Unique"],
    ["salesOrderId", "ref \u2192 sales orders", "Required"],
    ["clientId", "ref \u2192 clients", "Required"],
    ["totalAmount", "numeric", "\u20b9 net"],
    ["gstAmount", "numeric", "\u20b9 tax"],
    ["grandTotal", "numeric", "\u20b9 total"],
    ["status", "text", "Default 'Draft'"],
    ["dueDate", "timestamp", ""],
  ]}]
);
moduleBlock("Payments", "/payments",
  "Money collected against invoices, supporting advance, partial and full receipts.",
  [["Record receipt", "Log payment amount, type and date against an invoice"]],
  "type: advance / partial / full",
  [{ title: "Payment fields", fields: [
    ["invoiceId", "ref \u2192 invoices", "Required"],
    ["amount", "numeric", "\u20b9"],
    ["type", "text", "Required"],
    ["paymentDate", "timestamp", "Required"],
    ["notes", "text", ""],
  ]}]
);
moduleBlock("Credit Notes", "/credit-notes",
  "Returns and billing adjustments issued against an invoice or client.",
  [["Issue", "Record reason and amount for a credit"]],
  "issued (default)",
  [{ title: "Credit note fields", fields: [
    ["creditNoteNumber", "text", "Unique"],
    ["invoiceId", "ref \u2192 invoices", "Optional"],
    ["clientId", "ref \u2192 clients", "Required"],
    ["amount", "numeric", "\u20b9"],
    ["reason", "text", "Required"],
    ["status", "text", "Default 'issued'"],
    ["issuedDate", "timestamp", "Defaults now"],
  ]}]
);

// ---------------- ADMIN ----------------
h1("11. Administration");
moduleBlock("Users", "/users",
  "Identity and access management \u2014 the people who use the system and their roles.",
  [["Manage access", "Create users, set role, activate / deactivate"]],
  "roles: Admin, Sales, Warehouse, Finance (default 'Sales')",
  [{ title: "User fields", fields: [
    ["name", "text", "Required"],
    ["email", "text", "Unique"],
    ["passwordHash", "text", "Stored hashed"],
    ["role", "text", "Default 'Sales'"],
    ["isActive", "boolean", "Default true"],
  ]}]
);
moduleBlock("Settings", "/settings",
  "Global company configuration used across documents \u2014 identity, tax IDs, document prefixes and currency.",
  [["Branding & tax", "Company name, GST/PAN, contact and address"], ["Document defaults", "Invoice / quote prefixes, default GST %, currency"]],
  null,
  [{ title: "Company settings fields", fields: [
    ["companyName / legalName", "text", "Defaults 'Customize Duniya'"],
    ["gstNumber / pan", "text", "Tax IDs"],
    ["email / phone / website", "text", ""],
    ["address / city / state / pincode", "text", ""],
    ["logoUrl", "text", ""],
    ["invoicePrefix", "text", "Default 'INV'"],
    ["quotePrefix", "text", "Default 'QT'"],
    ["defaultGstPct", "text", "Default '18'"],
    ["currency", "text", "Default 'INR'"],
  ]}]
);

// ---------------- FOOTER ----------------
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  const fy = doc.page.height - 38;
  doc.moveTo(ML, fy).lineTo(ML + CW, fy).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.fillColor(C.sub).font("Helvetica").fontSize(8);
  doc.text("Customize Duniya \u00b7 Detailed Notes", ML, fy + 6, { width: CW / 2, align: "left" });
  doc.text("Page " + (i + 1) + " of " + range.count, ML + CW / 2, fy + 6, { width: CW / 2, align: "right" });
}

doc.end();
console.log("Wrote", OUT);
