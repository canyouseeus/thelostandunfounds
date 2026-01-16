export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    currency: string;
    images: string[];
    handle: string;
    available: boolean;
    url: string;
    category?: string;
    featured?: boolean;
}

export interface CheckoutParams {
    amount: number;
    currency: string;
    description: string;
    productId: string;
    affiliateRef: string | null;
}

export interface CheckoutResponse {
    approvalUrl: string;
}
