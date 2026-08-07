/**
 * Gallery checkout tray spec.
 *
 * Renders the real SelectionTray at phone width, because the tray only appears
 * once photos are selected and a local gallery has no photos to select — so
 * every claim about how it reads had to be made from source rather than pixels.
 * This puts pixels on it: the amount is green, and the three stacked
 * micro-captions that made it look disorganised are gone.
 *
 * Two selection sizes, so the singular/plural label and a wider amount both get
 * looked at rather than assumed.
 */
import { createRoot } from 'react-dom/client'
import '../index.css'
import SelectionTray from '../components/photos/SelectionTray'

const photo = (id: string) => ({
  id,
  title: `Photo ${id}`,
  thumbnail_url: '',
  google_drive_file_id: `drive-${id}`,
})

function Case({ label, count, total }: { label: string; count: number; total: number }) {
  return (
    <div className="mb-8">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-4 py-2">{label}</p>
      {/* The tray is fixed bottom-0 in situ; pinned relative here so both cases
          are visible in one shot instead of stacking on top of each other. */}
      <div className="relative h-32 overflow-hidden [&>div]:!absolute [&>div]:!bottom-0">
        <SelectionTray
          selectedPhotos={Array.from({ length: count }, (_, i) => photo(String(i)))}
          onRemove={() => {}}
          onCheckout={() => {}}
          totalAmount={total}
        />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <div className="bg-black min-h-screen pt-8">
    <Case label="One photo" count={1} total={10} />
    <Case label="Seven photos" count={7} total={62.5} />
    <Case label="Loading (checkout in flight)" count={3} total={30} />
  </div>
)
