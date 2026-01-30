import { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { AdminBentoCard } from '../ui/admin-bento-card';

interface PayoutRecord {
    id: string;
    date_requested: string;
    date_paid: string | null;
    amount: number;
    status: string;
    method: string;
    transaction_id: string | null;
    notes: string | null;
    error: string | null;
}

interface PayoutHistoryTableProps {
    affiliateId: string;
}

export default function PayoutHistoryTable({ affiliateId }: PayoutHistoryTableProps) {
    const [history, setHistory] = useState<PayoutRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReceipt, setSelectedReceipt] = useState<PayoutRecord | null>(null);

    useEffect(() => {
        async function fetchHistory() {
            if (!affiliateId) return;
            try {
                const res = await fetch(`/api/affiliates/payout-history?affiliate_id=${affiliateId}`);
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    setHistory(data.data);
                }
            } catch (e) {
                console.error('Failed to fetch payout history', e);
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, [affiliateId]);

    const handlePrintReceipt = (record: PayoutRecord) => {
        const printWindow = window.open('', '_blank', 'width=600,height=800');
        if (!printWindow) return;

        printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${record.id.slice(0, 8)}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #000; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .title { font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .label { font-weight: bold; color: #666; }
            .total { font-size: 24px; font-weight: bold; margin-top: 30px; text-align: right; }
            .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">THE LOST+UNFOUNDS</div>
            <div class="title">Payout Receipt</div>
          </div>
          
          <div class="content">
            <div class="row">
              <span class="label">Date Paid:</span>
              <span>${record.date_paid ? new Date(record.date_paid).toLocaleDateString() : 'Pending'}</span>
            </div>
            <div class="row">
              <span class="label">Transaction ID:</span>
              <span>${record.transaction_id || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Method:</span>
              <span>${record.method}</span>
            </div>
            <div class="row">
              <span class="label">Status:</span>
              <span>${record.status.toUpperCase()}</span>
            </div>
             <div class="row">
              <span class="label">Recipient ID:</span>
              <span>${affiliateId}</span>
            </div>
          </div>

          <div class="total">
            Total: $${record.amount.toFixed(2)}
          </div>

          <div class="footer">
            Thank you for being a partner.<br>
            The Lost+Unfounds
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    if (loading) return <div className="text-white/40 text-sm animate-pulse">Loading history...</div>;

    return (
        <AdminBentoCard title="Payout History" colSpan={12} className="min-h-[300px]">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-white/40 text-[10px] uppercase tracking-widest">
                            <th className="py-3 px-4">Date Requested</th>
                            <th className="py-3 px-4">Date Paid</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Method</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Receipt</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-white/40">No payouts found.</td>
                            </tr>
                        ) : (
                            history.map((record) => (
                                <tr key={record.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-4 px-4 text-white/80">{new Date(record.date_requested).toLocaleDateString()}</td>
                                    <td className="py-4 px-4 text-white/60">
                                        {record.date_paid ? new Date(record.date_paid).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-4 px-4 font-bold text-white">${record.amount.toFixed(2)}</td>
                                    <td className="py-4 px-4 text-white/60">{record.method}</td>
                                    <td className="py-4 px-4">
                                        <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm ${record.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                                record.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        {record.status === 'paid' && (
                                            <button
                                                onClick={() => handlePrintReceipt(record)}
                                                className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors uppercase font-bold tracking-wider"
                                            >
                                                <PrinterIcon className="w-4 h-4" />
                                                <span>Print</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </AdminBentoCard>
    );
}
