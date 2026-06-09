import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Gift, Mail, Lock, ArrowRight, ShieldCheck, Boxes, BarChart3 } from "lucide-react";
import { setToken } from "@/lib/api";
import { setStoredUser, type AuthUser } from "@/lib/auth";

export function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@gifterp.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = (await res.json()) as { token: string; user: AuthUser };
      setToken(data.token);
      setStoredUser(data.user);
      toast({ title: "Welcome back" });
      navigate("/dashboard");
    } catch (e) {
      toast({ title: "Login failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const highlights = [
    { icon: Boxes, title: "End-to-end operations", desc: "From leads to delivery in one place" },
    { icon: BarChart3, title: "Live analytics", desc: "Revenue, pipeline and inventory at a glance" },
    { icon: ShieldCheck, title: "Role-based access", desc: "Secure, session-based authentication" },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white bg-gradient-to-br from-[hsl(232_35%_12%)] via-[hsl(243_45%_16%)] to-[hsl(262_55%_15%)]">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 600px 400px at 15% 10%, hsl(243 85% 55% / 0.28), transparent 60%), radial-gradient(ellipse 500px 400px at 90% 90%, hsl(38 90% 55% / 0.22), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Gift className="w-6 h-6 text-white" />
          </span>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">
            Customize Duniya
          </span>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              The command center for
              <br />
              your corporate gifting business
            </h2>
            <p className="mt-4 text-white/70 max-w-md">
              Manage clients, catalog, orders, production and finance — all in one beautifully
              organized workspace.
            </p>
          </div>
          <div className="space-y-4">
            {highlights.map((h) => (
              <div key={h.title} className="flex items-start gap-3">
                <span className="mt-0.5 w-9 h-9 shrink-0 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/15">
                  <h.icon className="w-4 h-4 text-indigo-300" />
                </span>
                <div>
                  <div className="font-semibold">{h.title}</div>
                  <div className="text-sm text-white/60">{h.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Customize Duniya · Enterprise Resource Planning
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Gift className="w-5 h-5 text-white" />
            </span>
            <span className="text-xl font-bold gradient-text">Customize Duniya</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to continue to your dashboard
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9 h-11"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9 h-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
            </div>
            <Button
              onClick={submit}
              disabled={loading}
              className="w-full h-11 text-base group"
              data-testid="button-login"
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-8">
            Demo access · admin@gifterp.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
