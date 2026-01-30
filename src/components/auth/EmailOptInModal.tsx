import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EmailOptInModalProps {
  isOpen: boolean;
  email: string;
  onOptIn: (optIn: boolean) => void;
  onClose: () => void;
}

export default function EmailOptInModal({ isOpen, email, onOptIn, onClose }: EmailOptInModalProps) {
  const [selectedOption, setSelectedOption] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (selectedOption !== null) {
      onOptIn(selectedOption);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-black/50 rounded-none p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            Join Our Email List?
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <p className="text-white/70 mb-6">
          Would you like to receive updates, news, and exclusive content from THE LOST+UNFOUNDS at <strong className="text-white">{email}</strong>?
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelectedOption(true)}
            className={`w-full px-4 py-3 border rounded-none text-left transition ${selectedOption === true
              ? 'bg-white text-black border-white'
              : 'bg-black/50 text-white border-white/10 hover:border-white/30'
              }`}
          >
            <div className="font-semibold mb-1">✓ Yes, keep me updated</div>
            <div className="text-sm opacity-70">Get news, updates, and exclusive content</div>
          </button>

          <button
            onClick={() => setSelectedOption(false)}
            className={`w-full px-4 py-3 border rounded-none text-left transition ${selectedOption === false
              ? 'bg-white text-black border-white'
              : 'bg-black/50 text-white border-white/10 hover:border-white/30'
              }`}
          >
            <div className="font-semibold mb-1">No thanks</div>
            <div className="text-sm opacity-70">Continue without subscribing</div>
          </button>
        </div>

        <button
          onClick={handleContinue}
          disabled={selectedOption === null}
          className="w-full px-4 py-2.5 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}



