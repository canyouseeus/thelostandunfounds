import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Layout from './components/Layout'
import ToolsDashboard from './pages/ToolsDashboard'
import GoogleDriveFolders from './pages/GoogleDriveFolders'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ToolsDashboard />} />
        </Route>
        <Route path="/tools" element={<Layout />}>
          <Route index element={<ToolsDashboard />} />
        </Route>
        <Route path="/tools/google-drive-folders" element={<GoogleDriveFolders />} />
      </Routes>
      <Analytics />
    </>
  )
}

export default App

