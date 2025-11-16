/**
 * Products Service
 * Manages custom product listings
 */

import { supabase } from '../lib/supabase'
import type { FourthwallProduct } from './fourthwall'

export interface Product {
  id: string
  title: string
  description?: string
  price: number
  compare_at_price?: number
  currency: string
  image_url?: string
  images: string[]
  handle: string
  available: boolean
  fourthwall_product_id?: string
  fourthwall_url?: string
  created_by?: string
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

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('available', true)
        .order('created_at', { ascending: false })

      if (error) {
        // Don't log RLS or table not found errors as they're expected in some cases
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          return { products: [], error: null }
        }
        throw error
      }

      return { products: (data || []) as Product[], error: null }
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

