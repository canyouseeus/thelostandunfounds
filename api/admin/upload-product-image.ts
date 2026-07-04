import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'product-images'
const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']
const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function isAdmin(req: VercelRequest): boolean {
  const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase()
  if (ADMIN_EMAILS.includes(email)) return true
  const host = req.headers.host || ''
  return host.includes('localhost') || host.includes('127.0.0.1')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Product-Id')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Storage configuration error' })
  }

  const productId = req.headers['x-product-id'] as string
  if (!productId || !/^[a-zA-Z0-9-]+$/.test(productId)) {
    return res.status(400).json({ error: 'Invalid product id' })
  }

  const contentType = (req.headers['content-type'] as string || '').split(';')[0].trim()
  const ext = CONTENT_TYPE_EXT[contentType]
  if (!ext) {
    return res.status(400).json({ error: 'Unsupported image type — use JPEG, PNG, or WebP' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some((b) => b.name === BUCKET)
  if (!bucketExists) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5242880, // 5 MB
    })
    if (createErr) {
      console.error('[upload-product-image] Failed to create bucket:', createErr)
      return res.status(500).json({ error: 'Could not create storage bucket' })
    }
  }

  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', resolve)
    req.on('error', reject)
  })
  const buffer = Buffer.concat(chunks)

  if (buffer.length === 0) {
    return res.status(400).json({ error: 'Empty body' })
  }
  if (buffer.length > 5242880) {
    return res.status(400).json({ error: 'Image must be under 5MB' })
  }

  const filename = `${productId}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    console.error('[upload-product-image] Upload error:', uploadError)
    return res.status(500).json({ error: uploadError.message })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return res.status(200).json({ url: urlData.publicUrl })
}
