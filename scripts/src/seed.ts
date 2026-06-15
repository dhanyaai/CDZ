import {
  db,
  companiesTable, userCompaniesTable, usersTable,
  clientsTable, clientInteractionsTable, contactsTable,
  vendorsTable, productsTable,
  categoriesTable,
  bundlesTable, bundleItemsTable,
  warehouseLocationsTable,
  salesOrdersTable, salesOrderItemsTable, deliveryAddressesTable,
  purchaseOrdersTable, purchaseOrderItemsTable,
  grnTable, grnItemsTable,
  inventoryMovementsTable,
  assemblyJobsTable, artworkApprovalsTable,
  shipmentsTable, shipmentItemsTable,
  invoicesTable, paymentsTable,
  leadsTable, opportunitiesTable,
  quotesTable, quoteItemsTable,
  fixedAssetsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomBytes, scryptSync } from "node:crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

// today = June 14 2026 → compute past dates
function daysAgo(n: number) {
  const d = new Date("2026-06-14T12:00:00Z");
  d.setDate(d.getDate() - n);
  return d;
}

async function truncate() {
  await db.execute(sql`TRUNCATE TABLE
    goods_receipt_items, goods_receipts,
    quote_items, quotes,
    opportunities, leads,
    fixed_assets,
    user_companies, payments, invoices,
    shipment_items, shipments,
    artwork_approvals, assembly_items, assembly_jobs,
    inventory_movements,
    purchase_order_items, purchase_orders,
    delivery_addresses, sales_order_items, sales_orders,
    bundle_items, bundles, products, categories, vendors,
    client_interactions, contacts, clients,
    warehouse_locations, users, companies
    RESTART IDENTITY CASCADE`);
}

