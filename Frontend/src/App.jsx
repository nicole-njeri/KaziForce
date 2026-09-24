import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Registration from './pages/Registration'
import Login from './pages/Login'

import WorkerDashboard from './pages/WorkerDashboard'
import ClientDashboard from './pages/ClientDashboard'
import AdminDashboard from './pages/AdminDashboard'

import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Authentication */}
        <Route
          path="/register"
          element={<Registration />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        {/* Worker Dashboard */}
        <Route
          path="/worker/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Worker']}>
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Client Dashboard */}
        <Route
          path="/client/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Client']}>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />

        {/* Administrator Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Administrator']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App