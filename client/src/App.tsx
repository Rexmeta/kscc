import { lazy, Suspense, type ComponentType } from "react";
import { Redirect, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { RouteSeo } from "@/components/Seo";

const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const News = lazy(() => import("@/pages/News"));
const NewsDetail = lazy(() => import("@/pages/NewsDetail"));
const Events = lazy(() => import("@/pages/Events"));
const EventDetail = lazy(() => import("@/pages/EventDetail"));
const Partners = lazy(() => import("@/pages/Partners"));
const Members = lazy(() => import("@/pages/Members"));
const Resources = lazy(() => import("@/pages/Resources"));
const Contact = lazy(() => import("@/pages/Contact"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const Organization = lazy(() => import("@/pages/Organization"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}

function AuthenticatedRoute({ component: Component }: { component: ComponentType }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoading />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/about" component={About} />
            <Route path="/news/:id" component={NewsDetail} />
            <Route path="/news" component={News} />
            <Route path="/events/:id" component={EventDetail} />
            <Route path="/events" component={Events} />
            <Route path="/partners" component={Partners} />
            <Route path="/members" component={() => <AuthenticatedRoute component={Members} />} />
            <Route path="/resources" component={() => <AuthenticatedRoute component={Resources} />} />
            <Route path="/contact" component={Contact} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/admin" component={Admin} />
            <Route path="/organization" component={Organization} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function AppContent() {
  const { language } = useLanguage();
  
  return (
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <RouteSeo />
        <Router key={language} />
      </AuthProvider>
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
