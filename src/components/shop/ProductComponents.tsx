import React from 'react';
import { ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Product } from '../../types/shop';
import { getPayPalCheckoutUrl } from '../../utils/checkout-utils';
import { trackAffiliateClick, getAffiliateRef } from '../../utils/affiliate-tracking';

interface ProductCardProps {
    product: Product;
    onOpen: (product: Product) => void;
}

export function ProductCard({ product, onOpen }: ProductCardProps) {
    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
    const affiliateRef = getAffiliateRef();

    return (
        <div
            className="bg-black border border-white/10 hover:border-white transition-all duration-300 h-full cursor-pointer flex flex-col group overflow-hidden"
            onClick={() => onOpen(product)}
            role="button"
            tabIndex={0}
        >
            {imageUrl && (
                <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
                    <img
                        src={imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.featured && (
                            <span className="bg-white text-black text-[10px] font-black px-2 py-0.5 uppercase tracking-widest">
                                Featured
                            </span>
                        )}
                        {product.category && (
                            <span className="bg-black/80 text-white border border-white/20 text-[10px] px-2 py-0.5 uppercase tracking-widest">
                                {product.category}
                            </span>
                        )}
                    </div>
                </div>
            )}
            <div className="p-4 flex flex-col flex-1 gap-2">
                <h3 className="text-white font-bold text-lg leading-tight group-hover:underline underline-offset-4 decoration-1">
                    {product.title}
                </h3>
                <div className="mt-auto pt-2 flex items-baseline gap-2">
                    <span className="text-white font-black text-xl">
                        {product.price === 0 ? 'FREE' : `$${product.price.toFixed(2)}`}
                    </span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-white/40 line-through text-xs">
                            ${product.compareAtPrice.toFixed(2)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

interface ProductModalProps {
    product: Product;
    onClose: () => void;
}

export function ProductModal({ product, onClose }: ProductModalProps) {
    const imageUrl = product.images?.[0];
    const isFourthwallProduct = product.url?.includes('fourthwall.com');
    const affiliateRef = getAffiliateRef();

    const handleCheckout = async () => {
        if (isFourthwallProduct && product.url) {
            window.location.href = product.url;
            return;
        }

        if (affiliateRef) {
            trackAffiliateClick(affiliateRef);
        }

        try {
            const { approvalUrl } = await getPayPalCheckoutUrl({
                amount: product.price,
                currency: product.currency || 'USD',
                description: product.title,
                productId: product.id,
                affiliateRef,
            });
            window.location.href = approvalUrl;
        } catch (error: any) {
            alert(`Checkout failed: ${error.message}`);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-black/50 max-w-4xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col md:flex-row shadow-2xl shadow-white/5 rounded-none">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-white hover:bg-white hover:text-black transition-colors p-1"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {imageUrl && (
                    <div className="md:w-1/2 bg-white/5 flex items-center justify-center overflow-hidden">
                        <img src={imageUrl} alt={product.title} className="w-full h-full object-contain" />
                    </div>
                )}

                <div className="md:w-1/2 p-8 flex flex-col gap-6 overflow-y-auto">
                    <div className="space-y-2">
                        <span className="text-white/40 text-xs font-black uppercase tracking-[0.2em]">
                            {product.category || 'NOIR COLLECTION'}
                        </span>
                        <h2 className="text-3xl font-black text-white leading-tight uppercase">
                            {product.title}
                        </h2>
                    </div>

                    <div className="text-3xl font-black text-white">
                        {product.price === 0 ? 'FREE' : `$${product.price.toFixed(2)}`}
                    </div>

                    <p className="text-white/70 leading-relaxed text-sm">
                        {product.description}
                    </p>

                    <button
                        onClick={handleCheckout}
                        className="w-full bg-white text-black font-black py-4 uppercase tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-3"
                    >
                        <ShoppingCartIcon className="w-5 h-5" />
                        {isFourthwallProduct ? 'View External' : 'Secure Checkout'}
                    </button>

                    {!product.available && (
                        <p className="text-red-500 font-bold uppercase text-xs text-center border border-red-500/20 py-2">
                            Currently Unavailable
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
