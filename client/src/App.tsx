import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ZekeHelper from "./components/ZekeHelper";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminControlCenter from "./pages/AdminControlCenter";
import FreeWebinars from "./pages/FreeWebinars";
import LegalPage from "./pages/LegalPage";
import WorkspaceHub from "./pages/WorkspaceHub";
import UserDashboard from "./pages/UserDashboard";
import Plans from "./pages/Plans";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/Website"><Redirect to="/" /></Route>
      <Route path="/website"><Redirect to="/" /></Route>
      <Route path="/webinars" component={FreeWebinars} />
      <Route path="/events"><Redirect to="/webinars" /></Route>
      <Route path="/jobs"><Redirect to="/?section=jobs" /></Route>
      <Route path="/service"><Redirect to="/?section=services" /></Route>
      <Route path="/connections"><Redirect to="/?section=home" /></Route>
      <Route path="/privacy"><LegalPage kind="privacy" /></Route>
      <Route path="/terms"><LegalPage kind="terms" /></Route>
      <Route path="/payroll-disclaimer"><LegalPage kind="payroll" /></Route>
      <Route path="/workspace" component={WorkspaceHub} />
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/plans" component={Plans} />
      <Route path="/admin" component={AdminControlCenter} />
      {/* Legacy Manus-OAuth admin page. Its backend (oauth callback + tRPC
          telegramAdmin/linkedinUpdates/formTemplates routes) was never migrated
          to the Cloudflare Worker (see TELEGRAM_SETUP.md "Scope"), so "Sign in"
          there can never succeed. Redirect to the working Telegram-based
          Control Center instead of shipping a dead sign-in screen. */}
      <Route path="/admin/updates">
        <Redirect to="/admin" />
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <ZekeHelper />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
