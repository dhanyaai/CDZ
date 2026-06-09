import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("exports/CustomizeDuniya-Module-Reference.pdf");
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

// fields: array of [name, type, desc]
function fieldsTable(title, fields) {
  ensure(40);
  doc.moveDown(0.15);
  doc.fillColor(C.teal).font("Helvetica-Bold").fontSize(8.5).text(title, ML + 6, doc.y);
  doc.moveDown(0.1);
  const startX = ML + 6;
  const w = [120, 70, CW - 6 - 120 - 70];
  const headers = ["Field", "Type", "Notes"];
  let y = doc.y;
  const rowH = 15;
  ensure(rowH + 20);
  y = doc.y;
  doc.rect(startX, y, w[0] + w[1] + w[2], rowH).fill("#e8f0f0");
  doc.fillColor(C.teal).font("Helvetica-Bold").fontSize(7.5);
  let x = startX;
  headers.forEach((h, i) => { doc.text(h, x + 4, y + 4, { width: w[i] - 8 }); x += w[i]; });
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
  doc.y = y + 6;
}

function moduleCard(name, route, purpose, features, fieldGroups) {
  ensure(60);
  doc.moveDown(0.25);
  const y = doc.y;
  doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(11.5).text(name, ML, y, { continued: true });
  doc.fillColor(C.sub).font("Helvetica-Oblique").fontSize(9).text("   " + route);
  doc.moveDown(0.15);
  doc.fillColor(C.ink).font("Helvetica").fontSize(9.5).text(purpose, ML, doc.y, { width: CW, lineGap: 1.5 });
  doc.moveDown(0.15);
  features.forEach((f) => {
    ensure(14);
    const sy = doc.y;
    doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(9).text("\u203a", ML + 6, sy, { width: 12 });
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(9).text(f[0], ML + 20, sy, { continued: true, width: CW - 20 });
    doc.fillColor(C.sub).font("Helvetica").fontSize(9).text(f[1] ? " \u2014 " + f[1] : "");
    doc.moveDown(0.1);
  });
  if (fieldGroups) fieldGroups.forEach((g) => fieldsTable(g.title, g.fields));
  doc.moveDown(0.2);
  const ly = doc.y;
  doc.moveTo(ML, ly).lineTo(ML + CW, ly).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.moveDown(0.15);
}

// ---------- TITLE ----------
doc.rect(0, 0, PAGE_W, 130).fill(C.teal);
doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(26).text("Customize Duniya", ML, 38);
doc.fillColor("#fcd34d").font("Helvetica-Bold").fontSize(14).text("Module Reference Guide", ML, 74);
doc.fillColor("#d1fae5").font("Helvetica").fontSize(9.5).text(
  "Every module \u2014 purpose, key actions, statuses and data fields.",
  ML, 98, { width: CW }
);
doc.y = 150;
doc.fillColor(C.sub).font("Helvetica").fontSize(9).text(
  "Generated " + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
  "  \u00b7  Field lists reflect the underlying database schema",
  ML
);
doc.moveDown(0.3);

// ---------- OVERVIEW ----------
areaHeader("OVERVIEW");
moduleCard("Dashboard", "/dashboard",
  "The landing page and real-time command centre summarising the health of the whole business.",
  [
    ["KPI cards", "Total Clients, Active Orders, Pending Assembly, Overdue Invoices, Low Stock Items, Pending POs"],
    ["Charts", "Revenue Overview (3/6/12/24-month filter) and Sales Pipeline"],
    ["Widgets", "Top Products, Sales Leaderboard, AR Aging, Top Clients"],
  ],
  null
);

