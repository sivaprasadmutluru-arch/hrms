import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from '../../features/auth/authSlice'

export default function SecureCarrRoute({ children }) {
  const authenticated = useSelector(selectIsAuthenticated)
  const location = useLocation()
  if (!authenticated) {
    return <Navigate to="/carr/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return children
}
