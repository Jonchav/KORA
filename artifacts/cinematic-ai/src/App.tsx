import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { LoginPage } from "@/components/login-page";
import { WelcomeSplash } from "@/components/welcome-splash";
import Home from "@/pages/home";
import PublicPricingPage from "@/pages/public-pricing";
import { useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string || "";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route><Redirect to="/" /></Route>
    </Switch>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(
    () => !!sessionStorage.getItem("kora-welcome-seen")
  );

  const dismissSplash = () => {
    sessionStorage.setItem("kora-welcome-seen", "1");
    setSplashDone(true);
  };

  if (!splashDone) {
    return <WelcomeSplash onDismiss={dismissSplash} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Router />;
}

function AppRoutes() {
  const [location] = useLocation();

  if (location === "/pricing") {
    return <PublicPricingPage />;
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base="">
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
