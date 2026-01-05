import { Navigate, useParams } from 'react-router-dom'

export default function JoinTripRedirect() {
  const { tripId } = useParams()
  return <Navigate to={`/onboarding?mode=join-trip&tripId=${tripId}`} replace />
}

