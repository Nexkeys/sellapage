// src/App.jsx/
import { SpeedInsights } from "@vercel/speed-insights/react"
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ScrollToTop from './components/ScrollToTop';
import DomainResolver from './components/DomainResolver';
import Home from './pages/Home';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import StorePage from './pages/StorePage'
import ServiceStorePage from './pages/ServiceStorePage'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import ReviewPage from './pages/ReviewPage'

import VsLinktree from './pages/VsLinktree'
import VsShopify from './pages/VsShopify'
import VsWhatsAppBusiness from './pages/VsWhatsAppBusiness'
import VsInstagramBio from './pages/VsInstagramBio'

import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import ContactUs from './pages/ContactUs'
import About from './pages/about'
import BillingCallback from './pages/BillingCallback'
import Admin from './pages/Admin'
import Pricing from './pages/Pricing'
import LiveStoresPage from './pages/LiveStoresPage'
import OfferNameLab from './pages/OfferNameLab'
import PolicyGenerator from './pages/PolicyGenerator'
import ReportStore from './pages/ReportStore'
import JobsPage from './pages/JobsPage'
import JobDetailPage from './pages/JobDetailPage'


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<DomainResolver><Home /></DomainResolver>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/billing/callback" element={<BillingCallback />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/live-stores" element={<LiveStoresPage />} />
          <Route path="/:storeName" element={<StorePage />} />
          <Route path="/:storeName/services" element={<ServiceStorePage />} />
          <Route path="*"           element={<NotFound />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