// ---------- CRM ----------
areaHeader("CRM \u2014 Customer Relationship Management");
moduleCard("Clients", "/clients",
  "Directory of corporate client accounts.",
  [["Manage", "Create, search and filter by industry"], ["Interactions", "Log call/email/meeting notes per client"]],
  [
    { title: "Client fields", fields: [
      ["companyName", "text", "Required"],
      ["contactPerson", "text", "Required"],
      ["email", "text", "Required"],
      ["phone", "text", "Optional"],
      ["gstNumber", "text", "GSTIN"],
      ["industry", "text", "Used for filtering"],
      ["tags", "text", "Free-form labels"],
      ["billingAddress", "text", ""],
      ["shippingAddress", "text", ""],
    ]},
    { title: "Client interaction fields", fields: [
      ["type", "text", "call / email / meeting"],
      ["notes", "text", "Required"],
    ]},
  ]
);
moduleCard("Contacts (Client Detail)", "/clients/:id",
  "Multiple contact people maintained under each client.",
  [["Primary flag", "Mark one contact as primary"]],
  [{ title: "Contact fields", fields: [
    ["firstName", "text", "Required"],
    ["lastName", "text", "Optional"],
    ["designation", "text", "Job title"],
    ["department", "text", ""],
    ["email", "text", ""],
    ["phone", "text", ""],
    ["isPrimary", "boolean", "Default false"],
    ["notes", "text", ""],
  ]}]
);
moduleCard("Activities (Client Detail)", "/clients/:id",
  "Task/activity timeline attached to a client.",
  [["Completion", "Track due date and completion"]],
  [{ title: "Activity fields", fields: [
    ["type", "text", "Required"],
    ["subject", "text", "Required"],
    ["description", "text", ""],
    ["dueDate", "timestamp", ""],
    ["completedAt", "timestamp", "Set when done"],
    ["ownerId", "ref \u2192 users", "Assigned user"],
  ]}]
);
moduleCard("Leads", "/leads",
  "Pipeline of potential new business.",
  [["Status", "new, qualified, proposal, \u2026"]],
  [{ title: "Lead fields", fields: [
    ["title", "text", "Required"],
    ["clientId", "ref \u2192 clients", "Optional link"],
    ["companyName", "text", ""],
    ["contactName", "text", ""],
    ["email / phone", "text", ""],
    ["source", "text", "Lead origin"],
    ["status", "text", "Default 'new'"],
    ["estimatedValue", "numeric", "\u20b9"],
    ["ownerId", "ref \u2192 users", "Owner"],
    ["notes", "text", ""],
  ]}]
);
moduleCard("Opportunities", "/opportunities",
  "Qualified deals worked toward a close.",
  [["Stage", "Default 'prospect'"], ["Probability", "0\u2013100%"]],
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
moduleCard("Quotes", "/quotes",
  "Quotation builder with line items, discount and GST.",
  [["Status", "draft, sent, accepted"]],
  [
    { title: "Quote fields", fields: [
      ["quoteNumber", "text", "Unique"],
      ["clientId", "ref \u2192 clients", "Required"],
      ["opportunityId", "ref \u2192 opps", "Optional"],
      ["status", "text", "Default 'draft'"],
      ["validUntil", "timestamp", ""],
      ["subtotal", "numeric", "\u20b9"],
      ["discountPct", "numeric", "%"],
      ["gstAmount", "numeric", "\u20b9"],
      ["totalAmount", "numeric", "\u20b9"],
      ["notes", "text", ""],
    ]},
    { title: "Quote item fields", fields: [
      ["description", "text", "Required"],
      ["quantity", "integer", ""],
      ["unitPrice", "numeric", "\u20b9"],
      ["lineTotal", "numeric", "\u20b9"],
    ]},
  ]
);

// ---------- CATALOG ----------
areaHeader("CATALOG \u2014 Product Management");
moduleCard("Products", "/products",
  "Master list of all sellable products.",
  [["Low stock", "Threshold-based highlighting"]],
  [{ title: "Product fields", fields: [
    ["name", "text", "Required"],
    ["category", "text", "Required"],
    ["costPrice", "numeric", "\u20b9"],
    ["sellingPrice", "numeric", "\u20b9"],
    ["stockLevel", "integer", "Default 0"],
    ["lowStockThreshold", "integer", "Default 10"],
    ["vendorId", "ref \u2192 vendors", "Default supplier"],
    ["imageUrl", "text", ""],
  ]}]
);
moduleCard("Product Variants", "(within Products)",
  "SKU-level variations of a product.",
  [],
  [{ title: "Variant fields", fields: [
    ["sku", "text", "Unique"],
    ["variantName", "text", "Required"],
    ["size / color / material", "text", "Optional attributes"],
    ["priceAdjustment", "numeric", "\u20b9 +/-"],
    ["stockLevel", "integer", ""],
  ]}]
);
moduleCard("Pricing Tiers", "(within Products)",
  "Quantity-break pricing per product.",
  [],
  [{ title: "Pricing tier fields", fields: [
    ["tierName", "text", "e.g. Bulk"],
    ["minQuantity", "integer", "Threshold"],
    ["unitPrice", "numeric", "\u20b9 at this tier"],
  ]}]
);
moduleCard("Customization Options", "(within Products)",
  "Add-on customisations (e.g. engraving) with uplift.",
  [],
  [{ title: "Customization fields", fields: [
    ["optionType", "text", "e.g. Engraving"],
    ["optionName", "text", "Required"],
    ["description", "text", ""],
    ["priceUplift", "numeric", "\u20b9 added"],
    ["leadTimeDays", "integer", "Extra days"],
  ]}]
);
moduleCard("Bundles", "/bundles",
  "Curated gift kits built from multiple products.",
  [["Suggest Bundle", "Generate by occasion + budget"]],
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
moduleCard("Categories", "/categories",
  "Hierarchical catalog organisation.",
  [],
  [{ title: "Category fields", fields: [
    ["name", "text", "Unique"],
    ["slug", "text", "Unique URL key"],
    ["parentId", "ref \u2192 categories", "For nesting"],
    ["description", "text", ""],
  ]}]
);

// ---------- ORDERS ----------
areaHeader("ORDERS & PROCUREMENT");
moduleCard("Sales Orders", "/sales-orders",
  "Client orders through the fulfilment lifecycle.",
  [["Status", "Draft \u2192 \u2026 \u2192 Delivered"]],
  [
    { title: "Sales order fields", fields: [
      ["orderNumber", "text", "Unique"],
      ["clientId", "ref \u2192 clients", "Required"],
      ["status", "text", "Default 'Draft'"],
      ["totalAmount", "numeric", "\u20b9"],
      ["occasion", "text", ""],
      ["notes", "text", ""],
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
moduleCard("Purchase Orders", "/purchase-orders",
  "Procurement orders raised to vendors.",
  [["Status", "Default 'Ordered' \u2192 Fully Received"]],
  [
    { title: "Purchase order fields", fields: [
      ["poNumber", "text", "Unique"],
      ["vendorId", "ref \u2192 vendors", "Required"],
      ["salesOrderId", "ref \u2192 sales orders", "Optional back-to-back"],
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
moduleCard("Vendors", "/vendors",
  "Supplier directory used for procurement.",
  [],
  [{ title: "Vendor fields", fields: [
    ["name", "text", "Required"],
    ["contactPerson", "text", ""],
    ["email / phone", "text", ""],
    ["leadTimeDays", "integer", "Default 7"],
  ]}]
);

// ---------- OPERATIONS ----------
areaHeader("OPERATIONS & WAREHOUSE");
moduleCard("Inventory", "/inventory",
  "Stock levels and movement records.",
  [["Movements", "Inward / outward adjustments"]],
  [{ title: "Inventory movement fields", fields: [
    ["productId", "ref \u2192 products", "Required"],
    ["type", "text", "inward / outward"],
    ["quantity", "integer", ""],
    ["batch", "text", "Batch ref"],
    ["reference", "text", "Source doc"],
  ]}]
);
moduleCard("Locations", "/locations",
  "Warehouse storage structure.",
  [],
  [{ title: "Warehouse location fields", fields: [
    ["name", "text", "Required"],
    ["code", "text", "Unique"],
    ["zone / bin", "text", ""],
    ["type", "text", "Default 'storage'"],
    ["capacity", "integer", ""],
    ["notes", "text", ""],
  ]}]
);
moduleCard("Goods Receipts (GRN)", "/grn",
  "Receiving goods against purchase orders.",
  [["Status", "Default 'received'"], ["Quality", "Reject quantities per line"]],
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
moduleCard("Assembly", "/assembly",
  "Production jobs for building kits.",
  [["Status", "Pending / In Progress / Completed"]],
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
moduleCard("Artwork", "/artwork",
  "Creative approval workflow for branded gifts.",
  [["Status", "Default 'Pending' \u2192 Approved"]],
  [{ title: "Artwork approval fields", fields: [
    ["clientId", "ref \u2192 clients", "Required"],
    ["salesOrderId", "ref \u2192 sales orders", "Optional"],
    ["assetName", "text", "Required"],
    ["assetUrl", "text", "Mockup/logo link"],
    ["status", "text", "Default 'Pending'"],
    ["notes", "text", ""],
  ]}]
);

// ---------- LOGISTICS ----------
areaHeader("LOGISTICS");
moduleCard("Shipments", "/shipments",
  "Courier and delivery management.",
  [["Status", "Default 'Preparing' \u2192 Delivered"]],
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
      ["deliveryName", "text", "Required"],
      ["address", "text", "Required"],
      ["status", "text", "Default 'Pending'"],
      ["trackingNumber", "text", "Per-parcel"],
    ]},
  ]
);

// ---------- FINANCE ----------
areaHeader("FINANCE");
moduleCard("Invoices", "/invoices",
  "Tax invoices generated from sales orders.",
  [["Status", "Default 'Draft'"], ["GST", "Auto-calculated"]],
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
moduleCard("Payments", "/payments",
  "Money collected against invoices.",
  [["Type", "advance / partial / full"]],
  [{ title: "Payment fields", fields: [
    ["invoiceId", "ref \u2192 invoices", "Required"],
    ["amount", "numeric", "\u20b9"],
    ["type", "text", "Required"],
    ["paymentDate", "timestamp", "Required"],
    ["notes", "text", ""],
  ]}]
);
moduleCard("Credit Notes", "/credit-notes",
  "Returns and billing adjustments.",
  [["Status", "Default 'issued'"]],
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

// ---------- ADMIN ----------
areaHeader("ADMIN");
moduleCard("Users", "/users",
  "Identity and access management.",
  [["Roles", "Admin, Sales, Warehouse, \u2026"]],
  [{ title: "User fields", fields: [
    ["name", "text", "Required"],
    ["email", "text", "Unique"],
    ["passwordHash", "text", "Stored hashed"],
    ["role", "text", "Default 'Sales'"],
    ["isActive", "boolean", "Default true"],
  ]}]
);
moduleCard("Settings", "/settings",
  "Global company configuration.",
  [],
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

// ---------- FOOTER ----------
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  const fy = doc.page.height - 38;
  doc.moveTo(ML, fy).lineTo(ML + CW, fy).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.fillColor(C.sub).font("Helvetica").fontSize(8);
  doc.text("Customize Duniya \u00b7 Module Reference", ML, fy + 6, { width: CW / 2, align: "left" });
  doc.text("Page " + (i + 1) + " of " + range.count, ML + CW / 2, fy + 6, { width: CW / 2, align: "right" });
}

doc.end();
console.log("Wrote", OUT);
