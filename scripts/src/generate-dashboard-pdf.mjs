import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("exports/Dashboard-Notes.pdf");
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

function h1(text) {
  doc.moveDown(0.3);
  doc.fillColor(C.teal).font("Helvetica-Bold").fontSize(16).text(text, ML);
  const y = doc.y + 3;
  doc.moveTo(ML, y).lineTo(ML + CW, y).lineWidth(2).strokeColor(C.amber).stroke();
  doc.moveDown(0.6);
}

function h2(text) {
  doc.moveDown(0.4);
  doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(12).text(text, ML);
  doc.moveDown(0.2);
}

function para(text) {
  doc.fillColor(C.ink).font("Helvetica").fontSize(10).text(text, ML, doc.y, { width: CW, align: "left", lineGap: 2 });
  doc.moveDown(0.3);
}

function bullet(label, desc) {
  const startY = doc.y;
  doc.fillColor(C.amber).font("Helvetica-Bold").fontSize(10).text("•", ML, startY, { continued: false, width: 12 });
  doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(10).text(label, ML + 14, startY, { continued: true, width: CW - 14 });
  doc.fillColor(C.sub).font("Helvetica").fontSize(10).text(desc ? " — " + desc : "");
  doc.moveDown(0.2);
}

// Simple table renderer
function table(headers, rows, widths) {
  const startX = ML;
  let y = doc.y;
  const rowH = 22;
  // header
  doc.rect(startX, y, CW, rowH).fill(C.teal);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  let x = startX;
  headers.forEach((hdr, i) => {
    doc.text(hdr, x + 6, y + 7, { width: widths[i] - 12 });
    x += widths[i];
  });
  y += rowH;
  // rows
  rows.forEach((row, ri) => {
    // measure height needed
    let maxLines = 1;
    row.forEach((cell, i) => {
      const h = doc.font("Helvetica").fontSize(9).heightOfString(String(cell), { width: widths[i] - 12 });
      maxLines = Math.max(maxLines, Math.ceil(h / 11));
    });
    const thisH = Math.max(rowH, maxLines * 11 + 10);
    if (y + thisH > doc.page.height - 60) {
      doc.addPage();
      y = doc.y;
    }
    if (ri % 2 === 0) doc.rect(startX, y, CW, thisH).fill(C.light);
    doc.fillColor(C.ink).font("Helvetica").fontSize(9);
    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor(i === 0 ? C.ink : C.sub).font(i === 0 ? "Helvetica-Bold" : "Helvetica");
      doc.text(String(cell), x + 6, y + 6, { width: widths[i] - 12 });
      x += widths[i];
    });
    // bottom border
    doc.moveTo(startX, y + thisH).lineTo(startX + CW, y + thisH).lineWidth(0.5).strokeColor(C.line).stroke();
    y += thisH;
  });
  doc.y = y + 8;
}

// ---------- COVER / TITLE ----------
doc.rect(0, 0, PAGE_W, 130).fill(C.teal);
doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(26).text("GiftERP", ML, 38);
doc.fillColor("#fcd34d").font("Helvetica-Bold").fontSize(13).text("Dashboard — Detailed Notes", ML, 72);
doc.fillColor("#d1fae5").font("Helvetica").fontSize(9).text(
  "Corporate Gifting ERP · Reference guide to everything available on the Dashboard page",
  ML, 95, { width: CW }
);
doc.y = 150;
doc.fillColor(C.sub).font("Helvetica").fontSize(9).text(
  "Generated " + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  ML
);
doc.moveDown(0.5);

// ---------- OVERVIEW ----------
h1("Overview");
para(
  "The Dashboard is the landing page of GiftERP and provides a live, at-a-glance overview of your entire gifting operation. It pulls real-time data from the analytics API and is organized into four zones: a header with a global time-range filter, a row of six KPI stat cards, a pair of analytics charts (Revenue Overview and Sales Pipeline), three insight widgets (Top Products, Sales Leaderboard, AR Aging), and a Top Clients list. All monetary values are shown in Indian Rupees (₹) using the en-IN number format."
);

