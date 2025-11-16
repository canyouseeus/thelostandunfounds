/**
 * Products Service
 * Manages custom product listings
 */

import { supabase } from '../lib/supabase'
import type { FourthwallProduct } from './fourthwall'

export interface Product {
  id: string
  title: string // Maps to 'name' in database
  description?: string
  price: number
  compare_at_price?: number
  currency?: string // Not in database schema, defaults to USD
  image_url?: string
  images: string[]
  handle: string // Maps to 'slug' in database
  available: boolean // Maps to status === 'active' in database
  fourthwall_product_id?: string // Not in database schema
  fourthwall_url?: string // Not in database schema
  created_by?: string // Not in database schema
  created_at?: string
  updated_at?: string
}

export interface CreateProductInput {
  title: string
  description?: string
  price: number
  compare_at_price?: number
  currency?: string
  image_url?: string
  images?: string[]
  handle: string
  fourthwall_product_id?: string
  fourthwall_url?: string
  available?: boolean
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string
}

class ProductsService {
  /**
   * Get all available products
   */
  async getProducts(): Promise<{ products: Product[]; error: Error | null }> {
    try {
      if (!supabase) {
        // Don't log as error - Supabase might not be configured
        return { products: [], error: null }
      }

      // Map database schema (name, slug, status) to service interface (title, handle, available)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active') // Database uses 'status' field, not 'available'
        .order('created_at', { ascending: false })

      if (error) {
        // Don't log RLS or table not found errors as they're expected in some cases
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          return { products: [], error: null }
        }
        throw error
      }

      // Map database schema to service interface
      const products = (data || []).map((dbProduct: any) => ({
        id: dbProduct.id,
        title: dbProduct.name || dbProduct.title || '',
        description: dbProduct.description,
        price: parseFloat(dbProduct.price) || 0,
        compare_at_price: dbProduct.compare_at_price ? parseFloat(dbProduct.compare_at_price) : undefined,
        currency: 'USD', // Default currency
        image_url: dbProduct.images?.[0],
        images: dbProduct.images || [],
        handle: dbProduct.slug || dbProduct.handle || '',
        available: dbProduct.status === 'active',
        fourthwall_product_id: dbProduct.fourthwall_product_id,
        fourthwall_url: dbProduct.fourthwall_url,
        created_by: dbProduct.created_by,
        created_at: dbProduct.created_at,
        updated_at: dbProduct.updated_at,
      })) as Product[]

      return { products, error: null }
    } catch (error) {
      // Only log unexpected errors
      const err = error as Error
      if (!err.message?.includes('does not exist') && !err.message?.includes('permission denied')) {
        console.error('Error fetching products:', error)
      }
      return { products: [], error: err }
    }
  }

  /**
   * Get all products (including unavailable) - for admin
   */
  async getAllProducts(): Promise<{ products: Product[]; error: Error | null }> {
    try {
      if (!supabase) {
        return { products: [], error: new Error('Supabase client not initialized') }
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return { products: (data || []) as Product[], error: null }
    } catch (error) {
      console.error('Error fetching all products:', error)
      return { products: [], error: error as Error }
    }
  }

  /**
   * Create a new product
   */
  async createProduct(input: CreateProductInput): Promise<{ product: Product | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { product: null, error: new Error('Supabase client not initialized') }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Authentication required')
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          ...input,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      return { product: data as Product, error: null }
    } catch (error) {
      console.error('Error creating product:', error)
      return { product: null, error: error as Error }
    }
  }

  /**
   * Update a product
   */
  async updateProduct(input: UpdateProductInput): Promise<{ product: Product | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { product: null, error: new Error('Supabase client not initialized') }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Authentication required')
      }

      const { id, ...updates } = input

      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return { product: data as Product, error: null }
    } catch (error) {
      console.error('Error updating product:', error)
      return { product: null, error: error as Error }
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase client not initialized') }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Authentication required')
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { error: null }
    } catch (error) {
      console.error('Error deleting product:', error)
      return { error: error as Error }
    }
  }

  /**
   * Generate a URL-friendly handle from title
   */
  generateHandle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * Convert Fourthwall product to local product format
   */
  convertFromFourthwall(fwProduct: FourthwallProduct): CreateProductInput {
    return {
      title: fwProduct.title,
      description: fwProduct.description,
      price: fwProduct.price,
      compare_at_price: fwProduct.compareAtPrice,
      currency: fwProduct.currency,
      images: fwProduct.images,
      image_url: fwProduct.images?.[0],
      handle: fwProduct.handle,
      fourthwall_product_id: fwProduct.id,
      fourthwall_url: fwProduct.url,
      available: fwProduct.available,
    }
  }
}

export const productsService = new ProductsService()

