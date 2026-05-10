import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LiffProvider } from "./contexts/LiffContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import ReservationForm from "./pages/ReservationForm";
import WaitlistForm from "./pages/WaitlistForm";
import CustomerWaitlist from "./pages/CustomerWaitlist";
import Menu from "./pages/Menu";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/menu"} component={Menu} />
      <Route path={"/reserve"} component={ReservationForm} />
      <Route path={"/waitlist"} component={WaitlistForm} />
      <Route path={"/status/:waitlistId"} component={CustomerWaitlist} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LiffProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LiffProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
