import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string | null>(null)

  const librarySlug = searchParams.get('library')
  const redirectPath = librarySlug ? `/gallery/${librarySlug}` : '/shop'

  useEffect(() => {
    const orderId =
      searchParams.get('token') ||
      searchParams.get('orderId') ||
      searchParams.get('order_id') ||
      searchParams.get('PayerID') ||
      searchParams.get('payer_id')

    const allParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      allParams[key] = value
    })
    console.log('🔍 Payment success page - URL params:', JSON.stringify(allParams, null, 2))

    if (!orderId) {
      console.warn('⚠️ No order ID found in URL params. Showing success anyway.')
      setStatus('success')
      setTimeout(() => navigate(redirectPath), 3000)
      return
    }

    console.log('✅ Payment approved, order ID:', orderId)

    async function captureOrder() {
      try {
        console.log('📥 Calling capture endpoint for order:', orderId)
        const response = await fetch('/api/gallery/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Capture error:', errorData);
          const details = errorData.details?.message || errorData.error || 'Failed to finalize payment.';
          setError(details);
          setStatus('error');
          return;
        }

        const data = await response.json();
        console.log('✅ Payment captured:', data);
        setStatus('success');

        // Wait 2 seconds before redirecting to allow user to see success
        setTimeout(() => navigate(redirectPath), 2000);
      } catch (err: any) {
        console.error('Error capturing payment:', err);
        setError('A network error occurred while finalizing your payment.');
        setStatus('error');
      }
    }

    captureOrder()
  }, [searchParams, navigate, redirectPath])

  return (
    <div className="min-h-screen bg-black flex items-start justify-center px-4 pt-16 pb-12">
      <div className="max-w-md w-full bg-black/50 border border-white/10 rounded-none p-8 text-center">
        {status === 'processing' && (
          <>
            <ArrowPathIcon className="w-16 h-16 animate-spin mx-auto mb-4 text-white" />
            <h1 className="text-2xl font-bold text-white mb-2">Processing Payment...</h1>
            <p className="text-white/70">Please wait while we confirm your payment.</p>
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

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 text-red-400">✕</div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Error</h1>
            <p className="text-white/70 mb-4">{error || 'An error occurred processing your payment.'}</p>
            <button
              onClick={() => navigate(redirectPath)}
              className="bg-white text-black px-6 py-2 rounded-none hover:bg-white/90 transition-colors font-semibold"
            >
              Return to Gallery
            </button>
          </>
        )}
      </div>
    </div>
  )
}
