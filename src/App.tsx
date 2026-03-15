import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { useAuthListener } from '@/hooks/useAuth'
import { Shell } from '@/components/layout'

// Pages
import Landing from '@/pages/Landing'
import Home from '@/pages/Home'
import Chronicle from '@/pages/Chronicle'
import EntryDetail from '@/pages/EntryDetail'
import EntryNew from '@/pages/EntryNew'
import GatheringNew from '@/pages/GatheringNew'
import GatheringDetail from '@/pages/GatheringDetail'
import Passport from '@/pages/Passport'
import Circle from '@/pages/Circle'
import PersonDetail from '@/pages/PersonDetail'
import Studio from '@/pages/Studio'
import Ledger from '@/pages/Ledger'
import Profile from '@/pages/Profile'
import Help from '@/pages/Help'
import Places from '@/pages/Places'
import EntryEdit from '@/pages/EntryEdit'
import Prospects from '@/pages/Prospects'
import StoryNew from '@/pages/StoryNew'
import StoryDetail from '@/pages/StoryDetail'
import DossierMap from '@/pages/DossierMap'
import BucketList from '@/pages/BucketList'
import MindMap from '@/pages/MindMap'

// Public pages (no auth)
import PublicInvite from '@/pages/public/PublicInvite'
import PublicGuestBook from '@/pages/public/PublicGuestBook'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { gent, initialized } = useAuthStore()
  if (gent) return <Shell>{children}</Shell>
  if (!initialized) return null
  return <Navigate to="/" replace />
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes — no Shell */}
        <Route path="/" element={<Landing />} />
        <Route path="/g/:slug" element={<PublicInvite />} />
        <Route path="/g/:slug/guestbook" element={<PublicGuestBook />} />

        {/* Protected routes — wrapped in Shell via ProtectedRoute */}
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/chronicle" element={<ProtectedRoute><Chronicle /></ProtectedRoute>} />
        <Route path="/chronicle/new" element={<ProtectedRoute><EntryNew /></ProtectedRoute>} />
        <Route path="/chronicle/:id" element={<ProtectedRoute><EntryDetail /></ProtectedRoute>} />
        <Route path="/chronicle/:id/edit" element={<ProtectedRoute><EntryEdit /></ProtectedRoute>} />
        <Route path="/prospects" element={<ProtectedRoute><Prospects /></ProtectedRoute>} />
        <Route path="/passport/stories/new" element={<ProtectedRoute><StoryNew /></ProtectedRoute>} />
        <Route path="/passport/stories/:id" element={<ProtectedRoute><StoryDetail /></ProtectedRoute>} />
        <Route path="/dossier" element={<ProtectedRoute><DossierMap /></ProtectedRoute>} />
        <Route path="/bucket-list" element={<ProtectedRoute><BucketList /></ProtectedRoute>} />
        <Route path="/gathering/new" element={<ProtectedRoute><GatheringNew /></ProtectedRoute>} />
        <Route path="/gathering/:id" element={<ProtectedRoute><GatheringDetail /></ProtectedRoute>} />
        <Route path="/passport" element={<ProtectedRoute><Passport /></ProtectedRoute>} />
        <Route path="/circle" element={<ProtectedRoute><Circle /></ProtectedRoute>} />
        <Route path="/circle/map" element={<ProtectedRoute><MindMap /></ProtectedRoute>} />
        <Route path="/circle/:id" element={<ProtectedRoute><PersonDetail /></ProtectedRoute>} />
        <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
        <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/places" element={<ProtectedRoute><Places /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  )
}

// Single auth listener — mounted once for the entire app lifetime
function AppContent() {
  useAuthListener()
  return <AnimatedRoutes />
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
