import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StorePage from './pages/StorePage'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'

import VsLinktree from './pages/VsLinktree'
import VsShopify from './pages/VsShopify'
import VsWhatsAppBusiness from './pages/VsWhatsAppBusiness'
import VsInstagramBio from './pages/VsInstagramBio'

import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import ContactUs from './pages/ContactUs'
import About from './pages/about'
import BillingCallback from './pages/BillingCallback'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
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
          <Route path="/billing/callback" element={<BillingCallback />} />
          <Route path="/:storeName" element={<StorePage />} />
          <Route path="*"           element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}