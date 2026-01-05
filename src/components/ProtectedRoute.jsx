import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { hasRequiredProfileFields } from '../utils/profileValidation'

export default function ProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuthState()
  const location = useLocation()
  const [profileLoading, setProfileLoading] = useState(true)
  const [hasRequiredFields, setHasRequiredFields] = useState(false)
  
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setProfileLoading(false)
        return
      }
      
      const hasFields = await hasRequiredProfileFields(user.uid)
      setHasRequiredFields(hasFields)
      setProfileLoading(false)
    }
    
    if (!authLoading) {
      checkProfile()
    }
  }, [user, authLoading])
  
  if (authLoading || profileLoading) {
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
  
  if (!user) {
    // Save the current location to redirect back after login
    sessionStorage.setItem('onboardingReturnUrl', location.pathname + location.search)
    return <Navigate to="/" replace />
  }
  
  // Check if user has required profile fields
  if (!hasRequiredFields) {
    // Save the current location to redirect back after onboarding
    sessionStorage.setItem('onboardingReturnUrl', location.pathname + location.search)
    return <Navigate to="/onboarding?mode=onboarding" replace />
  }
  
  return children
}

