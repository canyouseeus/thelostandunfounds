import { Helmet } from 'react-helmet-async'

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
      <div className="h-screen bg-black flex flex-col overflow-hidden" style={{ position: 'relative' }}>
        <div 
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 99999,
            pointerEvents: 'none',
            isolation: 'isolate',
          }}
        >
          <img 
            src="/logo.png" 
            alt="THE LOST+UNFOUNDS Logo" 
            style={{ 
              maxWidth: 'min(570px, 80vw)',
              width: 'auto',
              height: 'auto',
              opacity: 1,
              filter: 'none !important',
              mixBlendMode: 'normal',
              display: 'block',
            }} 
          />
        </div>
      </div>
    </>
  )
}
