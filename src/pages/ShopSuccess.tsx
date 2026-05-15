import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { LoadingOverlay } from '../components/Loading'
import SEOHead from '../components/SEOHead'

interface ShopOrderSummary {
    id: string
    status: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded'
    productKind: 'physical' | 'digital'
    amountTotalCents: number | null
    currency: string | null
    customerEmail: string | null
    priceId: string
    quantity: number
}

export default function ShopSuccess() {
    const [searchParams] = useSearchParams()
    const sessionId = searchParams.get('session_id')
    const [order, setOrder] = useState<ShopOrderSummary | null>(null)
    const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'pending'>('processing')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!sessionId) {
            setError('Missing session_id in URL')
            setStatus('error')
            return
        }

        let cancelled = false
        let attempts = 0
        const maxAttempts = 15 // ~30s at 2s intervals

        async function pollOrder() {
            while (!cancelled && attempts < maxAttempts) {
                attempts++
                try {
                    const response = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId!)}`)
                    if (response.ok) {
                        const data: ShopOrderSummary = await response.json()
                        if (cancelled) return
                        setOrder(data)
                        if (data.status === 'paid') {
                            setStatus('success')
                            return
                        }
                        if (data.status === 'failed' || data.status === 'expired') {
                            setError(`Payment ${data.status}. Please try again.`)
                            setStatus('error')
                            return
                        }
                        // status === 'pending' — keep polling for the webhook.
                        setStatus('pending')
                    } else if (response.status === 404) {
                        // Order row not visible yet — keep waiting.
                        setStatus('pending')
                    } else {
                        const body = await response.json().catch(() => ({}))
                        throw new Error(body.error || `Lookup failed (${response.status})`)
                    }
                } catch (err: any) {
                    if (cancelled) return
                    console.error('shop/success poll error:', err)
                }
                await new Promise(r => setTimeout(r, 2000))
            }
            if (!cancelled && status !== 'success') {
                setError('Payment is still processing. Check your email — we\'ll send confirmation shortly.')
                setStatus('error')
            }
        }

        pollOrder()
        return () => {
            cancelled = true
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId])

    const amountLabel =
        order?.amountTotalCents != null && order?.currency
            ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: order.currency.toUpperCase(),
              }).format(order.amountTotalCents / 100)
            : null

    return (
        <>
            <SEOHead
                title="Order Confirmed"
                description="Your payment has been processed successfully."
                canonicalPath="/shop/success"
                noIndex={true}
            />
            <div className="min-h-screen bg-black flex items-start justify-center px-4 pt-16 pb-12">
                <div className="max-w-md w-full bg-black/50 border border-white/10 p-8 text-center">
                    {status === 'processing' && <LoadingOverlay message="Confirming your order..." />}

                    {status === 'pending' && (
                        <>
                            <LoadingOverlay message="Finalizing payment..." />
                            <p className="text-white/50 text-xs mt-4">
                                This usually takes just a few seconds.
                            </p>
                        </>
                    )}

                    {status === 'success' && order && (
                        <>
                            <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-400" />
                            <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">
                                Order Confirmed
                            </h1>
                            <p className="text-white/70 mb-4">
                                Thank you for your purchase{order.customerEmail ? `, ${order.customerEmail}` : ''}.
                            </p>
                            {amountLabel && (
                                <p className="text-white text-lg font-semibold mb-1">{amountLabel}</p>
                            )}
                            {order.productKind === 'digital' ? (
                                <p className="text-white/60 text-sm mb-6">
                                    A download link has been sent to your email and expires in 72 hours.
                                </p>
                            ) : (
                                <p className="text-white/60 text-sm mb-6">
                                    We'll send a shipping confirmation as soon as your order ships.
                                </p>
                            )}
                            <p className="text-white/40 text-xs font-mono mb-6">Order: {order.id}</p>
                            <Link
                                to="/shop"
                                className="inline-block bg-white text-black px-6 py-2 rounded-none hover:bg-white/90 transition-colors font-semibold uppercase tracking-wide text-sm"
                            >
                                Back to Shop
                            </Link>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-4 text-red-400 text-4xl">✕</div>
                            <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">
                                Payment Issue
                            </h1>
                            <p className="text-white/70 mb-6">
                                {error || 'An error occurred processing your payment.'}
                            </p>
                            <Link
                                to="/shop"
                                className="inline-block bg-white text-black px-6 py-2 rounded-none hover:bg-white/90 transition-colors font-semibold uppercase tracking-wide text-sm"
                            >
                                Return to Shop
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
