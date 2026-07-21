import { Switch, Route, Router as WouterRouter, Redirect, useRoute, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { initAuth } from "@/lib/auth";
import { initTheme } from "@/lib/theme";
import { getToken } from "@/lib/api";

import { Dashboard } from "@/pages/dashboard";
import { Clients } from "@/pages/clients";
import { ClientDetail } from "@/pages/client-detail";
import { Products } from "@/pages/products";
import { Bundles } from "@/pages/bundles";
import { BundleCosting } from "@/pages/bundle-costing";
import { Vendors } from "@/pages/vendors";
import { SalesOrders } from "@/pages/sales-orders";
import { SalesOrderDetail } from "@/pages/sales-order-detail";
import { PurchaseOrders } from "@/pages/purchase-orders";
import { PurchaseOrderDetail } from "@/pages/purchase-order-detail";
import { Inventory } from "@/pages/inventory";
import { Assembly } from "@/pages/assembly";
import { Artwork } from "@/pages/artwork";
import { Shipments } from "@/pages/shipments";
import { Invoices } from "@/pages/invoices";
import { Payments } from "@/pages/payments";
import { Users } from "@/pages/users";
import { Leads } from "@/pages/leads";
import { Opportunities } from "@/pages/opportunities";
import { Quotes } from "@/pages/quotes";
import { Categories } from "@/pages/categories";
import { Grn } from "@/pages/grn";
import { CreditNotes } from "@/pages/credit-notes";
import { Locations } from "@/pages/locations";
import { Login } from "@/pages/login";
import { Settings } from "@/pages/settings";
import { Contacts } from "@/pages/contacts";
import { Companies } from "@/pages/companies";
import { FollowUps } from "@/pages/followups";
import { Transfers } from "@/pages/transfers";
import { SampleOrders } from "@/pages/sample-orders";
import { ItemLedger } from "@/pages/item-ledger";
import { FixedAssets } from "@/pages/fixed-assets";
import { ProductionOrders } from "@/pages/production-orders";
import { Reports } from "@/pages/reports";
import { PdfExtractor } from "@/pages/pdf-extractor";
import { OrderProcessingList } from "@/pages/order-processing-list";
import { OrderProcessing } from "@/pages/order-processing";
import { Services } from "@/pages/services";
import { CatalogueViewer } from "@/pages/catalogue-viewer";
import { ProformaInvoices } from "@/pages/proforma-invoices";

initAuth();
initTheme();

const queryClient = new QueryClient();

function ClientDetailWrapper() {
  const [, params] = useRoute("/clients/:id");
  return <ClientDetail id={Number(params?.id)} />;
}
function SalesOrderDetailWrapper() {
  const [, params] = useRoute("/sales-orders/:id");
  return <SalesOrderDetail id={Number(params?.id)} />;
}
function PurchaseOrderDetailWrapper() {
  const [, params] = useRoute("/purchase-orders/:id");
  return <PurchaseOrderDetail id={Number(params?.id)} />;
}
function OrderProcessingWrapper() {
  const [, params] = useRoute("/order-processing/:salesOrderId");
  return <OrderProcessing salesOrderId={Number(params?.salesOrderId)} />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const isPublic = location === "/login" || location.startsWith("/catalogue/");
  useEffect(() => {
    if (!getToken() && !isPublic) navigate("/login");
  }, [location, navigate, isPublic]);
  if (isPublic) return <>{children}</>;
  if (!getToken()) return null;
  return <AppLayout>{children}</AppLayout>;
}

function CatalogueViewerWrapper() {
  const [, params] = useRoute("/catalogue/:token");
  return <CatalogueViewer token={params?.token ?? ""} />;
}

function Router() {
  return (
    <AuthGate>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/catalogue/:token" component={CatalogueViewerWrapper} />
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/clients/:id" component={ClientDetailWrapper} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/leads" component={Leads} />
        <Route path="/opportunities" component={Opportunities} />
        <Route path="/quotes" component={Quotes} />
        <Route path="/proforma-invoices" component={ProformaInvoices} />
        <Route path="/products" component={Products} />
        <Route path="/bundles" component={Bundles} />
        <Route path="/bundle-costing" component={BundleCosting} />
        <Route path="/categories" component={Categories} />
        <Route path="/services" component={Services} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/sample-orders" component={SampleOrders} />
        <Route path="/sales-orders" component={SalesOrders} />
        <Route path="/sales-orders/:id" component={SalesOrderDetailWrapper} />
        <Route path="/order-processing" component={OrderProcessingList} />
        <Route path="/order-processing/:salesOrderId" component={OrderProcessingWrapper} />
        <Route path="/purchase-orders" component={PurchaseOrders} />
        <Route path="/purchase-orders/:id" component={PurchaseOrderDetailWrapper} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/item-ledger" component={ItemLedger} />
        <Route path="/transfers" component={Transfers} />
        <Route path="/locations" component={Locations} />
        <Route path="/grn" component={Grn} />
        <Route path="/assembly" component={Assembly} />
        <Route path="/artwork" component={Artwork} />
        <Route path="/shipments" component={Shipments} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/payments" component={Payments} />
        <Route path="/credit-notes" component={CreditNotes} />
        <Route path="/fixed-assets" component={FixedAssets} />
        <Route path="/production" component={ProductionOrders} />
        <Route path="/reports" component={Reports} />
        <Route path="/users" component={Users} />
        <Route path="/follow-ups" component={FollowUps} />
        <Route path="/companies" component={Companies} />
        <Route path="/settings" component={Settings} />
        <Route path="/pdf-extractor" component={PdfExtractor} />
        <Route component={NotFound} />
      </Switch>
    </AuthGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
