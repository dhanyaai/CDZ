import { Switch, Route, Router as WouterRouter, Redirect, useRoute, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { initAuth, getStoredUser } from "@/lib/auth";
import { initTheme } from "@/lib/theme";
import { getToken } from "@/lib/api";
import { can } from "@/lib/permissions";
import { ShieldOff } from "lucide-react";

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

function ProtectedRoute({
  permission,
  component: Component,
}: {
  permission: string;
  component: React.ComponentType;
}) {
  const user = getStoredUser();
  if (!can(user?.role, permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
        <ShieldOff className="w-14 h-14 opacity-30" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm text-center max-w-xs">
          You don't have permission to view this page. Contact your Admin if you need access.
        </p>
      </div>
    );
  }
  return <Component />;
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
        <Route path="/dashboard" component={() => <ProtectedRoute permission="page.dashboard" component={Dashboard} />} />
        <Route path="/clients" component={() => <ProtectedRoute permission="page.crm" component={Clients} />} />
        <Route path="/clients/:id" component={() => <ProtectedRoute permission="page.crm" component={ClientDetailWrapper} />} />
        <Route path="/contacts" component={() => <ProtectedRoute permission="page.crm" component={Contacts} />} />
        <Route path="/leads" component={() => <ProtectedRoute permission="page.crm" component={Leads} />} />
        <Route path="/opportunities" component={() => <ProtectedRoute permission="page.crm" component={Opportunities} />} />
        <Route path="/quotes" component={() => <ProtectedRoute permission="page.crm" component={Quotes} />} />
        <Route path="/proforma-invoices" component={() => <ProtectedRoute permission="page.crm" component={ProformaInvoices} />} />
        <Route path="/products" component={() => <ProtectedRoute permission="page.catalog" component={Products} />} />
        <Route path="/bundles" component={() => <ProtectedRoute permission="page.catalog" component={Bundles} />} />
        <Route path="/bundle-costing" component={() => <ProtectedRoute permission="page.catalog" component={BundleCosting} />} />
        <Route path="/categories" component={() => <ProtectedRoute permission="page.catalog" component={Categories} />} />
        <Route path="/services" component={() => <ProtectedRoute permission="page.catalog" component={Services} />} />
        <Route path="/vendors" component={() => <ProtectedRoute permission="page.purchase_orders" component={Vendors} />} />
        <Route path="/sample-orders" component={() => <ProtectedRoute permission="page.sales_orders" component={SampleOrders} />} />
        <Route path="/sales-orders" component={() => <ProtectedRoute permission="page.sales_orders" component={SalesOrders} />} />
        <Route path="/sales-orders/:id" component={() => <ProtectedRoute permission="page.sales_orders" component={SalesOrderDetailWrapper} />} />
        <Route path="/order-processing" component={() => <ProtectedRoute permission="page.sales_orders" component={OrderProcessingList} />} />
        <Route path="/order-processing/:salesOrderId" component={() => <ProtectedRoute permission="page.sales_orders" component={OrderProcessingWrapper} />} />
        <Route path="/purchase-orders" component={() => <ProtectedRoute permission="page.purchase_orders" component={PurchaseOrders} />} />
        <Route path="/purchase-orders/:id" component={() => <ProtectedRoute permission="page.purchase_orders" component={PurchaseOrderDetailWrapper} />} />
        <Route path="/inventory" component={() => <ProtectedRoute permission="page.operations" component={Inventory} />} />
        <Route path="/item-ledger" component={() => <ProtectedRoute permission="page.operations" component={ItemLedger} />} />
        <Route path="/transfers" component={() => <ProtectedRoute permission="page.operations" component={Transfers} />} />
        <Route path="/locations" component={() => <ProtectedRoute permission="page.operations" component={Locations} />} />
        <Route path="/grn" component={() => <ProtectedRoute permission="page.operations" component={Grn} />} />
        <Route path="/assembly" component={() => <ProtectedRoute permission="page.operations" component={Assembly} />} />
        <Route path="/artwork" component={() => <ProtectedRoute permission="page.operations" component={Artwork} />} />
        <Route path="/shipments" component={() => <ProtectedRoute permission="page.logistics" component={Shipments} />} />
        <Route path="/invoices" component={() => <ProtectedRoute permission="page.finance" component={Invoices} />} />
        <Route path="/payments" component={() => <ProtectedRoute permission="page.finance" component={Payments} />} />
        <Route path="/credit-notes" component={() => <ProtectedRoute permission="page.finance" component={CreditNotes} />} />
        <Route path="/fixed-assets" component={() => <ProtectedRoute permission="page.finance" component={FixedAssets} />} />
        <Route path="/production" component={() => <ProtectedRoute permission="page.operations" component={ProductionOrders} />} />
        <Route path="/reports" component={() => <ProtectedRoute permission="page.reports" component={Reports} />} />
        <Route path="/users" component={() => <ProtectedRoute permission="page.admin" component={Users} />} />
        <Route path="/follow-ups" component={() => <ProtectedRoute permission="page.crm" component={FollowUps} />} />
        <Route path="/companies" component={() => <ProtectedRoute permission="page.admin" component={Companies} />} />
        <Route path="/settings" component={() => <ProtectedRoute permission="page.admin" component={Settings} />} />
        <Route path="/pdf-extractor" component={() => <ProtectedRoute permission="page.tools" component={PdfExtractor} />} />
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
