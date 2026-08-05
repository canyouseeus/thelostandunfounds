/**
 * DEMO MODE — the walkthrough form.
 *
 * The whole signup, end to end, with real validation and the real submitting
 * state. The only thing swapped out is the single step where a live form would
 * write: instead you are shown the payload and the table it would have hit, and
 * the form resets to the beginning either way.
 *
 * Required fields really are required — a demo form that accepts anything
 * teaches the wrong thing about the form.
 */

import { cn } from '../../components/ui/utils';
import { useDemoForm } from '../../lib/demo/useDemoForm';
import { DEMO_SIGNUP_FIELDS } from '../../lib/demo/fixtures';

const INITIAL = {
  business: '',
  contact: '',
  email: '',
  region: '',
  crew: '',
  notes: '',
};

export default function DemoSignup() {
  const { values, errors, state, setField, submit } = useDemoForm({
    initial: INITIAL,
    action: 'Create client',
    table: 'clients',
    required: ['business', 'contact', 'email'],
  });

  const busy = state !== 'idle';

  return (
    <div>
      <h1 className="text-white text-2xl sm:text-4xl font-black uppercase tracking-[0.2em] text-left">
        Signup
      </h1>
      <p className="mt-3 text-white/40 text-[13px] text-left max-w-2xl">
        Fill it in and hit save. You will see exactly what the live form would have
        written, and then this resets.
      </p>

      <div className="mt-10 max-w-xl bg-white/5 p-6 sm:p-8" style={{ borderRadius: 0 }}>
        <form
          onSubmit={e => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-6"
        >
          {DEMO_SIGNUP_FIELDS.map(field => {
            const name = field.name as keyof typeof INITIAL;
            const error = errors[name];
            return (
              <div key={field.name}>
                <label
                  htmlFor={`demo-${field.name}`}
                  className="block text-[9px] font-black uppercase tracking-[0.3em] text-white/40 text-left"
                >
                  {field.label}
                  {field.required && <span className="text-white/20"> · required</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    id={`demo-${field.name}`}
                    value={values[name]}
                    onChange={e => setField(name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    disabled={busy}
                    className="mt-2 w-full bg-black text-white text-[14px] p-3 resize-none placeholder:text-white/20 focus:outline-none disabled:opacity-40"
                    style={{ borderRadius: 0 }}
                  />
                ) : (
                  <input
                    id={`demo-${field.name}`}
                    type={field.type}
                    value={values[name]}
                    onChange={e => setField(name, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={busy}
                    className="mt-2 w-full h-11 bg-black text-white text-[14px] px-3 placeholder:text-white/20 focus:outline-none disabled:opacity-40"
                    style={{ borderRadius: 0 }}
                  />
                )}

                {error && (
                  <p className="mt-2 text-red-500 text-[11px] uppercase tracking-widest text-left">
                    {error}
                  </p>
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              'h-12 text-[11px] font-black uppercase tracking-[0.25em] transition-colors',
              state === 'saved'
                ? 'bg-green-400 text-black'
                : busy
                  ? 'bg-white/5 text-white/30'
                  : 'bg-white text-black hover:bg-white/80',
            )}
            style={{ borderRadius: 0 }}
          >
            {state === 'saved' ? 'Saved' : state === 'submitting' ? 'Saving' : 'Save Client'}
          </button>
        </form>
      </div>
    </div>
  );
}
