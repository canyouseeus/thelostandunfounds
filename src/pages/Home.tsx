import { Helmet } from 'react-helmet-async'
import EmailSignup from '../components/EmailSignup'

export default function Home() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS - CAN YOU SEE US?</title>
        <meta name="description" content="CAN YOU SEE US? THE LOST+UNFOUNDS - Revealing findings from the frontier and beyond. Intel from the field on development, AI, and building in the age of information." />
        <meta property="og:title" content="THE LOST+UNFOUNDS - CAN YOU SEE US?" />
        <meta property="og:description" content="Thanks for stopping by. Sign-up for updates and news! Revealing findings from the frontier and beyond." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.thelostandunfounds.com/" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="THE LOST+UNFOUNDS - CAN YOU SEE US?" />
        <meta name="twitter:description" content="Thanks for stopping by. Sign-up for updates and news!" />
      </Helmet>
      <div className="h-screen bg-black flex flex-col overflow-hidden">
        <main className="flex-1 flex flex-col items-center justify-center relative h-full gap-8">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="THE LOST+UNFOUNDS Logo" 
              className="max-w-[570px] h-auto w-full" 
              style={{ 
                maxWidth: 'min(570px, 80vw)',
              }} 
            />
          </div>
          
          {/* Email Signup */}
          <div 
            className="flex flex-col items-center"
            style={{
              width: '100%',
              maxWidth: 'min(500px, 90vw)',
              padding: '0 1rem',
            }}
          >
            <EmailSignup />
            {/* Copy text below subscribe modal */}
            <div style={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              lineHeight: '1.5',
              padding: '0 0.5rem',
              marginTop: '1.5rem',
            }}>
              Thanks for stopping by. Sign-up for updates and news!
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
