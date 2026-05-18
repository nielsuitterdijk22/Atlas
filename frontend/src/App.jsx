import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import ServiceDetailPage from './pages/ServiceDetailPage'
import CreatePage from './pages/CreatePage'
import WizardPage from './pages/WizardPage'
import RequestsPage from './pages/RequestsPage'
import RequestDetailPage from './pages/RequestDetailPage'
import ApprovalsPage from './pages/ApprovalsPage'
import OrgSettingsPage from './pages/OrgSettingsPage'
import ExecutionsPage from './pages/admin/ExecutionsPage'
import PresetsPage from './pages/admin/PresetsPage'

export default function App() {
  const { loading, user, memberships } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!user) return <LoginPage />
  if (memberships.length === 0) return <OnboardingPage />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/catalog/:id" element={<ServiceDetailPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/create/:name" element={<WizardPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/settings/organization" element={<OrgSettingsPage />} />
        <Route path="/admin" element={<Navigate to="/admin/executions" replace />} />
        <Route
          path="/admin/*"
          element={
            <AdminLayout>
              <Routes>
                <Route path="executions" element={<ExecutionsPage />} />
                <Route path="presets" element={<PresetsPage />} />
              </Routes>
            </AdminLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
