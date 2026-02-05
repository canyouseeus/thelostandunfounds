import { useState, useRef, useEffect } from 'react';
import { UserIcon, ArrowRightOnRectangleIcon, ChevronDownIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../utils/admin';
import AuthModal from './AuthModal';

export default function UserMenu() {
  const { user, tier, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Check if user is admin
  useEffect(() => {
    if (user) {
      isAdmin().then(setUserIsAdmin).catch(() => setUserIsAdmin(false));
    } else {
      setUserIsAdmin(false);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setMenuOpen(false);
      // Force reload to ensure all state is cleared
      window.location.reload();
    } catch (error) {
      console.warn('Error signing out:', error);
      setMenuOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="px-3 py-2 text-white/60 text-sm">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tierColors = {
    free: 'text-white/60',
    premium: 'text-yellow-400',
    pro: 'text-purple-400',
  };

  const tierLabels = {
    free: 'Free',
    premium: 'Premium',
    pro: 'Pro',
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-black/50 border border-white rounded-none hover:border-white transition"
        >
          <UserIcon className="w-4 h-4 text-white" />
          <span className="text-white text-sm">{user.email || 'User'}</span>
          <ChevronDownIcon className={`w-4 h-4 text-white/60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-black/50 border border-white rounded-none shadow-lg z-50">
            <div className="p-4 border-b border-white">
              <div className="text-white font-medium text-sm">{user.email || 'User'}</div>
              <div className={`text-xs mt-1 font-semibold ${tierColors[tier]}`}>
                {tierLabels[tier]} Tier
              </div>
            </div>
            <div className="p-2 space-y-1">
              {userIsAdmin && (
                <button
                  onClick={() => {
                    navigate('/admin');
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-none transition text-sm"
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-none transition text-sm"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}

