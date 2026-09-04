// src/App.jsx/
import { lazy, Suspense } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ScrollToTop from './components/ScrollToTop'
import DomainResolver from './components/DomainResolver'
import ProtectedRoute from './components/ProtectedRoute'
import RouteFallback from './components/RouteFallback'

// Home stays eagerly imported: it is the primary landing surface, so splitting
// it would trade a render-blocking chunk fetch for nothing. Every other route
// is code-split, which keeps the dashboard, admin panel, storefront renderer
// and the PDF/receipt tooling out of the initial download for someone who has
// only opened the marketing site.
import Home from './pages/Home'

// Auth / account
const Login           = lazy(() => import('./pages/Login'))
const ResetPassword   = lazy(() => import('./pages/ResetPassword'))
const JoinTeam        = lazy(() => import('./pages/JoinTeam'))
const AccountRecovery = lazy(() => import('./pages/AccountRecovery'))

// Authenticated surfaces (the heaviest chunks in the app)
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Admin           = lazy(() => import('./pages/Admin'))
const BillingCallback = lazy(() => import('./pages/BillingCallback'))

// Public storefronts
const StorePage        = lazy(() => import('./pages/StorePage'))
const ServiceStorePage = lazy(() => import('./pages/ServiceStorePage'))
const ReviewPage       = lazy(() => import('./pages/ReviewPage'))

// Comparison pages
const VsLinktree         = lazy(() => import('./pages/VsLinktree'))
const VsShopify          = lazy(() => import('./pages/VsShopify'))
const VsWhatsAppBusiness = lazy(() => import('./pages/VsWhatsAppBusiness'))
const VsInstagramBio     = lazy(() => import('./pages/VsInstagramBio'))

// Marketing / content
const PrivacyPolicy      = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService     = lazy(() => import('./pages/TermsOfService'))
const ContactUs          = lazy(() => import('./pages/ContactUs'))
const About              = lazy(() => import('./pages/about'))
const Pricing            = lazy(() => import('./pages/Pricing'))
const LiveStoresPage     = lazy(() => import('./pages/LiveStoresPage'))
const OfferNameLab       = lazy(() => import('./pages/OfferNameLab'))
const PolicyGenerator    = lazy(() => import('./pages/PolicyGenerator'))
const ReportStore        = lazy(() => import('./pages/ReportStore'))
const JobsPage           = lazy(() => import('./pages/JobsPage'))
const JobDetailPage      = lazy(() => import('./pages/JobDetailPage'))
const BlogPage           = lazy(() => import('./pages/BlogPage'))
const BlogPostPage       = lazy(() => import('./pages/BlogPostPage'))
const SuccessStoriesPage = lazy(() => import('./pages/SuccessStoriesPage'))
const NotFound           = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<DomainResolver><Home /></DomainResolver>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/join-team" element={<JoinTeam />} />
            {/* Public: a locked-out vendor cannot authenticate, so both views
                are unauthenticated. The redeem view requires an approved,
                single-use token. See _lib/recovery.js for the threat model. */}
            <Route path="/account-recovery" element={<AccountRecovery />} />
            <Route path="/account-recovery/redeem" element={<AccountRecovery />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/compare/vs-linktree"          element={<VsLinktree />} />
            <Route path="/compare/vs-shopify"           element={<VsShopify />} />
            <Route path="/compare/vs-whatsapp-business" element={<VsWhatsAppBusiness />} />
            <Route path="/compare/vs-instagram-bio"     element={<VsInstagramBio />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms"          element={<TermsOfService />} />
            <Route path="/contact"        element={<ContactUs />} />
            <Route path="/about"          element={<About />} />
            <Route path="/pricing"        element={<Pricing />} />
            <Route path="/tools/offer-name-lab" element={<OfferNameLab />} />
            <Route path="/tools/policy-generator" element={<PolicyGenerator />} />
            <Route path="/report-store" element={<ReportStore />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/success-stories" element={<SuccessStoriesPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/billing/callback" element={<BillingCallback />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/live-stores" element={<LiveStoresPage />} />
            <Route path="/:storeName" element={<StorePage />} />
            <Route path="/:storeName/services" element={<ServiceStorePage />} />
            <Route path="*"           element={<NotFound />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      {/* Real-user performance monitoring. Must be rendered, not merely imported:
          it was previously imported here and never mounted, so it collected nothing. */}
      <SpeedInsights />
    </AuthProvider>
  )
}
