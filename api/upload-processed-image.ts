import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'product-images-transparent'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Storage configuration error' })
    }

    const filename = req.headers['x-filename'] as string
    if (!filename || !/^[a-zA-Z0-9]+\.png$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Ensure the bucket exists (idempotent)
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === BUCKET)
    if (!bucketExists) {
        const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
            public: true,
            fileSizeLimit: 10485760, // 10 MB
        })
        if (createErr) {
            console.error('[upload-processed-image] Failed to create bucket:', createErr)
            return res.status(500).json({ error: 'Could not create storage bucket' })
        }
    }

    // Collect the raw body (PNG blob sent as application/octet-stream)
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

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filename, buffer, {
            contentType: 'image/png',
            upsert: false,
        })

    if (uploadError) {
        // If it already exists that's fine — just return the public URL
        if (!uploadError.message.includes('already exists') && !uploadError.message.includes('duplicate')) {
            console.error('[upload-processed-image] Upload error:', uploadError)
            return res.status(500).json({ error: uploadError.message })
        }
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    return res.status(200).json({ url: urlData.publicUrl })
}
