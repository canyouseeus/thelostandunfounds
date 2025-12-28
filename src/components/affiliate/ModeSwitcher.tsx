import { useState, useEffect } from 'react';

interface ModeSwitcherProps {
  currentMode: 'cash' | 'discount';
  lastChangeDate: string | null;
  affiliateId: string;
  onModeChange: (newMode: 'cash' | 'discount') => void;
}

export default function ModeSwitcher({ currentMode, lastChangeDate, affiliateId, onModeChange }: ModeSwitcherProps) {
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSwitch = (): boolean => {
    // If no last change date, can always switch (first time)
    if (!lastChangeDate || lastChangeDate === 'null' || lastChangeDate === '') return true;
    
    try {
      const lastChange = new Date(lastChangeDate);
      // Check if date is valid
      if (isNaN(lastChange.getTime())) return true;
      
      const daysSince = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysSince >= 30;
    } catch (e) {
      // If date parsing fails, allow switch
      return true;
    }
  };

  const getDaysUntilNextChange = () => {
    if (!lastChangeDate || lastChangeDate === 'null' || lastChangeDate === '') return 0;
    
    try {
      const lastChange = new Date(lastChangeDate);
      if (isNaN(lastChange.getTime())) return 0;
      
      const daysSince = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
      
      return Math.max(0, 30 - daysSince);
    } catch (e) {
      return 0;
    }
  };

  const handleSwitch = async () => {
    if (!canSwitch()) {
      setError(`You can only change modes once per 30 days. ${getDaysUntilNextChange()} days remaining.`);
      return;
    }

    const newMode = currentMode === 'cash' ? 'discount' : 'cash';

    setSwitching(true);
    setError(null);

    try {
      const response = await fetch('/api/affiliates/switch-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: affiliateId,
          new_mode: newMode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch mode');
      }

      onModeChange(newMode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSwitching(false);
    }
  };

  const daysRemaining = getDaysUntilNextChange();
  const canSwitchNow = canSwitch();

  // Clear error when switching becomes available
  useEffect(() => {
    if (canSwitchNow && error) {
      setError(null);
    }
  }, [canSwitchNow, lastChangeDate]);

  return (
    <div className="bg-black/50 border-2 border-white rounded-none p-6">
      <h3 className="text-xl font-bold text-white mb-4">Commission Mode</h3>

      <div className="space-y-4">
        {/* Current Mode Display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">
              Current Mode: <span className="text-green-400">{currentMode === 'cash' ? 'Cash Commissions' : 'Employee Discount'}</span>
            </p>
            {lastChangeDate && (
              <p className="text-white/60 text-sm mt-1">
                Last changed: {new Date(lastChangeDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Mode Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 border rounded-none ${currentMode === 'cash' ? 'border-green-400 bg-green-400/10' : 'border-white/20 bg-black/30'}`}>
            <h4 className="font-bold text-white mb-2">💰 Cash Mode</h4>
            <p className="text-white/80 text-sm">
              Earn 42% of profit as cash commissions. Best for affiliates focused on sales.
            </p>
          </div>

          <div className={`p-4 border rounded-none ${currentMode === 'discount' ? 'border-green-400 bg-green-400/10' : 'border-white/20 bg-black/30'}`}>
            <h4 className="font-bold text-white mb-2">🏷️ Discount Mode</h4>
            <p className="text-white/80 text-sm">
              Get 42% of profit as discount credit for personal purchases. Best for self-use.
            </p>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-yellow-400/10 border border-yellow-400/30 p-4 rounded-none">
          <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ Important:</p>
          <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
            <li>When using employee discount, all downstream commissions are calculated on remaining profit</li>
            <li>MLM bonuses still apply to your upline even in discount mode</li>
            <li>After switching modes, you must wait 30 days before switching again</li>
          </ul>
        </div>

        {/* Switch Button */}
        {canSwitchNow ? (
          <button
            onClick={handleSwitch}
            disabled={switching}
            className="w-full bg-white text-black font-bold py-3 px-6 rounded-none hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {switching ? 'Switching...' : `Switch to ${currentMode === 'cash' ? 'Discount' : 'Cash'} Mode`}
          </button>
        ) : (
          <div className="text-center p-4 bg-white/5 border border-white/20 rounded-none">
            <p className="text-white/60 text-sm">
              Mode switching available in <span className="font-bold text-white">{daysRemaining}</span> days
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-none">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

