/**
 * The canonical gallery photo.
 *
 * This exists because `PhotoGallery.tsx` and `PhotoLightbox.tsx` each declared
 * their own `interface Photo`, and the two disagreed about `metadata` — the
 * gallery typed it as camera EXIF, the lightbox as `{ width, height }`. The
 * gallery then passed its photo into the lightbox's prop and TypeScript
 * rejected it with "two different types with this name exist, but they are
 * unrelated". Casting between them would have compiled and hidden the fact
 * that two components genuinely disagreed about the same database column.
 *
 * They were both right and both partial. `photos.metadata` is a single jsonb
 * column that carries whatever the ingest wrote: EXIF from the camera, and
 * pixel dimensions. So the canonical type is the union of what the consumers
 * actually read, with the index signature kept because the column really is
 * open-ended.
 *
 * `MapPhoto` in `PhotoMap.tsx` is deliberately NOT merged into this. That is a
 * different query shape on purpose: it selects flat `metadata->>` aliases
 * rather than the whole JSONB, to keep egress down. Merging them would undo
 * that decision.
 */
export interface PhotoMetadata {
    camera_make?: string;
    camera_model?: string;
    /** Some ingest paths wrote camelCase; the gallery reads both spellings. */
    cameraMake?: string;
    cameraModel?: string;
    iso?: number;
    focal_length?: number;
    aperture?: number;
    shutter_speed?: number;
    date_taken?: string;
    time?: string;
    copyright?: string;
    /** Read by the lightbox to size the image before it loads. */
    width?: number;
    height?: number;
    [key: string]: any;
}

export interface Photo {
    id: string;
    title: string;
    thumbnail_url: string;
    google_drive_file_id: string;
    mime_type?: string | null;
    created_at: string;
    price?: number;
    library_id: string;
    metadata?: PhotoMetadata | null;
}
