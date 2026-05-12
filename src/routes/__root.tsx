import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/BottomNav";
import { registerServiceWorker } from "@/lib/pwa";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block text-primary underline">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-6" onClick={() => { router.invalidate(); reset(); }}>Try again</Button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" },
      { name: "theme-color", content: "#0e1116" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "IronLog" },
      { title: "IronLog — Track. Lift. Repeat." },
      { name: "description", content: "Personal gym progression tracker — log workouts, track PRs, train offline." },
      { property: "og:title", content: "IronLog" },
      { name: "twitter:title", content: "IronLog" },
      { property: "og:description", content: "Personal gym progression tracker — log workouts, track PRs, train offline." },
      { name: "twitter:description", content: "Personal gym progression tracker — log workouts, track PRs, train offline." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2c8bd909-908d-4ef1-b588-88da2e87cefe/id-preview-e83063b7--411e44eb-9d0b-4989-81b3-643f9652b1f4.lovable.app-1778184569735.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2c8bd909-908d-4ef1-b588-88da2e87cefe/id-preview-e83063b7--411e44eb-9d0b-4989-81b3-643f9652b1f4.lovable.app-1778184569735.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <header className="sticky top-0 z-30 glass-strong border-b border-border/60">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">IRONLOG</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Track. Lift. Repeat.</div>
          </div>
        </Link>
      </div>
    </header>
  );
}

function AppShell() {
  const { user } = useAuth();
  return (
    <div className={`min-h-screen bg-background text-foreground animate-fade-in ${user ? "has-bottom-nav" : ""}`}>
      <Header />
      <Outlet />
      {user && <BottomNav />}
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { registerServiceWorker(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
        <Toaster richColors position="top-center" theme="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
