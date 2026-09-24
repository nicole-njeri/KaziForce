import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token')
  const storedUser = localStorage.getItem('user')

  if (!token || !storedUser) {
    return <Navigate to="/login" replace />
  }

  let user

  try {
    user = JSON.parse(storedUser)
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    return <Navigate to="/login" replace />
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute