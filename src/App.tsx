import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import QuizPage from "./pages/QuizPage";
import MyLearning from "./pages/MyLearning";
import MyCourses from "./pages/MyCourses";
import Certificates from "./pages/Certificates";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import TrainerPortal from "./pages/TrainerPortal";
import Contact from "./pages/Contact";
import Booking from "./pages/Booking";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Integrations from "./pages/Integrations";
import Enterprise from "./pages/Enterprise";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import HelpCenter from "./pages/HelpCenter";
import Webinars from "./pages/Webinars";
import CaseStudies from "./pages/CaseStudies";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Partners from "./pages/Partners";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import StaffManagement from "./pages/StaffManagement";
import CourseBuilder from "./pages/admin/CourseBuilder";
import CourseEditor from "./pages/admin/CourseEditor";
import CoursePreview from "./pages/admin/CoursePreview";
import IntegrationsStatus from "./pages/admin/IntegrationsStatus";
import AdminSettings from "./pages/admin/AdminSettings";
import SecuritySettings from "./pages/admin/SecuritySettings";
import NotificationSettings from "./pages/admin/NotificationSettings";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Cart from "./pages/Cart";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import ScormPlayer from "./pages/ScormPlayer";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/sign-in" element={<Auth />} />
                <Route path="/sign-up" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route path="/courses/:courseId/quiz" element={<QuizPage />} />
                <Route path="/my-learning" element={<MyLearning />} />
                <Route path="/my-courses" element={<MyCourses />} />
                <Route path="/certificates" element={<Certificates />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />

                {/* Admin portal routes - require admin role */}
                <Route path="/admin-portal/dashboard" element={<ProtectedRoute requiredRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-portal/staff-management" element={<ProtectedRoute requiredRoles={['admin']}><StaffManagement /></ProtectedRoute>} />
                <Route path="/admin-portal/courses" element={<ProtectedRoute requiredRoles={['admin']}><CourseBuilder /></ProtectedRoute>} />
                <Route path="/admin-portal/courses/:id/edit" element={<ProtectedRoute requiredRoles={['admin']}><CourseEditor /></ProtectedRoute>} />
                <Route path="/admin-portal/courses/:id/preview" element={<ProtectedRoute requiredRoles={['admin']}><CoursePreview /></ProtectedRoute>} />
                <Route path="/admin-portal/integrations" element={<ProtectedRoute requiredRoles={['super_admin']}><IntegrationsStatus /></ProtectedRoute>} />
                <Route path="/admin-portal/settings" element={<ProtectedRoute requiredRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
                <Route path="/admin-portal/settings/security" element={<ProtectedRoute requiredRoles={['admin']}><SecuritySettings /></ProtectedRoute>} />
                <Route path="/admin-portal/settings/notifications" element={<ProtectedRoute requiredRoles={['admin']}><NotificationSettings /></ProtectedRoute>} />
                <Route path="/admin-portal/trainer" element={<ProtectedRoute requiredRoles={['trainer']}><TrainerPortal /></ProtectedRoute>} />

                {/* Legacy route redirects */}
                <Route path="/admin" element={<Navigate to="/admin-portal/dashboard" replace />} />
                <Route path="/staff-management" element={<Navigate to="/admin-portal/staff-management" replace />} />
                <Route path="/app/admin/courses" element={<Navigate to="/admin-portal/courses" replace />} />
                <Route path="/app/admin/courses/:id/edit" element={<Navigate to="/admin-portal/courses/:id/edit" replace />} />
                <Route path="/app/admin/courses/:id/preview" element={<Navigate to="/admin-portal/courses/:id/preview" replace />} />
                <Route path="/app/admin/integrations-status" element={<Navigate to="/admin-portal/integrations" replace />} />
                <Route path="/trainer" element={<Navigate to="/admin-portal/trainer" replace />} />

                {/* Public routes */}
                <Route path="/contact" element={<Contact />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/features" element={<Features />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/enterprise" element={<Enterprise />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/help-center" element={<HelpCenter />} />
                <Route path="/webinars" element={<Webinars />} />
                <Route path="/case-studies" element={<CaseStudies />} />
                <Route path="/about" element={<About />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />
                <Route path="/access-denied" element={<AccessDenied />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-canceled" element={<PaymentCanceled />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout-success" element={<CheckoutSuccess />} />
                <Route path="/scorm/launch/:registrationId" element={<ScormPlayer />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
