/**
 * DEMO MODE — the form walkthrough.
 *
 * A demo form has to feel like the real one all the way to the end, or it
 * proves nothing. So this runs the genuine sequence — validate, submit, settle,
 * succeed — and only swaps out the single step in the middle where a real form
 * would touch the database.
 *
 * The reset is the point. You walk the whole signup, you hit save, you see what
 * would have been written, and the form goes back to the beginning ready for the
 * next person to walk it. Nothing accumulates, so the demo is never stale and
 * never has to be cleaned up.
 */

import { useCallback, useState } from 'react';
import { useDemo } from './DemoContext';

export type DemoFormState = 'idle' | 'submitting' | 'saved';

export function useDemoForm<T extends Record<string, string>>({
  initial,
  action,
  table,
  required = [],
}: {
  initial: T;
  action: string;
  table: string;
  /** Field names that must be non-empty — the real validation, not a mock. */
  required?: (keyof T)[];
}) {
  const { intercept } = useDemo();
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [state, setState] = useState<DemoFormState>('idle');

  const setField = useCallback((name: keyof T, value: string) => {
    setValues(v => ({ ...v, [name]: value }));
    // Clear the error the moment the field stops being empty, the same way the
    // live forms behave — an error that outlives the fix feels broken.
    setErrors(e => (e[name] ? { ...e, [name]: undefined } : e));
  }, []);

  const reset = useCallback(() => {
    setValues(initial);
    setErrors({});
    setState('idle');
  }, [initial]);

  const submit = useCallback(async () => {
    const found: Partial<Record<keyof T, string>> = {};
    for (const key of required) {
      if (!String(values[key] ?? '').trim()) found[key] = 'Required';
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setState('submitting');

    // Where the real form would await Supabase. The wait is real so the
    // disabled state is visible — a submit that resolves instantly reads as a
    // button that did nothing.
    await new Promise(r => setTimeout(r, 450));

    const saved = await intercept({ action, table, payload: { ...values } });

    if (saved) {
      // Flash the genuine success state, then clear. This is the "it saves and
      // then it refreshes" behavior — except the save landed nowhere.
      setState('saved');
      await new Promise(r => setTimeout(r, 1400));
    }
    reset();
  }, [values, required, intercept, action, table, reset]);

  return { values, errors, state, setField, submit, reset };
}
