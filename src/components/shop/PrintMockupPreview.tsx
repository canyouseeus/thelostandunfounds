/**
 * Composites a print's artwork onto a lifestyle mockup template (e.g. a
 * framed print on a wall) using admin-configured percentage bounds for
 * where the art sits within the template image. Prodigi's API has no
 * mockup-rendering endpoint, so this is done client-side with plain CSS
 * absolute positioning — no canvas needed since mockup templates are shot
 * straight-on (no perspective warp to correct for).
 *
 * Falls back to just showing the artwork when no template is configured.
 */
export interface MockupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function PrintMockupPreview({
  artworkUrl,
  templateUrl,
  bounds,
  alt,
  className,
}: {
  artworkUrl: string | null;
  templateUrl?: string | null;
  bounds?: MockupBounds | null;
  alt?: string;
  className?: string;
}) {
  if (!artworkUrl) {
    return <div className={className || 'w-full h-full bg-white/5'} />;
  }

  if (!templateUrl || !bounds) {
    return (
      <img
        src={artworkUrl}
        alt={alt || 'Print preview'}
        className={className || 'w-full h-full object-contain'}
      />
    );
  }

  return (
    <div className={className || 'relative w-full h-full'}>
      <img src={templateUrl} alt={alt || 'Mockup'} className="w-full h-full object-cover" />
      <div
        className="absolute overflow-hidden"
        style={{
          left: `${bounds.x}%`,
          top: `${bounds.y}%`,
          width: `${bounds.width}%`,
          height: `${bounds.height}%`,
        }}
      >
        <img src={artworkUrl} alt={alt || 'Artwork'} className="w-full h-full object-cover" />
      </div>
    </div>
  );
}
