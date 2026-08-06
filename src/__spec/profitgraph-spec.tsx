import { createRoot } from 'react-dom/client'
import '../index.css'
import ProfitGraph from '../components/admin/ProfitGraph'

createRoot(document.getElementById('root')!).render(
  <div className="bg-black p-6" style={{ width: 760 }}>
    <ProfitGraph />
  </div>
)
