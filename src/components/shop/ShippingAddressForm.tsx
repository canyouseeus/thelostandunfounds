export interface ShippingFormValue {
  name: string;
  email: string;
  line1: string;
  line2: string;
  townOrCity: string;
  stateOrCounty: string;
  postalOrZipCode: string;
  countryCode: string;
}

export const EMPTY_SHIPPING_FORM: ShippingFormValue = {
  name: '', email: '', line1: '', line2: '', townOrCity: '', stateOrCounty: '', postalOrZipCode: '', countryCode: 'US',
};

const inputClass =
  'bg-black/60 border border-white px-3 py-2 text-white text-sm placeholder-white/40 rounded-none focus:outline-none focus:ring-1 focus:ring-white/40';

/**
 * Shipping address collection for Bitcoin/Lightning print checkout — Strike
 * has no hosted address-collection step (unlike Stripe Checkout), so this
 * has to be gathered client-side before the invoice is created.
 */
export function ShippingAddressForm({
  value,
  onChange,
}: {
  value: ShippingFormValue;
  onChange: (next: ShippingFormValue) => void;
}) {
  const set = <K extends keyof ShippingFormValue>(key: K, v: ShippingFormValue[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Shipping Address</p>
      <div className="grid grid-cols-2 gap-2">
        <input required placeholder="Full name" value={value.name} onChange={(e) => set('name', e.target.value)} className={`col-span-2 ${inputClass}`} />
        <input required type="email" placeholder="Email" value={value.email} onChange={(e) => set('email', e.target.value)} className={`col-span-2 ${inputClass}`} />
        <input required placeholder="Address line 1" value={value.line1} onChange={(e) => set('line1', e.target.value)} className={`col-span-2 ${inputClass}`} />
        <input placeholder="Address line 2 (optional)" value={value.line2} onChange={(e) => set('line2', e.target.value)} className={`col-span-2 ${inputClass}`} />
        <input required placeholder="City" value={value.townOrCity} onChange={(e) => set('townOrCity', e.target.value)} className={inputClass} />
        <input placeholder="State / county" value={value.stateOrCounty} onChange={(e) => set('stateOrCounty', e.target.value)} className={inputClass} />
        <input required placeholder="Postal code" value={value.postalOrZipCode} onChange={(e) => set('postalOrZipCode', e.target.value)} className={inputClass} />
        <select required value={value.countryCode} onChange={(e) => set('countryCode', e.target.value)} className={inputClass}>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="AU">Australia</option>
        </select>
      </div>
    </div>
  );
}

export function isShippingFormComplete(value: ShippingFormValue): boolean {
  return !!(value.name && value.email && value.line1 && value.townOrCity && value.postalOrZipCode && value.countryCode);
}
