/**
 * Shared photo types.
 *
 * PhotoGallery and PhotoLightbox previously each declared a local `interface
 * Photo` whose `metadata` shapes had drifted apart — one EXIF-shaped, the other
 * width/height — so passing a photo between them was a type error ("two
 * different types with this name exist"). One definition avoids the drift.
 */

/** EXIF and dimension metadata, as stored in the photos.metadata JSONB column. */
export interface PhotoMetadata {
    width?: number
    height?: number
    camera_make?: string
    camera_model?: string
    iso?: number
    focal_length?: number
    aperture?: number
    shutter_speed?: number
    date_taken?: string
    time?: string
    copyright?: string
    [key: string]: any
}

export interface Photo {
    id: string
    title: string
    thumbnail_url: string
    google_drive_file_id: string
    created_at: string
    library_id: string
    price?: number
    metadata?: PhotoMetadata | null
}
