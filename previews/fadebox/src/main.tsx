import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

import FadeboxLanding from './pages/FadeboxLanding'
import FadeboxProposal from './pages/FadeboxProposal'
import FadeboxDashboard from './pages/FadeboxDashboard'

import './index.css'

/*
 * Standalone deployment of the Fadebox redesign preview.
 *
 * The pages are copied verbatim from src/templates/fadebox/ in the main repo,
 * where they are served at /fadebox-preview. Both path shapes are routed here
 * so links written against either one resolve: the short paths for this
 * deployment, and the /fadebox-preview/* paths used on the main site.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FadeboxLanding />} />
          <Route path="/proposal" element={<FadeboxProposal />} />
          <Route path="/dashboard" element={<FadeboxDashboard />} />

          <Route path="/fadebox-preview" element={<FadeboxLanding />} />
          <Route path="/fadebox-preview/proposal" element={<FadeboxProposal />} />
          <Route path="/fadebox-preview/dashboard" element={<FadeboxDashboard />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
