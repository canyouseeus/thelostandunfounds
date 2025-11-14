/**
 * Product Manager Component
 * Allows admins to create, edit, and delete products
 */

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ShoppingBag, X, ExternalLink } from 'lucide-react'
import { productsService, type Product, type CreateProductInput } from '../../services/products'
import { fourthwallService } from '../../services/fourthwall'
import { useToast } from '../Toast'
import { LoadingSpinner } from '../Loading'

export default function ProductManager() {
  const { success, error: showError } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [importingFromFourthwall, setImportingFromFourthwall] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const { products: fetchedProducts, error } = await productsService.getAllProducts()
    if (error) {
      showError('Failed to load products')
    } else {
      setProducts(fetchedProducts)
    }
    setLoading(false)
  }

  const handleCreate = () => {
    setEditingProduct(null)
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    const { error } = await productsService.deleteProduct(id)
    if (error) {
      showError('Failed to delete product')
    } else {
      success('Product deleted successfully')
      loadProducts()
    }
  }

  const handleImportFromFourthwall = async () => {
    setImportingFromFourthwall(true)
    try {
      const { products: fwProducts, error } = await fourthwallService.getProducts()
      if (error) {
        showError('Failed to fetch products from Fourthwall')
        return
      }

      if (fwProducts.length === 0) {
        showError('No products found on Fourthwall')
        return
      }

      // Import first product as example (user can import more manually)
      const fwProduct = fwProducts[0]
      const productInput = productsService.convertFromFourthwall(fwProduct)
      
      // Generate handle if not present
      if (!productInput.handle) {
        productInput.handle = productsService.generateHandle(productInput.title)
      }

      const { product, error: createError } = await productsService.createProduct(productInput)
      if (createError) {
        showError('Failed to import product')
      } else {
        success(`Imported "${productInput.title}" from Fourthwall`)
        loadProducts()
      }
    } catch (err) {
      showError('Failed to import from Fourthwall')
    } finally {
      setImportingFromFourthwall(false)
    }
  }

  const handleSubmit = async (formData: CreateProductInput) => {
    if (editingProduct) {
      const { error } = await productsService.updateProduct({
        id: editingProduct.id,
        ...formData,
      })
      if (error) {
        showError('Failed to update product')
      } else {
        success('Product updated successfully')
        setShowForm(false)
        setEditingProduct(null)
        loadProducts()
      }
    } else {
      const { error } = await productsService.createProduct(formData)
      if (error) {
        showError('Failed to create product')
      } else {
        success('Product created successfully')
        setShowForm(false)
        loadProducts()
      }
    }
  }

  return (
    <div className="bg-black border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Product Management
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleImportFromFourthwall}
            disabled={importingFromFourthwall}
            className="px-3 py-1.5 text-sm bg-black border border-white/10 text-white rounded-lg hover:border-white/30 transition disabled:opacity-50 flex items-center gap-2"
          >
            {importingFromFourthwall ? (
              <LoadingSpinner size="sm" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Import from Fourthwall
          </button>
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 text-sm bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingProduct(null)
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingBag className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">No products yet</p>
          <p className="text-white/40 text-sm mt-1">Create your first product to get started</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {products.map((product) => (
            <ProductItem
              key={product.id}
              product={product}
              onEdit={() => handleEdit(product)}
              onDelete={() => handleDelete(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductItem({
  product,
  onEdit,
  onDelete,
}: {
  product: Product
  onEdit: () => void
  onDelete: () => void
}) {
  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  return (
    <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/20 transition flex items-center gap-4">
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.title}
          className="w-16 h-16 object-cover rounded border border-white/10"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold truncate">{product.title}</h3>
        <p className="text-white/60 text-sm truncate">{product.description || 'No description'}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-white font-medium">{formatPrice(product.price, product.currency)}</span>
          {product.compare_at_price && (
            <span className="text-white/40 text-sm line-through">
              {formatPrice(product.compare_at_price, product.currency)}
            </span>
          )}
          {!product.available && (
            <span className="text-red-400 text-xs">(Unavailable)</span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="p-2 bg-black border border-white/10 rounded hover:border-white/30 transition"
          title="Edit product"
        >
          <Edit2 className="w-4 h-4 text-white/70" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 bg-black border border-red-500/30 rounded hover:border-red-500/50 transition"
          title="Delete product"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  )
}

function ProductForm({
  product,
  onSubmit,
  onCancel,
}: {
  product: Product | null
  onSubmit: (data: CreateProductInput) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<CreateProductInput>({
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price || 0,
    compare_at_price: product?.compare_at_price,
    currency: product?.currency || 'USD',
    image_url: product?.image_url || '',
    images: product?.images || [],
    handle: product?.handle || '',
    available: product?.available !== false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Generate handle from title if not provided
    if (!formData.handle && formData.title) {
      formData.handle = productsService.generateHandle(formData.title)
    }

    if (!formData.title || !formData.price || !formData.handle) {
      alert('Please fill in all required fields')
      return
    }

    onSubmit(formData)
  }

  return (
    <div className="bg-black border border-white/20 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {product ? 'Edit Product' : 'New Product'}
        </h3>
        <button
          onClick={onCancel}
          className="text-white/60 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            placeholder="Product title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            placeholder="Product description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Price *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Compare At Price
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.compare_at_price || ''}
              onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white focus:outline-none focus:border-white/30"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Handle (URL slug) *
            </label>
            <input
              type="text"
              value={formData.handle}
              onChange={(e) => setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              placeholder="product-handle"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Image URL
          </label>
          <input
            type="url"
            value={formData.image_url || ''}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="available"
            checked={formData.available}
            onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
            className="w-4 h-4 rounded border-white/20 bg-black text-white"
          />
          <label htmlFor="available" className="text-sm text-white/80">
            Product is available
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
          >
            {product ? 'Update Product' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-black border border-white/10 text-white font-semibold rounded-lg hover:border-white/30 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
