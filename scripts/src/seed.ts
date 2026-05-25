import { db, usersTable, clientsTable, clientInteractionsTable, vendorsTable, productsTable, bundlesTable, bundleItemsTable, salesOrdersTable, salesOrderItemsTable, deliveryAddressesTable, purchaseOrdersTable, purchaseOrderItemsTable, inventoryMovementsTable, assemblyJobsTable, artworkApprovalsTable, shipmentsTable, shipmentItemsTable, invoicesTable, paymentsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function truncate() {
  // Truncate in reverse dependency order
  await db.execute(sql`TRUNCATE TABLE payments, invoices, shipment_items, shipments, artwork_approvals, assembly_items, assembly_jobs, inventory_movements, purchase_order_items, purchase_orders, delivery_addresses, sales_order_items, sales_orders, bundle_items, bundles, products, vendors, client_interactions, clients, users RESTART IDENTITY CASCADE`);
}

async function seed() {
  console.log("Truncating existing data...");
  await truncate();

  // Users
  console.log("Seeding users...");
  const [admin, sales1, sales2, warehouse, finance] = await db.insert(usersTable).values([
    { name: "Rajesh Mehta", email: "admin@gifterp.com", passwordHash: "admin123", role: "Admin" },
    { name: "Priya Sharma", email: "priya@gifterp.com", passwordHash: "sales123", role: "Sales" },
    { name: "Arjun Nair", email: "arjun@gifterp.com", passwordHash: "sales123", role: "Sales" },
    { name: "Vikram Singh", email: "vikram@gifterp.com", passwordHash: "wh123", role: "Warehouse" },
    { name: "Anita Patel", email: "anita@gifterp.com", passwordHash: "fin123", role: "Finance" },
  ]).returning();

  // Clients
  console.log("Seeding clients...");
  const [tcs, infosys, wipro, hdfc, reliance, zomato] = await db.insert(clientsTable).values([
    { companyName: "TCS Ltd", contactPerson: "Rahul Verma", email: "rahul@tcs.com", phone: "+91-9876543210", gstNumber: "27AAACT1234F1Z5", industry: "Technology", tags: "enterprise,repeat", billingAddress: "TCS House, Mumbai 400001", shippingAddress: "TCS House, Mumbai 400001" },
    { companyName: "Infosys Limited", contactPerson: "Suresh Kumar", email: "suresh@infosys.com", phone: "+91-9876500001", gstNumber: "29AABCI1234J1ZP", industry: "Technology", tags: "enterprise", billingAddress: "Electronics City, Bangalore 560100", shippingAddress: "Electronics City, Bangalore 560100" },
    { companyName: "Wipro Technologies", contactPerson: "Meena Iyer", email: "meena@wipro.com", phone: "+91-9876500002", gstNumber: "29AABCW2345K2ZQ", industry: "Technology", tags: "large-account", billingAddress: "Doddakannelli, Bangalore 560035", shippingAddress: "Doddakannelli, Bangalore 560035" },
    { companyName: "HDFC Bank", contactPerson: "Sunita Kapoor", email: "sunita@hdfcbank.com", phone: "+91-9876500003", gstNumber: "27AAACH5234G1Z2", industry: "Banking", tags: "fintech,premium", billingAddress: "HDFC Tower, Mumbai 400013", shippingAddress: "HDFC Tower, Mumbai 400013" },
    { companyName: "Reliance Industries", contactPerson: "Amit Shah", email: "amit.shah@ril.com", phone: "+91-9876500004", gstNumber: "27AAACR4849R1ZQ", industry: "Conglomerate", tags: "enterprise,priority", billingAddress: "Maker Chambers, Mumbai 400021", shippingAddress: "Jamnagar 361142" },
    { companyName: "Zomato Limited", contactPerson: "Deepika Roy", email: "deepika@zomato.com", phone: "+91-9876500005", gstNumber: "07AABCZ5678L1ZH", industry: "Food & Technology", tags: "startup,festive", billingAddress: "Ground Floor, Gurgaon 122001", shippingAddress: "Ground Floor, Gurgaon 122001" },
  ]).returning();

  // Client interactions
  await db.insert(clientInteractionsTable).values([
    { clientId: tcs.id, type: "call", notes: "Discussed Diwali gifting requirements. Expected order of 5000 units." },
    { clientId: tcs.id, type: "email", notes: "Sent proposal for premium gift hampers with branding options." },
    { clientId: infosys.id, type: "meeting", notes: "Presented Q4 gifting catalog. Client interested in tech accessories bundles." },
    { clientId: hdfc.id, type: "call", notes: "Confirmed Diwali order details. 2000 boxes to 15 branches." },
    { clientId: reliance.id, type: "email", notes: "Sent new year gifting ideas. Budget: ₹2000 per person." },
    { clientId: zomato.id, type: "meeting", notes: "Onboarding meeting. Looking for employee appreciation kits." },
  ]);

  // Vendors
  console.log("Seeding vendors...");
  const [craftVendor, luxeVendor, techVendor, printVendor, foodVendor] = await db.insert(vendorsTable).values([
    { name: "Craftsman Artisans Pvt Ltd", contactPerson: "Gopal Rao", email: "gopal@craftsman.in", phone: "+91-9900001111", leadTimeDays: 10 },
    { name: "LuxeGifts Wholesale", contactPerson: "Farah Khan", email: "farah@luxegifts.in", phone: "+91-9900002222", leadTimeDays: 7 },
    { name: "TechPack Solutions", contactPerson: "Kiran Babu", email: "kiran@techpack.in", phone: "+91-9900003333", leadTimeDays: 5 },
    { name: "PrintWorks India", contactPerson: "Ramesh Gupta", email: "ramesh@printworks.in", phone: "+91-9900004444", leadTimeDays: 3 },
    { name: "Gourmet Bazaar", contactPerson: "Lakshmi Nair", email: "lakshmi@gourmetbazaar.in", phone: "+91-9900005555", leadTimeDays: 4 },
  ]).returning();

  // Products
  console.log("Seeding products...");
  const [diarySet, leatherWallet, airpods, chocolateBox, dryFruits, plantKit, notebook, mug, tShirt, sling] = await db.insert(productsTable).values([
    { name: "Executive Diary & Pen Set", category: "Stationery", costPrice: "320", sellingPrice: "550", stockLevel: 250, lowStockThreshold: 30, vendorId: craftVendor.id },
    { name: "Genuine Leather Wallet", category: "Accessories", costPrice: "480", sellingPrice: "850", stockLevel: 180, lowStockThreshold: 20, vendorId: luxeVendor.id },
    { name: "Wireless Earbuds", category: "Electronics", costPrice: "1200", sellingPrice: "1999", stockLevel: 85, lowStockThreshold: 15, vendorId: techVendor.id },
    { name: "Premium Chocolate Box (18pc)", category: "Food & Beverage", costPrice: "250", sellingPrice: "450", stockLevel: 320, lowStockThreshold: 50, vendorId: foodVendor.id },
    { name: "Mixed Dry Fruits Tin (500g)", category: "Food & Beverage", costPrice: "380", sellingPrice: "650", stockLevel: 210, lowStockThreshold: 40, vendorId: foodVendor.id },
    { name: "Indoor Succulent Plant Kit", category: "Lifestyle", costPrice: "280", sellingPrice: "499", stockLevel: 8, lowStockThreshold: 20, vendorId: craftVendor.id },
    { name: "Branded Hardbound Notebook", category: "Stationery", costPrice: "180", sellingPrice: "320", stockLevel: 420, lowStockThreshold: 60, vendorId: printVendor.id },
    { name: "Ceramic Coffee Mug (Set of 2)", category: "Lifestyle", costPrice: "200", sellingPrice: "380", stockLevel: 150, lowStockThreshold: 25, vendorId: craftVendor.id },
    { name: "Company-Branded T-Shirt", category: "Apparel", costPrice: "300", sellingPrice: "499", stockLevel: 5, lowStockThreshold: 30, vendorId: luxeVendor.id },
    { name: "Canvas Sling Bag", category: "Accessories", costPrice: "350", sellingPrice: "599", stockLevel: 120, lowStockThreshold: 20, vendorId: luxeVendor.id },
  ]).returning();

  // Bundles
  console.log("Seeding bundles...");
  const [diwaliBundleRow, techBundleRow, welcomeKitRow] = await db.insert(bundlesTable).values([
    { name: "Diwali Hamper Deluxe", description: "Premium Diwali gifting hamper with sweets and accessories", occasion: "Diwali" },
    { name: "Tech Professional Kit", description: "Essential tech accessories for the modern professional", occasion: "Work Anniversary" },
    { name: "New Joiner Welcome Kit", description: "Thoughtful onboarding kit for new employees", occasion: "Onboarding" },
  ]).returning();

  await db.insert(bundleItemsTable).values([
    { bundleId: diwaliBundleRow.id, productId: chocolateBox.id, quantity: 1 },
    { bundleId: diwaliBundleRow.id, productId: dryFruits.id, quantity: 1 },
    { bundleId: diwaliBundleRow.id, productId: diarySet.id, quantity: 1 },
    { bundleId: techBundleRow.id, productId: airpods.id, quantity: 1 },
    { bundleId: techBundleRow.id, productId: notebook.id, quantity: 1 },
    { bundleId: techBundleRow.id, productId: mug.id, quantity: 1 },
    { bundleId: welcomeKitRow.id, productId: notebook.id, quantity: 1 },
    { bundleId: welcomeKitRow.id, productId: tShirt.id, quantity: 1 },
    { bundleId: welcomeKitRow.id, productId: mug.id, quantity: 1 },
    { bundleId: welcomeKitRow.id, productId: sling.id, quantity: 1 },
  ]);

  // Sales Orders
  console.log("Seeding sales orders...");
  const soValues = [
    { orderNumber: "SO-00001", clientId: tcs.id, status: "Delivered", totalAmount: "2750000", occasion: "Diwali", notes: "5000 units delivered to 10 TCS offices PAN India" },
    { orderNumber: "SO-00002", clientId: infosys.id, status: "In Production", totalAmount: "399800", occasion: "Work Anniversary", notes: "200 tech professional kits" },
    { orderNumber: "SO-00003", clientId: hdfc.id, status: "Confirmed", totalAmount: "900000", occasion: "Diwali", notes: "2000 Diwali hampers to 15 branches" },
    { orderNumber: "SO-00004", clientId: wipro.id, status: "Draft", totalAmount: "149700", occasion: "New Year", notes: "300 units, pending final approval" },
    { orderNumber: "SO-00005", clientId: reliance.id, status: "Dispatched", totalAmount: "599000", occasion: "New Year", notes: "1000 new year gift packs" },
    { orderNumber: "SO-00006", clientId: zomato.id, status: "Ready", totalAmount: "99600", occasion: "Onboarding", notes: "200 welcome kits for new Zomato hires" },
  ];

  const salesOrders = await db.insert(salesOrdersTable).values(soValues).returning();
  const [so1, so2, so3, so4, so5, so6] = salesOrders;

  await db.insert(salesOrderItemsTable).values([
    { salesOrderId: so1.id, productId: chocolateBox.id, quantity: 5000, unitPrice: "450" },
    { salesOrderId: so1.id, productId: diarySet.id, quantity: 5000, unitPrice: "550" },
    { salesOrderId: so2.id, productId: airpods.id, quantity: 200, unitPrice: "1999" },
    { salesOrderId: so3.id, productId: chocolateBox.id, quantity: 2000, unitPrice: "450" },
    { salesOrderId: so4.id, productId: notebook.id, quantity: 300, unitPrice: "320" },
    { salesOrderId: so4.id, productId: mug.id, quantity: 300, unitPrice: "380" },
    { salesOrderId: so5.id, productId: dryFruits.id, quantity: 1000, unitPrice: "599" },
    { salesOrderId: so6.id, productId: notebook.id, quantity: 200, unitPrice: "320" },
    { salesOrderId: so6.id, productId: tShirt.id, quantity: 200, unitPrice: "499" },
  ]);

  await db.insert(deliveryAddressesTable).values([
    { salesOrderId: so1.id, name: "TCS Mumbai HQ", address: "TCS House, Raveline St, Fort, Mumbai", city: "Mumbai", pincode: "400001" },
    { salesOrderId: so1.id, name: "TCS Pune Campus", address: "Hinjewadi IT Park, Pune", city: "Pune", pincode: "411057" },
    { salesOrderId: so3.id, name: "HDFC Central Office", address: "HDFC Tower, Lower Parel, Mumbai", city: "Mumbai", pincode: "400013" },
    { salesOrderId: so3.id, name: "HDFC Bangalore Zone", address: "Cunningham Road, Bangalore", city: "Bangalore", pincode: "560052" },
    { salesOrderId: so6.id, name: "Zomato HQ", address: "Ground Floor, Tower D, Gurgaon", city: "Gurgaon", pincode: "122001" },
  ]);

  // Purchase Orders
  console.log("Seeding purchase orders...");
  const pos = await db.insert(purchaseOrdersTable).values([
    { poNumber: "PO-00001", vendorId: foodVendor.id, salesOrderId: so1.id, status: "Fully Received", totalAmount: "3400000", expectedDelivery: new Date("2025-09-15") },
    { poNumber: "PO-00002", vendorId: techVendor.id, salesOrderId: so2.id, status: "Partially Received", totalAmount: "240000", expectedDelivery: new Date("2026-05-30") },
    { poNumber: "PO-00003", vendorId: foodVendor.id, salesOrderId: so3.id, status: "Ordered", totalAmount: "950000", expectedDelivery: new Date("2026-06-05") },
    { poNumber: "PO-00004", vendorId: printVendor.id, salesOrderId: so4.id, status: "Ordered", totalAmount: "63000", expectedDelivery: new Date("2026-06-10") },
  ]).returning();

  await db.insert(purchaseOrderItemsTable).values([
    { purchaseOrderId: pos[0].id, productId: chocolateBox.id, quantity: 5000, unitPrice: "250", receivedQty: 5000 },
    { purchaseOrderId: pos[1].id, productId: airpods.id, quantity: 200, unitPrice: "1200", receivedQty: 120 },
    { purchaseOrderId: pos[2].id, productId: chocolateBox.id, quantity: 2000, unitPrice: "250", receivedQty: 0 },
    { purchaseOrderId: pos[3].id, productId: notebook.id, quantity: 300, unitPrice: "180", receivedQty: 0 },
  ]);

  // Inventory movements
  console.log("Seeding inventory movements...");
  await db.insert(inventoryMovementsTable).values([
    { productId: chocolateBox.id, type: "inward", quantity: 500, batch: "BATCH-001", reference: "PO-00001" },
    { productId: diarySet.id, type: "inward", quantity: 300, batch: "BATCH-002", reference: "PO-00001" },
    { productId: airpods.id, type: "inward", quantity: 120, batch: "BATCH-003", reference: "PO-00002" },
    { productId: chocolateBox.id, type: "outward", quantity: 5000, reference: "SO-00001" },
    { productId: diarySet.id, type: "outward", quantity: 5000, reference: "SO-00001" },
    { productId: dryFruits.id, type: "inward", quantity: 500, batch: "BATCH-004", reference: "PO-00001" },
  ]);

  // Assembly Jobs
  console.log("Seeding assembly jobs...");
  await db.insert(assemblyJobsTable).values([
    { jobNumber: "AJ-00001", salesOrderId: so2.id, status: "In Progress", totalKits: 200, completedKits: 80 },
    { jobNumber: "AJ-00002", salesOrderId: so6.id, status: "Pending", totalKits: 200, completedKits: 0 },
    { jobNumber: "AJ-00003", salesOrderId: so1.id, status: "Completed", totalKits: 5000, completedKits: 5000 },
  ]);

  // Artwork approvals
  console.log("Seeding artwork approvals...");
  await db.insert(artworkApprovalsTable).values([
    { clientId: tcs.id, salesOrderId: so1.id, assetName: "TCS Diwali Box Logo", status: "Completed", notes: "Approved and printed. 5000 boxes done." },
    { clientId: infosys.id, salesOrderId: so2.id, assetName: "Infosys Tech Kit Branding", status: "Client Approved", notes: "Client approved v3. Sending to vendor." },
    { clientId: hdfc.id, salesOrderId: so3.id, assetName: "HDFC Diwali Hamper Ribbon", status: "Pending", notes: "Awaiting client sign-off on gold ribbon design." },
    { clientId: zomato.id, salesOrderId: so6.id, assetName: "Zomato Welcome Kit Artwork", status: "Sent to Vendor", notes: "Sent to PrintWorks on May 20." },
  ]);

  // Shipments
  console.log("Seeding shipments...");
  const [sh1] = await db.insert(shipmentsTable).values([
    { shipmentNumber: "SH-00001", salesOrderId: so1.id, courierPartner: "Blue Dart", status: "Delivered", trackingNumber: "BD987654321", dispatchDate: new Date("2025-10-15") },
    { shipmentNumber: "SH-00002", salesOrderId: so5.id, courierPartner: "DTDC", status: "In Transit", trackingNumber: "DTDC123456789" },
  ]).returning();

  await db.insert(shipmentItemsTable).values([
    { shipmentId: sh1.id, deliveryName: "TCS Mumbai HQ", address: "TCS House, Raveline St, Fort, Mumbai 400001", status: "Delivered" },
    { shipmentId: sh1.id, deliveryName: "TCS Pune Campus", address: "Hinjewadi IT Park, Pune 411057", status: "Delivered" },
  ]);

  // Invoices and payments
  console.log("Seeding invoices & payments...");
  const [inv1, inv2, inv3] = await db.insert(invoicesTable).values([
    { invoiceNumber: "INV-00001", salesOrderId: so1.id, clientId: tcs.id, totalAmount: "2750000", gstAmount: "495000", grandTotal: "3245000", status: "Paid", dueDate: new Date("2025-11-15") },
    { invoiceNumber: "INV-00002", salesOrderId: so5.id, clientId: reliance.id, totalAmount: "599000", gstAmount: "107820", grandTotal: "706820", status: "Sent", dueDate: new Date("2026-06-20") },
    { invoiceNumber: "INV-00003", salesOrderId: so3.id, clientId: hdfc.id, totalAmount: "900000", gstAmount: "162000", grandTotal: "1062000", status: "Draft", dueDate: new Date("2026-06-30") },
  ]).returning();

  await db.insert(paymentsTable).values([
    { invoiceId: inv1.id, amount: "3245000", type: "full", paymentDate: new Date("2025-11-10"), notes: "Paid via NEFT. UTR: NEFT2025110901" },
    { invoiceId: inv2.id, amount: "300000", type: "advance", paymentDate: new Date("2026-05-01"), notes: "Advance payment 50%" },
  ]);

  console.log("Seed completed successfully!");
}

seed().catch(console.error).finally(() => process.exit());
