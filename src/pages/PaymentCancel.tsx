import { useNavigate } from 'react-router-dom'
import { XCircleIcon } from '@heroicons/react/24/outline'

export default function PaymentCancel() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black flex items-start justify-center px-4 pt-16 pb-12">
      <div className="max-w-md w-full bg-black/50 border border-white/10 rounded-none p-8 text-center">
        <XCircleIcon className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
        <h1 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h1>
        <p className="text-white/70 mb-6">Your payment was cancelled. No charges were made.</p>
        <button
          onClick={() => navigate('/shop')}
          className="bg-white text-black px-6 py-2 rounded-none hover:bg-white/90 transition-colors font-semibold"
        >
          Return to Shop
        </button>
      </div>
    </div>
  )
}
