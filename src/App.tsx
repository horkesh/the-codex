import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { useAuthListener } from '@/hooks/useAuth'
import { useComfortMode } from '@/hooks/useComfortMode'
import { Shell } from '@/components/layout'
import { Spinner } from '@/components/ui'

// Eager: landing + home (instant navigation)
import Landing from '@/pages/Landing'
import Showcase from '@/pages/Showcase'
import Home from '@/pages/Home'

// Lazy: everything else
const Chronicle = lazy(() => import('@/pages/Chronicle'))
const EntryDetail = lazy(() => import('@/pages/EntryDetail'))
const EntryNew = lazy(() => import('@/pages/EntryNew'))
const EntryEdit = lazy(() => import('@/pages/EntryEdit'))
const GatheringNew = lazy(() => import('@/pages/GatheringNew'))
const GatheringDetail = lazy(() => import('@/pages/GatheringDetail'))
const Passport = lazy(() => import('@/pages/Passport'))
const Circle = lazy(() => import('@/pages/Circle'))
const PersonDetail = lazy(() => import('@/pages/PersonDetail'))
const Studio = lazy(() => import('@/pages/Studio'))
const Ledger = lazy(() => import('@/pages/Ledger'))
const Profile = lazy(() => import('@/pages/Profile'))
const Help = lazy(() => import('@/pages/Help'))
const Places = lazy(() => import('@/pages/Places'))
const Prospects = lazy(() => import('@/pages/Prospects'))
const StoryNew = lazy(() => import('@/pages/StoryNew'))
const StoryDetail = lazy(() => import('@/pages/StoryDetail'))
const DossierMap = lazy(() => import('@/pages/DossierMap'))
const BucketList = lazy(() => import('@/pages/BucketList'))
const Agenda = lazy(() => import('@/pages/Agenda'))
const UpcomingGatherings = lazy(() => import('@/pages/UpcomingGatherings'))
const GentProfile = lazy(() => import('@/pages/GentProfile'))
const PhotoTimeline = lazy(() => import('@/pages/PhotoTimeline'))
const ToastDraftReview = lazy(() => import('@/pages/ToastDraftReview'))
const Momento = lazy(() => import('@/pages/Momento'))
const VisaRedirect = lazy(() => import('@/pages/VisaRedirect'))
const PublicInvite = lazy(() => import('@/pages/public/PublicInvite'))
const PublicGuestBook = lazy(() => import('@/pages/public/PublicGuestBook'))

function LazyFallback() {
  return <div className="flex-1 flex items-center justify-center"><Spinner size="md" /></div>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { gent, initialized } = useAuthStore()
  if (gent) return <Shell>{children}</Shell>
  if (!initialized) return null
  return <Navigate to="/" replace />
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<LazyFallback />}>
        <Routes location={location} key={location.pathname}>
          {/* Public routes — no Shell */}
          <Route path="/" element={<Showcase />} />
          <Route path="/login" element={<Landing />} />
          <Route path="/lounge" element={<ProtectedRoute><Navigate to="/home" replace /></ProtectedRoute>} />
          <Route path="/g/:slug" element={<PublicInvite />} />
          <Route path="/g/:slug/guestbook" element={<PublicGuestBook />} />

          {/* Protected routes — wrapped in Shell via ProtectedRoute */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/chronicle" element={<ProtectedRoute><Chronicle /></ProtectedRoute>} />
          <Route path="/chronicle/new" element={<ProtectedRoute><EntryNew /></ProtectedRoute>} />
          <Route path="/chronicle/photos" element={<ProtectedRoute><PhotoTimeline /></ProtectedRoute>} />
          <Route path="/chronicle/draft/:id" element={<ProtectedRoute><ToastDraftReview /></ProtectedRoute>} />
          <Route path="/chronicle/:id" element={<ProtectedRoute><EntryDetail /></ProtectedRoute>} />
          <Route path="/chronicle/:id/edit" element={<ProtectedRoute><EntryEdit /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
          <Route path="/agenda/wishlist" element={<ProtectedRoute><BucketList /></ProtectedRoute>} />
          <Route path="/agenda/scouting" element={<ProtectedRoute><Prospects /></ProtectedRoute>} />
          <Route path="/agenda/upcoming" element={<ProtectedRoute><UpcomingGatherings /></ProtectedRoute>} />
          {/* Legacy redirects */}
          <Route path="/bucket-list" element={<Navigate to="/agenda/wishlist" replace />} />
          <Route path="/prospects" element={<Navigate to="/agenda/scouting" replace />} />
          <Route path="/passport/visa/:stampId" element={<ProtectedRoute><VisaRedirect /></ProtectedRoute>} />
          <Route path="/passport/stories/new" element={<ProtectedRoute><StoryNew /></ProtectedRoute>} />
          <Route path="/passport/stories/:id" element={<ProtectedRoute><StoryDetail /></ProtectedRoute>} />
          <Route path="/dossier" element={<ProtectedRoute><DossierMap /></ProtectedRoute>} />
          <Route path="/gathering/new" element={<ProtectedRoute><GatheringNew /></ProtectedRoute>} />
          <Route path="/gathering/:id" element={<ProtectedRoute><GatheringDetail /></ProtectedRoute>} />
          <Route path="/passport" element={<ProtectedRoute><Passport /></ProtectedRoute>} />
          <Route path="/circle" element={<ProtectedRoute><Circle /></ProtectedRoute>} />
          <Route path="/circle/map" element={<Navigate to="/circle" replace />} />
          <Route path="/circle/:id" element={<ProtectedRoute><PersonDetail /></ProtectedRoute>} />
          <Route path="/momento" element={<ProtectedRoute><Momento /></ProtectedRoute>} />
          <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/gents/:alias" element={<ProtectedRoute><GentProfile /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          <Route path="/places" element={<ProtectedRoute><Places /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}

// Single auth listener — mounted once for the entire app lifetime
function AppContent() {
  useAuthListener()
  useComfortMode()
  return <AnimatedRoutes />
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
