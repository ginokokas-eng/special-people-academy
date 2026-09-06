import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/ScrollToTop";
import { NativeSsoHandoff } from "@/hooks/useNativeSsoHandoff";
import { NativeBootGate } from "@/components/native/NativeBootGate";
import { NativeWelcome } from "@/components/native/NativeWelcome";


import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

import SsoCallback from "./pages/SsoCallback";
import Launch from "./pages/Launch";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CourseLearn from "./pages/CourseLearn";
import QuizPage from "./pages/QuizPage";
import MyLearning from "./pages/MyLearning";
import MyCourses from "./pages/MyCourses";
import Certificates from "./pages/Certificates";
import VerifyCertificate from "./pages/VerifyCertificate";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import TrainerPortal from "./pages/TrainerPortal";
import Contact from "./pages/Contact";
import Booking from "./pages/Booking";
import Enterprise from "./pages/Enterprise";
import HelpCenter from "./pages/HelpCenter";
import About from "./pages/About";
import Careers from "./pages/Careers";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import StaffManagement from "./pages/StaffManagement";
import Learners from "./pages/admin/Learners";
import CourseBuilder from "./pages/admin/CourseBuilder";
import CourseEditor from "./pages/admin/CourseEditor";
import LessonContentEditor from "./pages/admin/LessonContentEditor";
import CoursePreview from "./pages/admin/CoursePreview";
import IntegrationsStatus from "./pages/admin/IntegrationsStatus";
import AdminSettings from "./pages/admin/AdminSettings";
import SecuritySettings from "./pages/admin/SecuritySettings";
import NotificationSettings from "./pages/admin/NotificationSettings";
import BrandingSettings from "./pages/admin/BrandingSettings";
import GeneralSettings from "./pages/admin/GeneralSettings";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Cart from "./pages/Cart";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import ScormPlayer from "./pages/ScormPlayer";
import Organisations from "./pages/admin/Organisations";
import Licences from "./pages/admin/Licences";
import QuestionBank from "./pages/admin/QuestionBank";
import Standards from "./pages/admin/Standards";

import OrgPortal from "./pages/org/OrgPortal";
import InviteAccept from "./pages/InviteAccept";
import Renewals from "./pages/Renewals";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <ConfirmDialogHost />
            <BrowserRouter>
              <ScrollToTop />
              <NativeSsoHandoff />

              <NativeBootGate />

              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/sso" element={<SsoCallback />} />
                <Route path="/launch" element={<Launch />} />
                <Route path="/native-welcome" element={<NativeWelcome />} />

                <Route path="/sign-in" element={<Auth />} />
                <Route path="/sign-up" element={<Auth />} />

                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route path="/courses/:id/learn" element={<CourseLearn />} />
                <Route path="/courses/:courseId/quiz" element={<QuizPage />} />
                <Route path="/my-learning" element={<MyLearning />} />
                <Route path="/my-courses" element={<MyCourses />} />
                <Route path="/certificates" element={<Certificates />} />
                <Route path="/verify/:code" element={<VerifyCertificate />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />

                {/* Admin portal routes - require admin role */}
                <Route path="/admin-portal/dashboard" element={<ProtectedRoute requiredRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-portal/staff-management" element={<ProtectedRoute requiredRoles={['admin']}><StaffManagement /></ProtectedRoute>} />
                <Route path="/admin-portal/courses" element={<ProtectedRoute requiredRoles={['ops_training_admin']}><CourseBuilder /></ProtectedRoute>} />
                <Route path="/admin-portal/courses/:id/edit" element={<ProtectedRoute requiredRoles={['ops_training_admin']}><CourseEditor /></ProtectedRoute>} />
                <Route path="/admin-portal/courses/:id/lessons/:lessonId/content" element={<ProtectedRoute requiredRoles={['ops_training_admin']}><LessonContentEditor /></ProtectedRoute>} />
                <Route path="/admin-portal/courses/:id/preview" element={<ProtectedRoute requiredRoles={['ops_training_admin']}><CoursePreview /></ProtectedRoute>} />
                <Route path="/admin-portal/learners" element={<ProtectedRoute requiredRoles={['admin']}><Learners /></ProtectedRoute>} />
                <Route path="/admin-portal/organisations" element={<ProtectedRoute requiredRoles={['ops_training_admin']}><Organisations /></ProtectedRoute>} />
                <Route path="/admin-portal/licences" element={<ProtectedRoute requiredRoles={['ops_training_admin']}><Licences /></ProtectedRoute>} />
                <Route path="/admin-portal/question-bank" element={<ProtectedRoute requiredRoles={['ops_training_admin']}><QuestionBank /></ProtectedRoute>} />
                <Route path="/admin-portal/standards" element={<ProtectedRoute requiredRoles={['ops_training_admin']}><Standards /></ProtectedRoute>} />

                <Route path="/admin-portal/integrations" element={<ProtectedRoute requiredRoles={['super_admin']}><IntegrationsStatus /></ProtectedRoute>} />
                <Route path="/admin-portal/settings" element={<ProtectedRoute requiredRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
                <Route path="/admin-portal/settings/security" element={<ProtectedRoute requiredRoles={['admin']}><SecuritySettings /></ProtectedRoute>} />
                <Route path="/admin-portal/settings/notifications" element={<ProtectedRoute requiredRoles={['admin']}><NotificationSettings /></ProtectedRoute>} />
                <Route path="/admin-portal/settings/branding" element={<ProtectedRoute requiredRoles={['admin']}><BrandingSettings /></ProtectedRoute>} />
                <Route path="/admin-portal/settings/general" element={<ProtectedRoute requiredRoles={['admin']}><GeneralSettings /></ProtectedRoute>} />
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
                {/* Template marketing pages retired: send readers to the real content. */}
                <Route path="/features" element={<Navigate to="/enterprise" replace />} />
                {/* Subscription pricing is retired: send buyers to sales. */}
                <Route path="/pricing" element={<Navigate to="/contact?tab=sales" replace />} />
                <Route path="/integrations" element={<Navigate to="/enterprise" replace />} />
                <Route path="/enterprise" element={<Enterprise />} />
                {/* Awaiting real content — routes park on the help centre. */}
                <Route path="/blog" element={<Navigate to="/help-center" replace />} />
                <Route path="/blog/:slug" element={<Navigate to="/help-center" replace />} />
                <Route path="/help-center" element={<HelpCenter />} />
                <Route path="/webinars" element={<Navigate to="/help-center" replace />} />
                <Route path="/case-studies" element={<Navigate to="/help-center" replace />} />
                <Route path="/about" element={<About />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/partners" element={<Navigate to="/contact?tab=sales" replace />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />
                <Route path="/access-denied" element={<AccessDenied />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-canceled" element={<PaymentCanceled />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout-success" element={<CheckoutSuccess />} />
                <Route path="/scorm/launch/:registrationId" element={<ScormPlayer />} />
                <Route path="/renewals" element={<Renewals />} />
                <Route path="/invite" element={<InviteAccept />} />
                <Route path="/org" element={<OrgPortal />} />
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
