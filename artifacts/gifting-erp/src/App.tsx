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

function AuthGate({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  useEffect(() => {
    if (!getToken() && location !== "/login") navigate("/login");
  }, [location, navigate]);
  if (location === "/login") return <>{children}</>;
  if (!getToken()) return null;
  return <AppLayout>{children}</AppLayout>;
}

function Router() {
  return (
    <AuthGate>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/clients/:id" component={ClientDetailWrapper} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/leads" component={Leads} />
        <Route path="/opportunities" component={Opportunities} />
        <Route path="/quotes" component={Quotes} />
        <Route path="/products" component={Products} />
        <Route path="/bundles" component={Bundles} />
        <Route path="/categories" component={Categories} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/sales-orders" component={SalesOrders} />
        <Route path="/sales-orders/:id" component={SalesOrderDetailWrapper} />
        <Route path="/purchase-orders" component={PurchaseOrders} />
        <Route path="/purchase-orders/:id" component={PurchaseOrderDetailWrapper} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/locations" component={Locations} />
        <Route path="/grn" component={Grn} />
        <Route path="/assembly" component={Assembly} />
        <Route path="/artwork" component={Artwork} />
        <Route path="/shipments" component={Shipments} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/payments" component={Payments} />
        <Route path="/credit-notes" component={CreditNotes} />
        <Route path="/users" component={Users} />
        <Route path="/companies" component={Companies} />
        <Route path="/settings" component={Settings} />
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
