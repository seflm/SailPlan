import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthState } from './hooks/useAuthState'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Trips from './pages/Trips'
import Organizing from './pages/Organizing'
import TripForm from './pages/TripForm'
import TripOrganizer from './pages/TripOrganizer'
import TripCaptain from './pages/TripCaptain'
import TripParticipant from './pages/TripParticipant'
import TripPublic from './pages/TripPublic'
import OrganizerSettings from './pages/OrganizerSettings'
import BoatDetail from './pages/BoatDetail'
import BoatForm from './pages/BoatForm'
import ParticipantDetail from './pages/ParticipantDetail'
import Profile from './pages/Profile'
import ChecklistEdit from './pages/ChecklistEdit'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import JoinTripRedirect from './components/JoinTripRedirect'

function App() {
  const { user, loading } = useAuthState()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Načítání...</div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={<Navigate to="/onboarding?mode=register" replace />} />
      <Route path="/join-trip/:tripId" element={<JoinTripRedirect />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/trip/:tripId/public" element={<TripPublic />} />
      
      {/* Protected routes */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
        <Route path="/organizing" element={<ProtectedRoute><Organizing /></ProtectedRoute>} />
        <Route path="/trip/new" element={<ProtectedRoute><TripForm /></ProtectedRoute>} />
        <Route path="/trip/:tripId/edit" element={<ProtectedRoute><TripForm /></ProtectedRoute>} />
        <Route path="/trip/:tripId/organizer" element={<ProtectedRoute><TripOrganizer /></ProtectedRoute>} />
        <Route path="/trip/:tripId/captain" element={<ProtectedRoute><TripCaptain /></ProtectedRoute>} />
        <Route path="/trip/:tripId/participant" element={<ProtectedRoute><TripParticipant /></ProtectedRoute>} />
        <Route path="/trip/:tripId/boat/new" element={<ProtectedRoute><BoatForm /></ProtectedRoute>} />
        <Route path="/trip/:tripId/boat/:boatId/edit" element={<ProtectedRoute><BoatForm /></ProtectedRoute>} />
        <Route path="/trip/:tripId/boat/:boatId" element={<ProtectedRoute><BoatDetail /></ProtectedRoute>} />
        <Route path="/trip/:tripId/participant/:participantId" element={<ProtectedRoute><ParticipantDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings/organizer" element={<ProtectedRoute><OrganizerSettings /></ProtectedRoute>} />
        <Route path="/checklist/new" element={<ProtectedRoute><ChecklistEdit /></ProtectedRoute>} />
        <Route path="/checklist/:checklistId/edit" element={<ProtectedRoute><ChecklistEdit /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}

export default App

