import { Helmet } from 'react-helmet-async'
import EmailSignup from '../components/EmailSignup'

export default function Home() {
  const text = "CAN YOU SEE US?"

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
      <div className="min-h-screen bg-black text-white flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-xl w-full text-center space-y-6">
            <img
              src="/logo.png"
              alt="THE LOST+UNFOUNDS Logo"
              className="mx-auto w-48 h-auto"
            />
            <h1 className="text-3xl sm:text-4xl font-bold">{text}</h1>
            <p className="text-white/70">
              Thanks for stopping by. Sign-up for updates and news!
            </p>
            <EmailSignup />
          </div>
        </main>
      </div>
    </>
  )
}