// ---------- HEADER ----------
h1("1. Page Header");
bullet("Title & date", "“Dashboard” heading with a live subtitle showing today's full date (e.g. Monday, 9 June 2026).");
bullet("Time-range selector", "A dropdown in the top-right that controls the Revenue Overview chart window. Options: Last 3 / 6 / 12 / 24 months. Default is 6 months.");

// ---------- STAT CARDS ----------
h1("2. KPI Stat Cards");
para("A responsive grid of six colour-coded cards. Each shows an icon, a large value, a label, and a one-line hint. They update live from the dashboard-stats endpoint.");
table(
  ["Card", "What it shows", "Hint"],
  [
    ["Total Clients", "Count of active client accounts", "Active accounts"],
    ["Active Orders", "Sales orders currently in progress", "In progress"],
    ["Pending Assembly", "Gift kits awaiting build/assembly", "Awaiting build"],
    ["Overdue Invoices", "Invoices past their due date", "Need follow-up"],
    ["Low Stock Items", "Products below reorder threshold", "Reorder soon"],
    ["Pending POs", "Open purchase orders with vendors", "Open with vendors"],
  ],
  [120, 270, 105]
);

// ---------- CHARTS ----------
h1("3. Analytics Charts");
h2("Revenue Overview");
para("An area chart plotting monthly revenue over the selected time range. The X-axis shows months; the Y-axis shows revenue formatted in ₹. The amber gradient fill reflects the brand accent. Hovering a point reveals an exact value tooltip.");
h2("Sales Pipeline");
para("A horizontal bar chart breaking down opportunities by pipeline stage/status. Each bar's length represents the value at that stage, helping you spot where deals are concentrated or stalling.");

// ---------- WIDGETS ----------
h1("4. Insight Widgets");
para("Three cards sit in a row beneath the charts, each surfacing a focused operational insight.");

h2("Top Products");
bullet("Purpose", "Ranks your best-selling products by revenue across all confirmed sales orders.");
bullet("Details", "Shows up to 6 products with a medal-style rank badge (gold/silver/bronze for the top three), revenue in ₹, a proportional progress bar, and units sold.");
bullet("Empty state", "“No sales data yet” when there are no confirmed orders.");

h2("Sales Leaderboard");
bullet("Purpose", "Ranks sales owners by closed-won value plus open pipeline.");
bullet("Details", "Each row shows a rank medal, owner initials avatar, name, role, count of open and won opportunities, total won value in ₹, and remaining pipeline value.");
bullet("Empty state", "“No assigned opportunities yet”.");

h2("AR Aging (Accounts Receivable)");
bullet("Purpose", "Shows how much money is outstanding and how overdue it is.");
bullet("Details", "Displays the total outstanding amount, then breaks it into aging buckets — Current, 1-30, 31-60, 61-90, and 90+ days — each with a colour-coded bar (green → red as overdue grows).");
bullet("Empty state", "“No outstanding invoices” when nothing is due.");

// ---------- TOP CLIENTS ----------
h1("5. Top Clients");
para("A list card at the bottom of the page ranking your highest-value clients. Each entry shows the client name, total number of orders, and total revenue in ₹. Displays “No client data available.” when empty.");

// ---------- DATA & BEHAVIOUR ----------
h1("6. Data & Behaviour Notes");
bullet("Live data", "All sections fetch from the analytics API; figures reflect current database state, not cached snapshots.");
bullet("Loading state", "While data loads, the page shows a “Loading dashboard...” placeholder.");
bullet("Currency", "Every amount uses ₹ with Indian digit grouping (en-IN).");
bullet("Interactivity", "Only the time-range dropdown changes what you see; charts have hover tooltips. Other tiles are read-only summaries — use the sidebar to drill into each module.");

// ---------- FOOTER on all pages ----------
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  const fy = doc.page.height - 38;
  doc.moveTo(ML, fy).lineTo(ML + CW, fy).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.fillColor(C.sub).font("Helvetica").fontSize(8);
  doc.text("GiftERP · Dashboard Notes", ML, fy + 6, { width: CW / 2, align: "left" });
  doc.text("Page " + (i + 1) + " of " + range.count, ML + CW / 2, fy + 6, { width: CW / 2, align: "right" });
}

doc.end();
console.log("Wrote", OUT);
