import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import CatalogPage from './pages/CatalogPage'
import TemplatePage from './pages/TemplatePage'
import ExecutionsPage from './pages/admin/ExecutionsPage'
import PresetsPage from './pages/admin/PresetsPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/template/:name" element={<TemplatePage />} />
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
      </Routes>
    </Layout>
  )
}
