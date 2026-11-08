import { useState } from 'react';
import { parseEmailList } from '../../lib/parseEmailList';

interface Props {
  /** Already on this list: skipped, and said so. */
  existing: string[];
  /** The gallery's other invite list. An address belongs on one list only. */
  otherList: string[];
  otherListName: string;
  onAdd: (emails: string[]) => void;
  placeholder: string;
  tour: string;
}

/**
 * Add one email or a pasted list to a gallery's Album Owners or À La Carte.
 * Anything that isn't an address stays in the box to fix.
 */
export default function EmailBatchInput({ existing, otherList, otherListName, onAdd, placeholder, tour }: Props) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  // What the last add left behind. Tapping + ADD also blurs the box, so without
  // this the second run would replace the summary of what was just added.
  const [leftover, setLeftover] = useState('');

  const commit = () => {
    if (!text.trim() || text === leftover) return;
    const { emails, invalid } = parseEmailList(text);
    const onThisList = emails.filter(e => existing.includes(e));
    const onOther = emails.filter(e => !existing.includes(e) && otherList.includes(e));
    const fresh = emails.filter(e => !existing.includes(e) && !otherList.includes(e));
    if (fresh.length) onAdd(fresh);
    const remaining = invalid.join('\n');
    setText(remaining);
    setLeftover(remaining);
    setNote([
      fresh.length ? `Added ${fresh.length}.` : '',
      onThisList.length ? `Already here: ${onThisList.join(', ')}.` : '',
      onOther.length ? `Already on ${otherListName}, remove them there first: ${onOther.join(', ')}.` : '',
      invalid.length ? `Not an email, left in the box: ${invalid.join(', ')}.` : '',
    ].filter(Boolean).join(' '));
  };

  return (
    <>
      <div className="flex gap-2 items-start">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter must not submit the gallery form. Shift+Enter is a new line.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
          }}
          // Tapping SAVE with a list still in the box must not lose it.
          onBlur={commit}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          aria-label={placeholder}
          data-tour={tour}
          className="flex-1 min-w-0 resize-y bg-white/5 p-2 text-left text-white placeholder-white/20 focus:outline-none rounded-none font-mono text-xs"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={commit}
          className="px-4 py-2 bg-white/10 text-white text-xs uppercase font-bold hover:bg-white/20 transition-colors"
        >
          + Add
        </button>
      </div>
      {note && <p role="status" className="text-[10px] text-white/60 mt-2 break-words">{note}</p>}
    </>
  );
}
