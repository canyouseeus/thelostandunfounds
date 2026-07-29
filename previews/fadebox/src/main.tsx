import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider, Helmet } from 'react-helmet-async'

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
 *
 * VITE_HASH_ROUTER builds for hosts that serve a single file and cannot rewrite
 * unknown paths to index.html (the single-file export). There, routes live
 * behind the hash instead: #/proposal, #/dashboard.
 */
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter

/*
 * Only the proposal sets its own <title>. Without a title on the other two,
 * navigating away from it left the tab reading "Proposal for Fadebox
 * Barbershop" over the landing page or the dashboard, so each route names
 * itself.
 */
function Titled({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Helmet><title>{title}</title></Helmet>
      {children}
    </>
  )
}

const landing = <Titled title="Fadebox — Book your barber, not a waitlist"><FadeboxLanding /></Titled>
const dashboard = <Titled title="Fadebox — Owner console"><FadeboxDashboard /></Titled>

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={landing} />
          <Route path="/proposal" element={<FadeboxProposal />} />
          <Route path="/dashboard" element={dashboard} />

          <Route path="/fadebox-preview" element={landing} />
          <Route path="/fadebox-preview/proposal" element={<FadeboxProposal />} />
          <Route path="/fadebox-preview/dashboard" element={dashboard} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </HelmetProvider>
  </React.StrictMode>,
)
