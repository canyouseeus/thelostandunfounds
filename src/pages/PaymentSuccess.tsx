import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { LoadingOverlay } from '../components/Loading'
import SEOHead from '../components/SEOHead'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success'>('processing')

  const librarySlug = searchParams.get('library')
  const redirectPath = librarySlug ? `/gallery/${librarySlug}` : '/shop'

  useEffect(() => {
    // This page only handled PayPal return redirects, which are no longer created.
    // Any visitor here is following a stale link, so send them on to the gallery.
    setStatus('success')
    setTimeout(() => navigate(redirectPath), 2000)
  }, [searchParams, navigate, redirectPath])

  return (
    <>
      <SEOHead
        title="Payment Successful"
        description="Your payment has been processed successfully."
        canonicalPath="/payment/success"
        noIndex={true}
      />
    <div className="min-h-screen bg-black flex items-start justify-center px-4 pt-16 pb-12">
      <div className="max-w-md w-full bg-black/50 border border-white/10 rounded-none p-8 text-center">
        {status === 'processing' && (
          <>
            <LoadingOverlay message="Processing payment..." />
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-white/70 mb-4">Thank you for your purchase.</p>
            <p className="text-white/50 text-sm">Redirecting to gallery...</p>
          </>
        )}
      </div>
    </div>
    </>
  )
}
