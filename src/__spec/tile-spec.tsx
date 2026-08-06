/**
 * Tile-fill and hover spec.
 *
 * Renders the real EditableTile / DashboardCategoryCard / DashboardTile chain
 * on the same lattice the dashboard uses, next to a drawn widget (the
 * calculator) for comparison. Exists to answer three questions with pixels
 * rather than reasoning:
 *
 *  1. does a legacy DashboardTile fill its grid cell, like the drawn ones?
 *  2. is there exactly one hover wash over a data tile, not two stacked?
 *  3. do the tools stay unwashed on hover, so only their own keys light?
 */
import { createRoot } from 'react-dom/client'
import '../index.css'
import { EditableTile } from '../components/admin/EditableTile'
import { DashboardCategoryCard } from '../components/admin/DashboardCategoryCard'
import { CalculatorCard } from '../components/admin/CalculatorCard'
import { FitBox } from '../components/ui/fit-box'
import { ShapeName } from '../components/admin/useDashboardLayout'
import { BanknotesIcon } from '@heroicons/react/24/outline'

const TOOL_WIDGETS = new Set(['clock', 'calendar', 'calculator'])

const SPAN: Record<string, string> = {
  '2x2': 'col-span-2 row-span-2',
  '4x2': 'col-span-4 row-span-2',
}

function Cell({ id, size, children }: { id: string; size: ShapeName; children: React.ReactNode }) {
  return (
    <EditableTile
      id={id}
      className={SPAN[size]}
      editing={false}
      shape={size}
      onSetShape={() => {}}
      onDropBefore={() => {}}
      light={false}
      onToggleBackground={() => {}}
      wash={!TOOL_WIDGETS.has(id)}
    >
      {children}
    </EditableTile>
  )
}

function Board() {
  return (
    <div style={{ width: 1128 + 24, padding: 12 }} className="bg-black">
      <style>{`
        #lattice {
          --lattice-gap: 24px;
          --lattice-cols: 8;
          --lattice-unit: calc((100cqw - (var(--lattice-cols) - 1) * var(--lattice-gap)) / var(--lattice-cols));
          grid-auto-rows: var(--lattice-unit);
        }
        /* A red backstop behind every cell. Any red showing through is a tile
           that failed to fill its cell — the check can fail, visibly. */
        #lattice > * { background: #f00; }
      `}</style>
      <div style={{ containerType: 'inline-size' }}>
        <div id="lattice" className="grid grid-cols-8 gap-6 [grid-auto-flow:dense]">
          {/* Legacy DashboardTile path — the one that sat short. */}
          <Cell id="legacy-a" size="2x2">
            <DashboardCategoryCard
              size="2x2"
              icon={<BanknotesIcon className="w-4 h-4" />}
              title="Revenue"
              primary="$717"
              caption="all sources"
              content={null}
            />
          </Cell>
          <Cell id="legacy-b" size="4x2">
            <DashboardCategoryCard
              size="4x2"
              icon={<BanknotesIcon className="w-4 h-4" />}
              title="Bookings"
              primary="12"
              caption="this month"
              content={null}
            />
          </Cell>
          {/* A drawn widget, for comparison: this one always filled. */}
          <Cell id="calculator" size="2x2">
            <FitBox base={440} className="h-full">
              <CalculatorCard wide className="w-full h-full" />
            </FitBox>
          </Cell>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Board />)