async function seed() {
  console.log("Truncating existing data...");
  await truncate();

  // ── Company ───────────────────────────────────────────────────────────────────
  console.log("Company...");
  const [co] = await db.insert(companiesTable).values([{
    name: "Customize Duniya",
    gstin: "27AABCU9603R1ZX",
    gstAddress: "B-204, Okhla Industrial Estate Phase III, New Delhi 110020",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110020",
    productionEnabled: true,
  }]).returning();

  // ── Users ─────────────────────────────────────────────────────────────────────
  console.log("Users...");
  const [admin, priya, arjun, vikram, anita] = await db.insert(usersTable).values([
    { name: "Rajesh Mehta",   email: "admin@gifterp.com",  passwordHash: hashPassword("admin123"), role: "Admin",     companyId: co.id },
    { name: "Priya Sharma",   email: "priya@gifterp.com",  passwordHash: hashPassword("sales123"), role: "Sales",     companyId: co.id },
    { name: "Arjun Nair",     email: "arjun@gifterp.com",  passwordHash: hashPassword("sales123"), role: "Sales",     companyId: co.id },
    { name: "Vikram Singh",   email: "vikram@gifterp.com", passwordHash: hashPassword("wh123"),    role: "Warehouse", companyId: co.id },
    { name: "Anita Patel",    email: "anita@gifterp.com",  passwordHash: hashPassword("fin123"),   role: "Finance",   companyId: co.id },
  ]).returning();

  await db.insert(userCompaniesTable).values([
    { userId: admin.id,  companyId: co.id },
    { userId: priya.id,  companyId: co.id },
    { userId: arjun.id,  companyId: co.id },
    { userId: vikram.id, companyId: co.id },
    { userId: anita.id,  companyId: co.id },
  ]);

  // ── Warehouse Locations ───────────────────────────────────────────────────────
  console.log("Locations...");
  const [mwh, del, mum] = await db.insert(warehouseLocationsTable).values([
    { companyId: co.id, name: "Main Warehouse — Gurugram", code: "MWH-GGN", zone: "A", type: "storage",  capacity: 5000, notes: "Primary production and storage facility" },
    { companyId: co.id, name: "Delhi Sales Office",        code: "DEL-SLS", zone: "B", type: "dispatch", capacity: 1000, notes: "North India dispatch hub" },
    { companyId: co.id, name: "Mumbai Hub",                code: "MUM-HUB", zone: "C", type: "storage",  capacity: 2000, notes: "West India distribution centre" },
  ]).returning();

  // ── Categories ────────────────────────────────────────────────────────────────
  console.log("Categories...");
  await db.insert(categoriesTable).values([
    { companyId: co.id, name: "Drinkware",         slug: "drinkware" },
    { companyId: co.id, name: "Apparel",            slug: "apparel" },
    { companyId: co.id, name: "Stationery",         slug: "stationery" },
    { companyId: co.id, name: "Electronics",        slug: "electronics" },
    { companyId: co.id, name: "Bags & Accessories", slug: "bags-accessories" },
    { companyId: co.id, name: "Food & Beverage",    slug: "food-beverage" },
    { companyId: co.id, name: "Office Gifts",       slug: "office-gifts" },
    { companyId: co.id, name: "Lifestyle",          slug: "lifestyle" },
  ]);

  // ── Vendors ───────────────────────────────────────────────────────────────────
  console.log("Vendors...");
  const [craftVendor, luxeVendor, techVendor, printVendor, foodVendor] = await db.insert(vendorsTable).values([
    { companyId: co.id, name: "Craftsman Artisans Pvt Ltd", contactPerson: "Gopal Rao",    email: "gopal@craftsman.in",    phone: "+91-9900001111", leadTimeDays: 10 },
    { companyId: co.id, name: "LuxeGifts Wholesale",        contactPerson: "Farah Khan",   email: "farah@luxegifts.in",    phone: "+91-9900002222", leadTimeDays: 7  },
    { companyId: co.id, name: "TechPack Solutions",         contactPerson: "Kiran Babu",   email: "kiran@techpack.in",     phone: "+91-9900003333", leadTimeDays: 5  },
    { companyId: co.id, name: "PrintWorks India",           contactPerson: "Ramesh Gupta", email: "ramesh@printworks.in",  phone: "+91-9900004444", leadTimeDays: 3  },
    { companyId: co.id, name: "Gourmet Bazaar",             contactPerson: "Lakshmi Nair", email: "lakshmi@gourmetbazaar.in", phone: "+91-9900005555", leadTimeDays: 4 },
  ]).returning();

  // ── Products ──────────────────────────────────────────────────────────────────
  // stockLevel is set to match the FIFO movement plan below
  console.log("Products...");
  const [
    diarySet, leatherWallet, earbuds, chocolateBox, dryFruits,
    succulentKit, notebook, mug, tShirt, slingBag,
    waterBottle, keychain, penStand, usbHub, giftBox,
  ] = await db.insert(productsTable).values([
    // name, category, costPrice, sellingPrice, stockLevel, lowStockThreshold, vendorId
    { companyId: co.id, name: "Executive Diary & Pen Set",     category: "Stationery",         costPrice: "320",  sellingPrice: "550",  stockLevel: 250, lowStockThreshold: 30, vendorId: craftVendor.id, imageUrl: "https://images.unsplash.com/photo-1517697471339-4aa32003c11a?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Genuine Leather Wallet",        category: "Bags & Accessories", costPrice: "480",  sellingPrice: "850",  stockLevel: 180, lowStockThreshold: 20, vendorId: luxeVendor.id,  imageUrl: "https://images.unsplash.com/photo-1548036161-63da0e2c4b3a?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Wireless Earbuds Pro",          category: "Electronics",        costPrice: "1200", sellingPrice: "1999", stockLevel: 85,  lowStockThreshold: 15, vendorId: techVendor.id,  imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Premium Chocolate Box (18pc)",  category: "Food & Beverage",    costPrice: "250",  sellingPrice: "450",  stockLevel: 320, lowStockThreshold: 50, vendorId: foodVendor.id,  imageUrl: "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Mixed Dry Fruits Tin (500g)",   category: "Food & Beverage",    costPrice: "380",  sellingPrice: "650",  stockLevel: 210, lowStockThreshold: 40, vendorId: foodVendor.id,  imageUrl: "https://images.unsplash.com/photo-1596560703905-17b38cc18867?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Indoor Succulent Plant Kit",    category: "Lifestyle",          costPrice: "280",  sellingPrice: "499",  stockLevel: 8,   lowStockThreshold: 20, vendorId: craftVendor.id, imageUrl: "https://images.unsplash.com/photo-1459156212016-c812468e2115?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Branded Hardbound Notebook",    category: "Stationery",         costPrice: "180",  sellingPrice: "320",  stockLevel: 420, lowStockThreshold: 60, vendorId: printVendor.id, imageUrl: "https://images.unsplash.com/photo-1544816155-9e2040e0c9a8?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Ceramic Coffee Mug (Set of 2)", category: "Drinkware",          costPrice: "200",  sellingPrice: "380",  stockLevel: 150, lowStockThreshold: 25, vendorId: craftVendor.id, imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Company-Branded T-Shirt",       category: "Apparel",            costPrice: "300",  sellingPrice: "499",  stockLevel: 5,   lowStockThreshold: 30, vendorId: luxeVendor.id,  imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Canvas Sling Bag",              category: "Bags & Accessories", costPrice: "350",  sellingPrice: "599",  stockLevel: 120, lowStockThreshold: 20, vendorId: luxeVendor.id,  imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Custom Water Bottle 750ml",     category: "Drinkware",          costPrice: "195",  sellingPrice: "360",  stockLevel: 95,  lowStockThreshold: 20, vendorId: craftVendor.id, imageUrl: "https://images.unsplash.com/photo-1602143407296-ab22a1585ad0?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Premium Keychain Set (3pc)",    category: "Bags & Accessories", costPrice: "45",   sellingPrice: "89",   stockLevel: 480, lowStockThreshold: 80, vendorId: printVendor.id, imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Bamboo Pen Stand",              category: "Office Gifts",       costPrice: "175",  sellingPrice: "320",  stockLevel: 130, lowStockThreshold: 25, vendorId: craftVendor.id, imageUrl: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "USB-C Hub 7-in-1",             category: "Electronics",        costPrice: "450",  sellingPrice: "799",  stockLevel: 40,  lowStockThreshold: 10, vendorId: techVendor.id,  imageUrl: "https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=400&h=400&fit=crop&auto=format&q=80" },
    { companyId: co.id, name: "Premium Gift Wrap Box Set",     category: "Lifestyle",          costPrice: "150",  sellingPrice: "280",  stockLevel: 360, lowStockThreshold: 50, vendorId: printVendor.id, imageUrl: "https://images.unsplash.com/photo-1549465220-1a57ef4ad1d3?w=400&h=400&fit=crop&auto=format&q=80" },
  ]).returning();

  // ── Bundles ───────────────────────────────────────────────────────────────────
  console.log("Bundles...");
  const [diwaliBundle, techBundle, welcomeKit] = await db.insert(bundlesTable).values([
    { name: "Diwali Hamper Deluxe",   description: "Premium Diwali gifting hamper with sweets and accessories", occasion: "Diwali"        },
    { name: "Tech Professional Kit",  description: "Essential tech accessories for the modern professional",    occasion: "Work Anniversary" },
    { name: "New Joiner Welcome Kit", description: "Thoughtful onboarding kit for new employees",              occasion: "Onboarding"    },
    { name: "Festival Combo Pack",    description: "Curated festive combo of F&B and stationery",              occasion: "Festivals"     },
  ]).returning();

  await db.insert(bundleItemsTable).values([
    { bundleId: diwaliBundle.id, productId: chocolateBox.id, quantity: 1 },
    { bundleId: diwaliBundle.id, productId: dryFruits.id,   quantity: 1 },
    { bundleId: diwaliBundle.id, productId: diarySet.id,    quantity: 1 },
    { bundleId: techBundle.id,   productId: earbuds.id,     quantity: 1 },
    { bundleId: techBundle.id,   productId: notebook.id,    quantity: 1 },
    { bundleId: techBundle.id,   productId: usbHub.id,      quantity: 1 },
    { bundleId: welcomeKit.id,   productId: notebook.id,    quantity: 1 },
    { bundleId: welcomeKit.id,   productId: tShirt.id,      quantity: 1 },
    { bundleId: welcomeKit.id,   productId: mug.id,         quantity: 1 },
    { bundleId: welcomeKit.id,   productId: slingBag.id,    quantity: 1 },
  ]);

  // ── Clients ───────────────────────────────────────────────────────────────────
  console.log("Clients...");
  const [tcs, infosys, wipro, hdfc, reliance, zomato, paytm, oyo] = await db.insert(clientsTable).values([
    { companyId: co.id, companyName: "Tata Consultancy Services",  contactPerson: "Rahul Verma",    email: "rahul@tcs.com",         phone: "+91-9876543210", gstNumber: "27AAACT1234F1Z5", industry: "Technology",    tags: "enterprise,repeat",  billingAddress: "TCS House, Fort, Mumbai 400001",         shippingAddress: "TCS House, Fort, Mumbai 400001" },
    { companyId: co.id, companyName: "Infosys Limited",            contactPerson: "Suresh Kumar",   email: "suresh@infosys.com",    phone: "+91-9876500001", gstNumber: "29AABCI1234J1ZP", industry: "Technology",    tags: "enterprise",         billingAddress: "Electronics City, Bangalore 560100",     shippingAddress: "Electronics City, Bangalore 560100" },
    { companyId: co.id, companyName: "Wipro Technologies",         contactPerson: "Meena Iyer",     email: "meena@wipro.com",       phone: "+91-9876500002", gstNumber: "29AABCW2345K2ZQ", industry: "Technology",    tags: "large-account",      billingAddress: "Doddakannelli, Bangalore 560035",        shippingAddress: "Doddakannelli, Bangalore 560035" },
    { companyId: co.id, companyName: "HDFC Bank Ltd",              contactPerson: "Sunita Kapoor",  email: "sunita@hdfcbank.com",   phone: "+91-9876500003", gstNumber: "27AAACH5234G1Z2", industry: "Banking",       tags: "fintech,premium",    billingAddress: "HDFC Tower, Lower Parel, Mumbai 400013", shippingAddress: "HDFC Tower, Lower Parel, Mumbai 400013" },
    { companyId: co.id, companyName: "Reliance Industries",        contactPerson: "Amit Shah",      email: "amit.shah@ril.com",     phone: "+91-9876500004", gstNumber: "27AAACR4849R1ZQ", industry: "Conglomerate",  tags: "enterprise,priority",billingAddress: "Maker Chambers, Mumbai 400021",          shippingAddress: "Jamnagar 361142" },
    { companyId: co.id, companyName: "Zomato Limited",             contactPerson: "Deepika Roy",    email: "deepika@zomato.com",    phone: "+91-9876500005", gstNumber: "07AABCZ5678L1ZH", industry: "Food & Tech",   tags: "startup,festive",    billingAddress: "Ground Floor, Gurgaon 122001",           shippingAddress: "Ground Floor, Gurgaon 122001" },
    { companyId: co.id, companyName: "Paytm Payments Bank",        contactPerson: "Neeraj Bajaj",   email: "neeraj@paytm.com",      phone: "+91-9876500006", gstNumber: "09AABCP1234M1ZK", industry: "Fintech",       tags: "startup,premium",    billingAddress: "B-121, Noida Special Zone, 201301",      shippingAddress: "B-121, Noida Special Zone, 201301" },
    { companyId: co.id, companyName: "OYO Rooms India",            contactPerson: "Ritesh Khanna",  email: "ritesh@oyorooms.com",   phone: "+91-9876500007", gstNumber: "07AABCO5678P1ZL", industry: "Hospitality",   tags: "startup",            billingAddress: "DLF Cyber City, Gurgaon 122002",         shippingAddress: "DLF Cyber City, Gurgaon 122002" },
  ]).returning();

  // ── Contacts ──────────────────────────────────────────────────────────────────
  console.log("Contacts...");
  await db.insert(contactsTable).values([
    { companyId: co.id, clientId: tcs.id,     firstName: "Rahul",    lastName: "Verma",    designation: "VP Procurement",  department: "Admin", email: "rahul@tcs.com",          phone: "+91-9876543210", isPrimary: true  },
    { companyId: co.id, clientId: tcs.id,     firstName: "Sneha",    lastName: "Pillai",   designation: "Admin Manager",   department: "Admin", email: "sneha.p@tcs.com",         phone: "+91-9876543211", isPrimary: false },
    { companyId: co.id, clientId: infosys.id, firstName: "Suresh",   lastName: "Kumar",    designation: "Director HR",     department: "HR",    email: "suresh@infosys.com",      phone: "+91-9876500001", isPrimary: true  },
    { companyId: co.id, clientId: hdfc.id,    firstName: "Sunita",   lastName: "Kapoor",   designation: "Head of Gifts",   department: "HR",    email: "sunita@hdfcbank.com",     phone: "+91-9876500003", isPrimary: true  },
    { companyId: co.id, clientId: reliance.id,firstName: "Amit",     lastName: "Shah",     designation: "GM Procurement",  department: "Ops",   email: "amit.shah@ril.com",       phone: "+91-9876500004", isPrimary: true  },
    { companyId: co.id, clientId: zomato.id,  firstName: "Deepika",  lastName: "Roy",      designation: "Head of Culture", department: "HR",    email: "deepika@zomato.com",      phone: "+91-9876500005", isPrimary: true  },
    { companyId: co.id, clientId: paytm.id,   firstName: "Neeraj",   lastName: "Bajaj",    designation: "Procurement Mgr", department: "Admin", email: "neeraj@paytm.com",        phone: "+91-9876500006", isPrimary: true  },
    { companyId: co.id, clientId: oyo.id,     firstName: "Ritesh",   lastName: "Khanna",   designation: "Office Manager",  department: "Admin", email: "ritesh@oyorooms.com",     phone: "+91-9876500007", isPrimary: true  },
  ]);

  // ── Client Interactions ───────────────────────────────────────────────────────
  await db.insert(clientInteractionsTable).values([
    { clientId: tcs.id,      type: "call",    notes: "Discussed Diwali gifting requirements. Expected order of 5,000 units across 10 offices." },
    { clientId: tcs.id,      type: "email",   notes: "Sent proposal for premium gift hampers with branding options. Quoted ₹550/unit." },
    { clientId: infosys.id,  type: "meeting", notes: "Presented Q4 gifting catalog. Client interested in Tech Kit bundles for 200 employees." },
    { clientId: hdfc.id,     type: "call",    notes: "Confirmed Diwali order details — 2,000 hampers to 15 branches PAN India." },
    { clientId: reliance.id, type: "email",   notes: "Sent new-year gifting ideas. Budget ₹2,000 per person for 1,000 recipients." },
    { clientId: zomato.id,   type: "meeting", notes: "Onboarding meeting. Looking for employee appreciation welcome kits." },
    { clientId: paytm.id,    type: "call",    notes: "New client call. Interested in bulk keychain + notebook combo for 500 interns." },
    { clientId: oyo.id,      type: "email",   notes: "Introductory email sent. OYO wants branded drinkware for 800 hotel staff." },
  ]);

  // ── Leads & Opportunities ─────────────────────────────────────────────────────
  console.log("Leads & Opportunities...");
  const [ldAccenture, ldAmazon, ldFlipkart, ldGoogle, ldByjus, ldPhonePe] = await db.insert(leadsTable).values([
    { companyId: co.id, title: "Accenture India — Diwali 2026",         clientId: null, status: "qualified", ownerId: priya.id  },
    { companyId: co.id, title: "Amazon India — Employee Appreciation",  clientId: null, status: "qualified", ownerId: priya.id  },
    { companyId: co.id, title: "Flipkart — New Joiner Kit Program",     clientId: null, status: "contacted", ownerId: arjun.id  },
    { companyId: co.id, title: "Google India — Conference Swag 2026",   clientId: null, status: "new",       ownerId: priya.id  },
    { companyId: co.id, title: "Byju's — Student Achievement Awards",   clientId: null, status: "contacted", ownerId: arjun.id  },
    { companyId: co.id, title: "PhonePe — Festival Gifting Season",     clientId: null, status: "new",       ownerId: priya.id  },
  ]).returning();

  const [oppAccenture, oppAmazon, oppGoogle, oppFlipkart] = await db.insert(opportunitiesTable).values([
    { companyId: co.id, title: "Accenture Diwali Gift Campaign",    leadId: ldAccenture.id, stage: "proposal",   probability: 65, value: "1500000", ownerId: priya.id  },
    { companyId: co.id, title: "Amazon Employee Kit Program",       leadId: ldAmazon.id,    stage: "negotiate",  probability: 75, value: "800000",  ownerId: priya.id  },
    { companyId: co.id, title: "Google I/O India Swag",            leadId: ldGoogle.id,    stage: "prospect",   probability: 40, value: "500000",  ownerId: arjun.id  },
    { companyId: co.id, title: "Flipkart Joiner Kit",              leadId: ldFlipkart.id,  stage: "proposal",   probability: 55, value: "350000",  ownerId: arjun.id  },
  ]).returning();

  // ── Quotes ────────────────────────────────────────────────────────────────────
  console.log("Quotes...");
  const [qt1, qt2, qt3, qt4, qt5, qt6, qt7, qt8] = await db.insert(quotesTable).values([
    { companyId: co.id, quoteNumber: "QT-00001", clientId: tcs.id,     opportunityId: null,               status: "accepted", subtotal: "2500000", discountPct: "5",  gstAmount: "427500", totalAmount: "2927500", validUntil: new Date("2026-04-30"), notes: "Diwali 2025 hampers — 5,000 units" },
    { companyId: co.id, quoteNumber: "QT-00002", clientId: infosys.id, opportunityId: null,               status: "accepted", subtotal: "399800",  discountPct: "0",  gstAmount: "71964",  totalAmount: "471764",  validUntil: new Date("2026-03-31"), notes: "200 Tech Professional Kits" },
    { companyId: co.id, quoteNumber: "QT-00003", clientId: hdfc.id,    opportunityId: null,               status: "sent",     subtotal: "900000",  discountPct: "0",  gstAmount: "162000", totalAmount: "1062000", validUntil: new Date("2026-06-30"), notes: "2,000 Diwali hampers to 15 branches" },
    { companyId: co.id, quoteNumber: "QT-00004", clientId: paytm.id,   opportunityId: null,               status: "sent",     subtotal: "64000",   discountPct: "5",  gstAmount: "10944",  totalAmount: "74944",   validUntil: new Date("2026-07-15"), notes: "500 intern combo kits" },
    { companyId: co.id, quoteNumber: "QT-00005", clientId: oyo.id,     opportunityId: null,               status: "draft",    subtotal: "34200",   discountPct: "0",  gstAmount: "6156",   totalAmount: "40356",   validUntil: new Date("2026-07-31"), notes: "Branded drinkware for hotel staff" },
    { companyId: co.id, quoteNumber: "QT-00006", clientId: wipro.id,   opportunityId: null,               status: "rejected", subtotal: "149700",  discountPct: "0",  gstAmount: "26946",  totalAmount: "176646",  validUntil: new Date("2026-03-01"), notes: "300 units — lost to competitor on price" },
    { companyId: co.id, quoteNumber: "QT-00007", clientId: zomato.id,  opportunityId: null,               status: "accepted", subtotal: "99600",   discountPct: "0",  gstAmount: "17928",  totalAmount: "117528",  validUntil: new Date("2026-05-31"), notes: "200 Welcome Kits for new joiners" },
    { companyId: co.id, quoteNumber: "QT-00008", clientId: reliance.id,opportunityId: null,               status: "sent",     subtotal: "650000",  discountPct: "8",  gstAmount: "107640", totalAmount: "757640",  validUntil: new Date("2026-07-15"), notes: "New Year 1,000 dry fruits tins" },
  ]).returning();

  await db.insert(quoteItemsTable).values([
    { quoteId: qt1.id, description: "Executive Diary & Pen Set (branded)", quantity: 5000, unitPrice: "550",  lineTotal: "2750000" },
    { quoteId: qt1.id, description: "Branded packaging + wrapping",        quantity: 5000, unitPrice: "50",   lineTotal: "250000" },
    { quoteId: qt2.id, description: "Wireless Earbuds Pro",                quantity: 200,  unitPrice: "1999", lineTotal: "399800" },
    { quoteId: qt3.id, description: "Diwali Hamper Deluxe bundle",         quantity: 2000, unitPrice: "450",  lineTotal: "900000" },
    { quoteId: qt4.id, description: "Premium Keychain Set (3pc)",          quantity: 500,  unitPrice: "89",   lineTotal: "44500"  },
    { quoteId: qt4.id, description: "Branded Hardbound Notebook",          quantity: 500,  unitPrice: "320",  lineTotal: "160000" },
    { quoteId: qt5.id, description: "Custom Water Bottle 750ml (branded)", quantity: 95,   unitPrice: "360",  lineTotal: "34200"  },
    { quoteId: qt7.id, description: "New Joiner Welcome Kit",              quantity: 200,  unitPrice: "498",  lineTotal: "99600"  },
    { quoteId: qt8.id, description: "Mixed Dry Fruits Tin (500g)",         quantity: 1000, unitPrice: "650",  lineTotal: "650000" },
  ]);

  // ── Sales Orders ──────────────────────────────────────────────────────────────
  console.log("Sales Orders...");
  const soRows = await db.insert(salesOrdersTable).values([
    { companyId: co.id, orderNumber: "SO-00001", clientId: tcs.id,      status: "Delivered",     totalAmount: "2750000", occasion: "Diwali",          notes: "5,000 units delivered to 10 TCS offices PAN India" },
    { companyId: co.id, orderNumber: "SO-00002", clientId: infosys.id,  status: "In Production", totalAmount: "399800",  occasion: "Work Anniversary", notes: "200 Tech Professional Kits — assembly in progress" },
    { companyId: co.id, orderNumber: "SO-00003", clientId: hdfc.id,     status: "Confirmed",     totalAmount: "900000",  occasion: "Diwali",           notes: "2,000 Diwali hampers to 15 branches" },
    { companyId: co.id, orderNumber: "SO-00004", clientId: wipro.id,    status: "Draft",         totalAmount: "149700",  occasion: "New Year",         notes: "300 units, pending final client approval" },
    { companyId: co.id, orderNumber: "SO-00005", clientId: reliance.id, status: "Dispatched",    totalAmount: "650000",  occasion: "New Year",         notes: "1,000 dry fruits tins — in transit to Jamnagar" },
    { companyId: co.id, orderNumber: "SO-00006", clientId: zomato.id,   status: "Ready",         totalAmount: "99600",   occasion: "Onboarding",       notes: "200 Welcome Kits for Zomato new joiners" },
    { companyId: co.id, orderNumber: "SO-00007", clientId: tcs.id,      status: "Delivered",     totalAmount: "1120000", occasion: "New Year",         notes: "TCS New Year 2026 — 2,000 diary sets + notebooks" },
    { companyId: co.id, orderNumber: "SO-00008", clientId: wipro.id,    status: "In Production", totalAmount: "299500",  occasion: "Work Anniversary",  notes: "500 mug + sling bag combos for Wipro anniversary" },
    { companyId: co.id, orderNumber: "SO-00009", clientId: paytm.id,    status: "Confirmed",     totalAmount: "64000",   occasion: "Onboarding",       notes: "500 intern combo kits — keychains + notebooks" },
    { companyId: co.id, orderNumber: "SO-00010", clientId: oyo.id,      status: "Draft",         totalAmount: "34200",   occasion: "Diwali",           notes: "95 branded water bottles for hotel staff" },
    { companyId: co.id, orderNumber: "SO-00011", clientId: hdfc.id,     status: "Dispatched",    totalAmount: "292500",  occasion: "New Year",         notes: "HDFC new year drinkware & stationery combo" },
    { companyId: co.id, orderNumber: "SO-00012", clientId: infosys.id,  status: "Delivered",     totalAmount: "184500",  occasion: "Festive",          notes: "Infosys Q1 festive kits — chocolate + dry fruits" },
  ]).returning();

  const [so1, so2, so3, so4, so5, so6, so7, so8, so9, so10, so11, so12] = soRows;

  await db.insert(salesOrderItemsTable).values([
    { salesOrderId: so1.id,  productId: diarySet.id,    quantity: 5000, unitPrice: "550"  },
    { salesOrderId: so2.id,  productId: earbuds.id,     quantity: 200,  unitPrice: "1999" },
    { salesOrderId: so3.id,  productId: chocolateBox.id,quantity: 2000, unitPrice: "450"  },
    { salesOrderId: so4.id,  productId: notebook.id,    quantity: 300,  unitPrice: "320"  },
    { salesOrderId: so4.id,  productId: mug.id,         quantity: 150,  unitPrice: "380"  },
    { salesOrderId: so5.id,  productId: dryFruits.id,   quantity: 1000, unitPrice: "650"  },
    { salesOrderId: so6.id,  productId: notebook.id,    quantity: 200,  unitPrice: "320"  },
    { salesOrderId: so6.id,  productId: tShirt.id,      quantity: 200,  unitPrice: "499"  },
    { salesOrderId: so7.id,  productId: diarySet.id,    quantity: 1500, unitPrice: "550"  },
    { salesOrderId: so7.id,  productId: notebook.id,    quantity: 500,  unitPrice: "320"  },
    { salesOrderId: so8.id,  productId: mug.id,         quantity: 500,  unitPrice: "380"  },
    { salesOrderId: so8.id,  productId: slingBag.id,    quantity: 100,  unitPrice: "599"  },
    { salesOrderId: so9.id,  productId: keychain.id,    quantity: 500,  unitPrice: "89"   },
    { salesOrderId: so9.id,  productId: notebook.id,    quantity: 200,  unitPrice: "320"  },
    { salesOrderId: so10.id, productId: waterBottle.id, quantity: 95,   unitPrice: "360"  },
    { salesOrderId: so11.id, productId: mug.id,         quantity: 500,  unitPrice: "380"  },
    { salesOrderId: so11.id, productId: diarySet.id,    quantity: 200,  unitPrice: "550"  },
    { salesOrderId: so12.id, productId: chocolateBox.id,quantity: 200,  unitPrice: "450"  },
    { salesOrderId: so12.id, productId: dryFruits.id,   quantity: 150,  unitPrice: "650"  },
  ]);

  await db.insert(deliveryAddressesTable).values([
    { salesOrderId: so1.id,  name: "TCS Mumbai HQ",        address: "TCS House, Raveline St, Fort, Mumbai", city: "Mumbai",    pincode: "400001" },
    { salesOrderId: so1.id,  name: "TCS Pune Campus",       address: "Hinjewadi IT Park, Pune",             city: "Pune",      pincode: "411057" },
    { salesOrderId: so3.id,  name: "HDFC Central Office",   address: "HDFC Tower, Lower Parel, Mumbai",     city: "Mumbai",    pincode: "400013" },
    { salesOrderId: so3.id,  name: "HDFC Bangalore Zone",   address: "Cunningham Road, Bangalore",          city: "Bangalore", pincode: "560052" },
    { salesOrderId: so6.id,  name: "Zomato HQ",             address: "Ground Floor, Tower D, Gurgaon",     city: "Gurgaon",   pincode: "122001" },
    { salesOrderId: so7.id,  name: "TCS Noida Campus",      address: "TCS IT Park, Sector 132, Noida",     city: "Noida",     pincode: "201301" },
    { salesOrderId: so11.id, name: "HDFC Nariman Point",    address: "HDFC Bank Ltd, Nariman Point",        city: "Mumbai",    pincode: "400021" },
  ]);

  // ── Purchase Orders ───────────────────────────────────────────────────────────
  console.log("Purchase Orders...");
  const poRows = await db.insert(purchaseOrdersTable).values([
    { companyId: co.id, poNumber: "PO-00001", vendorId: craftVendor.id, salesOrderId: so1.id,  status: "Fully Received",    totalAmount: "1600000", expectedDelivery: new Date("2025-09-15") },
    { companyId: co.id, poNumber: "PO-00002", vendorId: techVendor.id,  salesOrderId: so2.id,  status: "Partially Received",totalAmount: "240000",  expectedDelivery: new Date("2026-05-30") },
    { companyId: co.id, poNumber: "PO-00003", vendorId: foodVendor.id,  salesOrderId: so3.id,  status: "Ordered",           totalAmount: "500000",  expectedDelivery: new Date("2026-06-20") },
    { companyId: co.id, poNumber: "PO-00004", vendorId: printVendor.id, salesOrderId: so4.id,  status: "Ordered",           totalAmount: "63000",   expectedDelivery: new Date("2026-06-25") },
    { companyId: co.id, poNumber: "PO-00005", vendorId: foodVendor.id,  salesOrderId: so5.id,  status: "Fully Received",    totalAmount: "380000",  expectedDelivery: new Date("2026-04-01") },
    { companyId: co.id, poNumber: "PO-00006", vendorId: luxeVendor.id,  salesOrderId: so8.id,  status: "Partially Received",totalAmount: "175000",  expectedDelivery: new Date("2026-06-10") },
    { companyId: co.id, poNumber: "PO-00007", vendorId: printVendor.id, salesOrderId: so9.id,  status: "Ordered",           totalAmount: "22500",   expectedDelivery: new Date("2026-06-28") },
    { companyId: co.id, poNumber: "PO-00008", vendorId: craftVendor.id, salesOrderId: null,    status: "Ordered",           totalAmount: "58500",   expectedDelivery: new Date("2026-07-05") },
  ]).returning();

  await db.insert(purchaseOrderItemsTable).values([
    { purchaseOrderId: poRows[0].id, productId: diarySet.id,    quantity: 5000, unitPrice: "320", receivedQty: 5000 },
    { purchaseOrderId: poRows[1].id, productId: earbuds.id,     quantity: 200,  unitPrice: "1200",receivedQty: 120  },
    { purchaseOrderId: poRows[2].id, productId: chocolateBox.id,quantity: 2000, unitPrice: "250", receivedQty: 0    },
    { purchaseOrderId: poRows[3].id, productId: notebook.id,    quantity: 350,  unitPrice: "180", receivedQty: 0    },
    { purchaseOrderId: poRows[4].id, productId: dryFruits.id,   quantity: 1000, unitPrice: "380", receivedQty: 1000 },
    { purchaseOrderId: poRows[5].id, productId: slingBag.id,    quantity: 200,  unitPrice: "350", receivedQty: 120  },
    { purchaseOrderId: poRows[6].id, productId: keychain.id,    quantity: 500,  unitPrice: "45",  receivedQty: 0    },
    { purchaseOrderId: poRows[7].id, productId: waterBottle.id, quantity: 300,  unitPrice: "195", receivedQty: 0    },
  ]);

  // ── GRNs (Goods Receipts) ─────────────────────────────────────────────────────
  console.log("GRNs...");
  const [grn1, grn2, grn3] = await db.insert(grnTable).values([
    { companyId: co.id, grnNumber: "GRN-00001", purchaseOrderId: poRows[0].id, receivedDate: daysAgo(120), status: "received" },
    { companyId: co.id, grnNumber: "GRN-00002", purchaseOrderId: poRows[1].id, receivedDate: daysAgo(45),  status: "received" },
    { companyId: co.id, grnNumber: "GRN-00003", purchaseOrderId: poRows[4].id, receivedDate: daysAgo(60),  status: "received" },
  ]).returning();

  await db.insert(grnItemsTable).values([
    { grnId: grn1.id, productId: diarySet.id,  quantityReceived: 5000, quantityRejected: 0   },
    { grnId: grn2.id, productId: earbuds.id,   quantityReceived: 120,  quantityRejected: 0   },
    { grnId: grn3.id, productId: dryFruits.id, quantityReceived: 1000, quantityRejected: 0   },
  ]);

  // ── Inventory Movements (varied dates for stock-ageing spread) ────────────────
  // Today = 14 Jun 2026. Buckets: 0-30d | 31-60d | 61-90d | 90+d
  //
  // diarySet    : opening 5000 @ d(-120) ─ outward 5250 ─ inward 50 @ d(-10)  → 50 in 0-30 + 200 in 90+
  // leatherWallet: opening 200 @ d(-95)                                         → 180 in 90+
  // earbuds     : inward 120 @ d(-75) ─ inward 30 @ d(-13)                     → 30 in 0-30 + 55 in 61-90
  // chocolateBox: inward 500 @ d(-20)                                           → 320 in 0-30
  // dryFruits   : opening 1000 @ d(-60) ─ outward 790                          → 210 in 31-60
  // succulentKit: inward 20 @ d(-5)                                             → 8 in 0-30
  // notebook    : opening 600 @ d(-119) ─ inward 100 @ d(-44) ─ outward 280    → 100 in 31-60 + 320 in 90+
  // mug         : inward 350 @ d(-45) ─ outward 200                            → 150 in 31-60
  // tShirt      : opening 100 @ d(-105) ─ outward 95                           → 5 in 90+
  // slingBag    : inward 200 @ d(-70) ─ outward 80                             → 120 in 61-90
  // waterBottle : inward 200 @ d(-30)  ─ outward 105                           → 95 in 0-30
  // keychain    : opening 600 @ d(-55)  ─ outward 120                          → 480 in 31-60
  // penStand    : inward 200 @ d(-80)   ─ outward 70                           → 130 in 61-90
  // usbHub      : inward 60 @ d(-35)    ─ outward 20                           → 40 in 31-60
  // giftBox     : opening 500 @ d(-15)  ─ outward 140                          → 360 in 0-30
  console.log("Inventory movements...");
  await db.insert(inventoryMovementsTable).values([
    // ── Executive Diary & Pen Set ─────────────────────────
    { companyId: co.id, productId: diarySet.id, locationId: mwh.id, type: "opening",  quantity: 5000, batch: "OPEN-2025", reference: "Opening stock FY2025", createdAt: daysAgo(120) },
    { companyId: co.id, productId: diarySet.id, locationId: mwh.id, type: "outward",  quantity: 5000, reference: "SO-00001",  createdAt: daysAgo(80) },
    { companyId: co.id, productId: diarySet.id, locationId: mwh.id, type: "outward",  quantity: 250,  reference: "SO-00007 partial", createdAt: daysAgo(30) },
    { companyId: co.id, productId: diarySet.id, locationId: mwh.id, type: "inward",   quantity: 50,   batch: "BATCH-D001", reference: "PO-00001 top-up", createdAt: daysAgo(10) },

    // ── Genuine Leather Wallet ────────────────────────────
    { companyId: co.id, productId: leatherWallet.id, locationId: mwh.id, type: "opening",  quantity: 200, batch: "OPEN-LW", reference: "Opening stock", createdAt: daysAgo(95) },

    // ── Wireless Earbuds Pro ──────────────────────────────
    { companyId: co.id, productId: earbuds.id, locationId: mwh.id, type: "inward", quantity: 120, batch: "BATCH-E001", reference: "PO-00002 part 1", createdAt: daysAgo(75) },
    { companyId: co.id, productId: earbuds.id, locationId: mwh.id, type: "outward",quantity: 65,  reference: "SO-00002 partial", createdAt: daysAgo(40) },
    { companyId: co.id, productId: earbuds.id, locationId: mwh.id, type: "inward", quantity: 30,  batch: "BATCH-E002", reference: "PO-00002 balance", createdAt: daysAgo(13) },

    // ── Premium Chocolate Box ─────────────────────────────
    { companyId: co.id, productId: chocolateBox.id, locationId: mwh.id, type: "inward",  quantity: 500, batch: "BATCH-C001", reference: "Fresh batch Gourmet Bazaar", createdAt: daysAgo(20) },
    { companyId: co.id, productId: chocolateBox.id, locationId: mwh.id, type: "outward", quantity: 180, reference: "SO-00003 partial", createdAt: daysAgo(12) },

    // ── Mixed Dry Fruits Tin ──────────────────────────────
    { companyId: co.id, productId: dryFruits.id, locationId: mwh.id, type: "opening",  quantity: 1000, batch: "OPEN-DF", reference: "GRN-00003", createdAt: daysAgo(60) },
    { companyId: co.id, productId: dryFruits.id, locationId: mwh.id, type: "outward",  quantity: 790,  reference: "SO-00005 + SO-00012", createdAt: daysAgo(25) },

    // ── Indoor Succulent Plant Kit ────────────────────────
    { companyId: co.id, productId: succulentKit.id, locationId: mwh.id, type: "inward",  quantity: 20, batch: "BATCH-S001", reference: "Spot buy — Craftsman", createdAt: daysAgo(5) },
    { companyId: co.id, productId: succulentKit.id, locationId: mwh.id, type: "outward", quantity: 12, reference: "Sample giveaway", createdAt: daysAgo(3) },

    // ── Branded Hardbound Notebook ────────────────────────
    { companyId: co.id, productId: notebook.id, locationId: mwh.id, type: "opening", quantity: 600, batch: "OPEN-NB", reference: "Opening stock FY2025", createdAt: daysAgo(119) },
    { companyId: co.id, productId: notebook.id, locationId: mwh.id, type: "inward",  quantity: 100, batch: "BATCH-NB02", reference: "Restock order", createdAt: daysAgo(44) },
    { companyId: co.id, productId: notebook.id, locationId: mwh.id, type: "outward", quantity: 280, reference: "SO-00006+SO-00007+SO-00009", createdAt: daysAgo(20) },

    // ── Ceramic Coffee Mug ────────────────────────────────
    { companyId: co.id, productId: mug.id, locationId: mwh.id, type: "inward",  quantity: 350, batch: "BATCH-MG01", reference: "Craftsman batch 04/2026", createdAt: daysAgo(45) },
    { companyId: co.id, productId: mug.id, locationId: mwh.id, type: "outward", quantity: 200, reference: "SO-00008+SO-00011 partial", createdAt: daysAgo(15) },

    // ── Company-Branded T-Shirt ───────────────────────────
    { companyId: co.id, productId: tShirt.id, locationId: mwh.id, type: "opening",  quantity: 100, batch: "OPEN-TS", reference: "Opening stock", createdAt: daysAgo(105) },
    { companyId: co.id, productId: tShirt.id, locationId: mwh.id, type: "outward",  quantity: 95,  reference: "SO-00006", createdAt: daysAgo(20) },

    // ── Canvas Sling Bag ──────────────────────────────────
    { companyId: co.id, productId: slingBag.id, locationId: mwh.id, type: "inward",  quantity: 200, batch: "BATCH-SB01", reference: "PO-00006", createdAt: daysAgo(70) },
    { companyId: co.id, productId: slingBag.id, locationId: mwh.id, type: "outward", quantity: 80,  reference: "SO-00008", createdAt: daysAgo(30) },

    // ── Custom Water Bottle ───────────────────────────────
    { companyId: co.id, productId: waterBottle.id, locationId: del.id, type: "inward",  quantity: 200, batch: "BATCH-WB01", reference: "Spot purchase", createdAt: daysAgo(30) },
    { companyId: co.id, productId: waterBottle.id, locationId: del.id, type: "outward", quantity: 105, reference: "SO-00010 partial", createdAt: daysAgo(10) },

    // ── Premium Keychain Set ──────────────────────────────
    { companyId: co.id, productId: keychain.id, locationId: mwh.id, type: "opening",  quantity: 600, batch: "OPEN-KC", reference: "Opening stock", createdAt: daysAgo(55) },
    { companyId: co.id, productId: keychain.id, locationId: mwh.id, type: "outward",  quantity: 120, reference: "Sample orders", createdAt: daysAgo(20) },

    // ── Bamboo Pen Stand ──────────────────────────────────
    { companyId: co.id, productId: penStand.id, locationId: mum.id, type: "inward",  quantity: 200, batch: "BATCH-PS01", reference: "New product launch", createdAt: daysAgo(80) },
    { companyId: co.id, productId: penStand.id, locationId: mum.id, type: "outward", quantity: 70,  reference: "Sample + SO-misc", createdAt: daysAgo(40) },

    // ── USB-C Hub 7-in-1 ──────────────────────────────────
    { companyId: co.id, productId: usbHub.id, locationId: mwh.id, type: "inward",  quantity: 60, batch: "BATCH-USB01", reference: "TechPack order", createdAt: daysAgo(35) },
    { companyId: co.id, productId: usbHub.id, locationId: mwh.id, type: "outward", quantity: 20, reference: "SO-00002 addon", createdAt: daysAgo(20) },

    // ── Premium Gift Wrap Box ─────────────────────────────
    { companyId: co.id, productId: giftBox.id, locationId: mwh.id, type: "opening",  quantity: 500, batch: "OPEN-GB", reference: "Packaging stock", createdAt: daysAgo(15) },
    { companyId: co.id, productId: giftBox.id, locationId: mwh.id, type: "outward",  quantity: 140, reference: "Consumed in dispatch", createdAt: daysAgo(8) },

    // ── Inter-location transfers ──────────────────────────
    { companyId: co.id, productId: diarySet.id, locationId: mwh.id, type: "transfer_out", quantity: 100, batch: "XFER-20260601", reference: JSON.stringify({ d: del.id, r: "Delhi sample stock" }), createdAt: daysAgo(12) },
    { companyId: co.id, productId: diarySet.id, locationId: del.id,  type: "transfer_in",  quantity: 100, batch: "XFER-20260601", reference: JSON.stringify({ d: del.id, r: "Delhi sample stock" }), createdAt: daysAgo(12) },
  ]);

  // ── Assembly Jobs ─────────────────────────────────────────────────────────────
  console.log("Assembly...");
  await db.insert(assemblyJobsTable).values([
    { companyId: co.id, jobNumber: "AJ-00001", salesOrderId: so2.id,  status: "In Progress", totalKits: 200,  completedKits: 80   },
    { companyId: co.id, jobNumber: "AJ-00002", salesOrderId: so6.id,  status: "Pending",     totalKits: 200,  completedKits: 0    },
    { companyId: co.id, jobNumber: "AJ-00003", salesOrderId: so1.id,  status: "Completed",   totalKits: 5000, completedKits: 5000 },
    { companyId: co.id, jobNumber: "AJ-00004", salesOrderId: so8.id,  status: "In Progress", totalKits: 500,  completedKits: 200  },
    { companyId: co.id, jobNumber: "AJ-00005", salesOrderId: so12.id, status: "Completed",   totalKits: 350,  completedKits: 350  },
  ]);

  // ── Artwork Approvals ─────────────────────────────────────────────────────────
  console.log("Artwork...");
  await db.insert(artworkApprovalsTable).values([
    { companyId: co.id, clientId: tcs.id,      salesOrderId: so1.id,  assetName: "TCS Diwali Box Logo",          status: "Completed",       notes: "Approved and printed. 5,000 boxes done." },
    { companyId: co.id, clientId: infosys.id,  salesOrderId: so2.id,  assetName: "Infosys Tech Kit Branding",    status: "Client Approved",  notes: "Client approved v3. Sending to vendor." },
    { companyId: co.id, clientId: hdfc.id,     salesOrderId: so3.id,  assetName: "HDFC Diwali Hamper Ribbon",    status: "Pending",          notes: "Awaiting sign-off on gold ribbon design." },
    { companyId: co.id, clientId: zomato.id,   salesOrderId: so6.id,  assetName: "Zomato Welcome Kit Artwork",   status: "Sent to Vendor",   notes: "Sent to PrintWorks India on 28 May." },
    { companyId: co.id, clientId: reliance.id, salesOrderId: so5.id,  assetName: "RIL New Year Box Print",       status: "Completed",        notes: "Full colour print approved. Shipped." },
    { companyId: co.id, clientId: tcs.id,      salesOrderId: so7.id,  assetName: "TCS NY 2026 Diary Emboss",     status: "Completed",        notes: "Gold embossing on 2,000 diary covers." },
    { companyId: co.id, clientId: wipro.id,    salesOrderId: so8.id,  assetName: "Wipro Anniversary Mug Print",  status: "In Revision",      notes: "Client wants bigger logo — v2 sent 10 Jun." },
  ]);

  // ── Shipments ─────────────────────────────────────────────────────────────────
  console.log("Shipments...");
  const [sh1, sh2, sh3] = await db.insert(shipmentsTable).values([
    { companyId: co.id, shipmentNumber: "SH-00001", salesOrderId: so1.id,  courierPartner: "Blue Dart",  status: "Delivered",  trackingNumber: "BD9876543210", dispatchDate: daysAgo(90) },
    { companyId: co.id, shipmentNumber: "SH-00002", salesOrderId: so5.id,  courierPartner: "DTDC",       status: "In Transit", trackingNumber: "DTDC123456789" },
    { companyId: co.id, shipmentNumber: "SH-00003", salesOrderId: so7.id,  courierPartner: "Delhivery",  status: "Delivered",  trackingNumber: "DLV20260204A1", dispatchDate: daysAgo(60) },
    { companyId: co.id, shipmentNumber: "SH-00004", salesOrderId: so11.id, courierPartner: "Blue Dart",  status: "In Transit", trackingNumber: "BD20260610X5" },
  ]).returning();

  await db.insert(shipmentItemsTable).values([
    { shipmentId: sh1.id, deliveryName: "TCS Mumbai HQ",     address: "TCS House, Raveline St, Fort, Mumbai 400001", status: "Delivered"  },
    { shipmentId: sh1.id, deliveryName: "TCS Pune Campus",   address: "Hinjewadi IT Park, Pune 411057",              status: "Delivered"  },
    { shipmentId: sh3.id, deliveryName: "TCS Noida Campus",  address: "TCS IT Park, Sector 132, Noida 201301",       status: "Delivered"  },
  ]);

  // ── Invoices & Payments ───────────────────────────────────────────────────────
  console.log("Invoices & Payments...");
  const [inv1, inv2, inv3, inv4, inv5, inv6] = await db.insert(invoicesTable).values([
    { companyId: co.id, invoiceNumber: "INV-00001", salesOrderId: so1.id,  clientId: tcs.id,      totalAmount: "2750000", gstAmount: "495000",  grandTotal: "3245000", status: "Paid",        dueDate: new Date("2025-11-15") },
    { companyId: co.id, invoiceNumber: "INV-00002", salesOrderId: so5.id,  clientId: reliance.id, totalAmount: "650000",  gstAmount: "117000",  grandTotal: "767000",  status: "Partially Paid", dueDate: new Date("2026-06-20") },
    { companyId: co.id, invoiceNumber: "INV-00003", salesOrderId: so3.id,  clientId: hdfc.id,     totalAmount: "900000",  gstAmount: "162000",  grandTotal: "1062000", status: "Sent",        dueDate: new Date("2026-07-15") },
    { companyId: co.id, invoiceNumber: "INV-00004", salesOrderId: so7.id,  clientId: tcs.id,      totalAmount: "1120000", gstAmount: "201600",  grandTotal: "1321600", status: "Paid",        dueDate: new Date("2026-03-15") },
    { companyId: co.id, invoiceNumber: "INV-00005", salesOrderId: so6.id,  clientId: zomato.id,   totalAmount: "99600",   gstAmount: "17928",   grandTotal: "117528",  status: "Draft",       dueDate: new Date("2026-07-01") },
    { companyId: co.id, invoiceNumber: "INV-00006", salesOrderId: so12.id, clientId: infosys.id,  totalAmount: "184500",  gstAmount: "33210",   grandTotal: "217710",  status: "Paid",        dueDate: new Date("2026-05-30") },
  ]).returning();

  await db.insert(paymentsTable).values([
    { companyId: co.id, invoiceId: inv1.id, amount: "3245000", type: "full",    paymentDate: new Date("2025-11-10"), notes: "NEFT. UTR: NEFT2025110901" },
    { companyId: co.id, invoiceId: inv2.id, amount: "400000",  type: "advance", paymentDate: new Date("2026-04-10"), notes: "Advance 50% — cheque #4528" },
    { companyId: co.id, invoiceId: inv4.id, amount: "1321600", type: "full",    paymentDate: new Date("2026-03-10"), notes: "RTGS. UTR: RTGS2026031001" },
    { companyId: co.id, invoiceId: inv6.id, amount: "217710",  type: "full",    paymentDate: new Date("2026-05-28"), notes: "NEFT. UTR: NEFT2026052801" },
  ]);

  // ── Fixed Assets ──────────────────────────────────────────────────────────────
  console.log("Fixed Assets...");
  await db.insert(fixedAssetsTable).values([
    { companyId: co.id, assetCode: "FA-001", name: "Heat Press Machine — 40×50cm",     category: "Machinery",        purchaseDate: "2023-04-01", purchaseCost: "185000", usefulLifeYears: 8, residualValue: "20000", currentBookValue: "136875", locationId: mwh.id, status: "Active",      description: "Schulze & Bohm heat press for mug and t-shirt printing" },
    { companyId: co.id, assetCode: "FA-002", name: "Commercial Embroidery Machine 12H", category: "Machinery",        purchaseDate: "2022-09-15", purchaseCost: "320000", usefulLifeYears: 10, residualValue: "30000", currentBookValue: "218000", locationId: mwh.id, status: "Active",     description: "12-head tajima embroidery machine" },
    { companyId: co.id, assetCode: "FA-003", name: "Tata Ace Delivery Van",             category: "Vehicles",         purchaseDate: "2024-01-10", purchaseCost: "580000", usefulLifeYears: 6, residualValue: "80000", currentBookValue: "497778", locationId: null,   status: "Active",      description: "Last mile delivery vehicle — DL 01 GA 9021" },
    { companyId: co.id, assetCode: "FA-004", name: "HP DesignJet T650 Plotter",         category: "IT Equipment",     purchaseDate: "2023-11-20", purchaseCost: "95000",  usefulLifeYears: 5, residualValue: "5000",  currentBookValue: "73000",  locationId: mwh.id, status: "Active",      description: "Large-format colour plotter for artwork proofing" },
    { companyId: co.id, assetCode: "FA-005", name: "Pallet Racking System (20 bays)",   category: "Furniture & Fixtures", purchaseDate: "2022-06-01", purchaseCost: "240000", usefulLifeYears: 15, residualValue: "20000", currentBookValue: "189333", locationId: mwh.id, status: "Active", description: "Heavy-duty steel racking installed at MWH-GGN" },
    { companyId: co.id, assetCode: "FA-006", name: "Dell OptiPlex 7090 (×5 units)",     category: "IT Equipment",     purchaseDate: "2024-07-01", purchaseCost: "225000", usefulLifeYears: 4, residualValue: "15000", currentBookValue: "183750", locationId: del.id, status: "Active",      description: "Office computers — Delhi Sales Office" },
  ]);

  console.log("\n✅ Seed complete!");
  console.log("   Company  : Customize Duniya");
  console.log("   Users    : 5  (admin@gifterp.com / admin123)");
  console.log("   Clients  : 8  Vendors: 5  Products: 15");
  console.log("   Locations: 3  Categories: 8  Bundles: 4");
  console.log("   SO: 12  PO: 8  GRN: 3  Invoices: 6  Payments: 4");
  console.log("   Leads: 6  Opportunities: 4  Quotes: 8");
  console.log("   Inventory movements: 36 (spread across 4 age buckets)");
  console.log("   Fixed Assets: 6");
}

seed().catch(console.error).finally(() => process.exit());
