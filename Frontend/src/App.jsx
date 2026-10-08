import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Registration from './pages/Registration'
import Login from './pages/Login'

import WorkerDashboard from './pages/WorkerDashboard'
import WorkerProfile from './pages/WorkerProfile'
import WorkerGigs from './pages/WorkerGigs'
import WorkerGigDetails from './pages/WorkerGigDetails'
import WorkerApplications from './pages/WorkerApplications'
import WorkerApplicationDetails from './pages/WorkerApplicationDetails'
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

        <Route path="/worker/gigs" element={<ProtectedRoute allowedRoles={['Worker']}><WorkerGigs /></ProtectedRoute>} />
        <Route path="/worker/gigs/:gigId" element={<ProtectedRoute allowedRoles={['Worker']}><WorkerGigDetails /></ProtectedRoute>} />
        <Route path="/worker/applications" element={<ProtectedRoute allowedRoles={['Worker']}><WorkerApplications /></ProtectedRoute>} />
        <Route path="/worker/applications/:applicationId" element={<ProtectedRoute allowedRoles={['Worker']}><WorkerApplicationDetails /></ProtectedRoute>} />

        <Route
          path="/worker/profile"
          element={
            <ProtectedRoute allowedRoles={['Worker']}>
              <WorkerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/profile/edit"
          element={
            <ProtectedRoute allowedRoles={['Worker']}>
              <WorkerProfile editing />
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
