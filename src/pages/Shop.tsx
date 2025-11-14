import { ShoppingBag, Star, Check } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image?: string
  featured?: boolean
}

const products: Product[] = [
  {
    id: '1',
    name: 'Premium Access',
    description: 'Unlimited access to all premium tools and features',
    price: 9.99,
    featured: true,
  },
  {
    id: '2',
    name: 'Pro Membership',
    description: 'Everything in Premium plus API access and priority support',
    price: 19.99,
    featured: true,
  },
  {
    id: '3',
    name: 'Custom Tool Development',
    description: 'Have us build a custom tool tailored to your needs',
    price: 99.99,
  },
]

export default function Shop() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">
          Shop
        </h1>
        <p className="text-xl text-white/80">
          Discover our premium products and services
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className={`group relative bg-black border rounded-lg p-6 hover:border-white/30 transition-all duration-300 ${
              product.featured
                ? 'border-yellow-400/50 lg:col-span-1'
                : 'border-white/10'
            }`}
          >
            {product.featured && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  FEATURED
                </span>
              </div>
            )}
            
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white mb-2">
                {product.name}
              </h2>
              <p className="text-white/70 text-sm leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">
                  ${product.price}
                </span>
                {product.id !== '3' && (
                  <span className="text-white/60 text-sm">/month</span>
                )}
              </div>
            </div>

            <button
              className="w-full px-4 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-105"
              onClick={() => {
                // Handle purchase logic here
                console.log(`Purchase: ${product.name}`)
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              Purchase Now
            </button>

            {product.featured && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>Unlimited access</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>Priority support</span>
                  </div>
                  {product.id === '2' && (
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>API access</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-white/60 text-sm">
          All purchases are processed securely. Need help?{' '}
          <a href="/settings" className="text-white hover:text-white/80 underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  )
}
