import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StorePage from './pages/StorePage'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'

// Compare pages
import VsLinktree from './pages/VsLinktree'
import VsShopify from './pages/VsShopify'
import VsWhatsAppBusiness from './pages/VsWhatsAppBusiness'
import VsInstagramBio from './pages/VsInstagramBio'

// Legal pages
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import ContactUs from './pages/ContactUs'


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Core routes */}
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

          {/* Compare pages — static, must be before /:storeName */}
          <Route path="/compare/vs-linktree"          element={<VsLinktree />} />
          <Route path="/compare/vs-shopify"           element={<VsShopify />} />
          <Route path="/compare/vs-whatsapp-business" element={<VsWhatsAppBusiness />} />
          <Route path="/compare/vs-instagram-bio"     element={<VsInstagramBio />} />

          {/* Legal pages — static, must be before /:storeName */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms"          element={<TermsOfService />} />
          <Route path="/contact"        element={<ContactUs />} />

          {/* Dynamic store page — must stay last before wildcard */}
          <Route path="/:storeName" element={<StorePage />} />
          <Route path="*"           element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}