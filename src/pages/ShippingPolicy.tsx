/**
 * Shipping & Returns policy for prints and framed prints (fulfilled by Prodigi).
 *
 * The timeline here mirrors how orders actually move: a paid order waits for
 * the payment to clear (see lib/api-handlers/_prodigi-fulfillment.ts), then
 * goes to the print lab. Change both together.
 */

import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const TIMELINE = [
  { step: 'Payment clears', time: '1–3 business days', note: 'Your order is sent to the print lab once your payment has fully cleared. Bitcoin (Lightning) payments clear right away.' },
  { step: 'Printing & framing', time: '2–5 business days', note: 'Every print is made to order. Framed prints sit at the longer end.' },
  { step: 'Shipping — United States', time: '3–7 business days', note: 'Standard tracked shipping.' },
  { step: 'Shipping — Canada, UK, Australia', time: '5–14 business days', note: 'Printed at the lab nearest you where possible.' },
];

export default function ShippingPolicy() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | Shipping & Returns</title>
        <meta name="description" content="Shipping times, handling, and returns for prints and framed prints from THE LOST+UNFOUNDS." />
        <link rel="canonical" href="https://www.thelostandunfounds.com/shipping" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
        <h1 className="text-3xl font-bold text-white mb-4 uppercase">Shipping & Returns</h1>
        <p className="text-white/60 text-sm mb-8">Applies to prints and framed prints. Last updated: October 29, 2026</p>

        <div className="space-y-8 text-white/80">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">How Long It Takes</h2>
            <p className="mb-4">
              Prints are made to order by our print partner. Most orders arrive in <strong className="text-white">1–2 weeks</strong> in
              the US and <strong className="text-white">2–3 weeks</strong> elsewhere. Here is where that time goes:
            </p>
            <div className="flex flex-col gap-2">
              {TIMELINE.map((row) => (
                <div key={row.step} className="bg-white/5 p-4 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4" style={{ borderRadius: 0 }}>
                  <span className="text-white font-bold uppercase tracking-wide text-xs sm:w-56 shrink-0">{row.step}</span>
                  <span className="text-white font-mono text-sm sm:w-40 shrink-0">{row.time}</span>
                  <span className="text-white/60 text-sm">{row.note}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-white/60 text-sm">
              Times are estimates and don't include weekends, holidays, or carrier delays. You'll get a tracking link by email as soon as
              your order ships.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Where We Ship</h2>
            <p>United States, Canada, United Kingdom, and Australia. International orders may owe customs duties or import taxes on arrival; those are set by your country and paid by the recipient.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Changing Your Address</h2>
            <p>
              Email <a href="mailto:support@thelostandunfounds.com" className="text-white underline">support@thelostandunfounds.com</a> right
              away. We can change it until your order goes to the print lab. After that, the order ships to the address you entered at checkout.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Damaged, Defective, or Lost</h2>
            <p>
              If your print arrives damaged or with a printing defect, or never arrives, email us within <strong className="text-white">14 days</strong> of
              delivery (or of the expected delivery date) with your order email and a photo of the problem. We'll send a free replacement or a
              full refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Returns</h2>
            <p>
              Because every print is made to order, we can't take returns or exchanges for a change of mind, wrong size, or wrong frame choice.
              Please check your selection before you pay. Once your order goes to the print lab, it can't be cancelled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">Questions</h2>
            <p>
              Write to <a href="mailto:support@thelostandunfounds.com" className="text-white underline">support@thelostandunfounds.com</a> or
              use the <Link to="/support" className="text-white underline">support page</Link>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
