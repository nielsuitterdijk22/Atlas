import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import CatalogPage from './pages/CatalogPage'
import TemplatePage from './pages/TemplatePage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/template/:name" element={<TemplatePage />} />
      </Routes>
    </Layout>
  )
}
