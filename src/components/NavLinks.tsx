import { Link, useNavigate } from 'react-router-dom';
import { UserIcon, ArrowRightStartOnRectangleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useSageMode } from '../contexts/SageModeContext';
import { useState } from 'react';

type NavLinksProps = {
    user: any;
    userIsAdmin: boolean;
    userSubdomain: string | null;
    sageModeState: { enabled: boolean };
    toggleSageMode: () => void;
    handleSignOut: () => void;
    onLinkClick: () => void;
    onLoginClick: (e: React.MouseEvent) => void;
};

export default function NavLinks({
    user,
    userIsAdmin,
    userSubdomain,
    sageModeState,
    toggleSageMode,
    handleSignOut,
    onLinkClick,
    onLoginClick,
}: NavLinksProps) {
    const [archivesMenuOpen, setArchivesMenuOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);

    // Only show HOME and SHOP in menu for now (MORE menu always visible)
    const showLimitedMenu = true;

    return (
        <>
            <Link to="/" className="menu-item" onClick={onLinkClick}>
                HOME
            </Link>
            <Link to="/shop" className="menu-item" onClick={onLinkClick}>
                SHOP
            </Link>
            <Link to="/gallery" className="menu-item" onClick={onLinkClick}>
                THE GALLERY
            </Link>

            <div
                className="menu-item menu-toggle-section flex items-center justify-start w-full gap-0 cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    setArchivesMenuOpen(!archivesMenuOpen);
                }}
            >
                <span className="flex-grow">THE LOST ARCHIVES</span>
                <div className="p-1 transition rounded-none flex items-center justify-center h-6 w-6 shrink-0">
                    {archivesMenuOpen ? '▼' : '▶'}
                </div>
            </div>
            <div className={`menu-subsection ${archivesMenuOpen ? 'open' : ''}`}>
                <Link to="/thelostarchives" className="menu-item menu-subitem" onClick={onLinkClick}>
                    ALL ARTICLES
                </Link>
                <Link to="/gearheads" className="menu-item menu-subitem" onClick={onLinkClick}>
                    GEARHEADS
                </Link>
                <Link to="/borderlands" className="menu-item menu-subitem" onClick={onLinkClick}>
                    EDGE OF THE BORDERLANDS
                </Link>
                <Link to="/science" className="menu-item menu-subitem" onClick={onLinkClick}>
                    MAD SCIENTISTS
                </Link>
                <Link to="/newtheory" className="menu-item menu-subitem" onClick={onLinkClick}>
                    NEW THEORY
                </Link>
            </div>

            {!showLimitedMenu && (
                <Link to="/tools" className="menu-item" onClick={onLinkClick}>
                    EXPLORE TOOLS
                </Link>
            )}

            <div
                className="menu-item menu-toggle-section flex items-center justify-start w-full gap-0 cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    setMoreMenuOpen(!moreMenuOpen);
                }}
            >
                <span className="flex-grow">MORE</span>
                <div className="p-1 transition rounded-none flex items-center justify-center h-6 w-6 shrink-0">
                    {moreMenuOpen ? '▼' : '▶'}
                </div>
            </div>
            <div className={`menu-subsection ${moreMenuOpen ? 'open' : ''}`}>
                <Link to="/about" className="menu-item menu-subitem" onClick={onLinkClick}>
                    ABOUT
                </Link>
                <Link to="/privacy-policy" className="menu-item menu-subitem" onClick={onLinkClick}>
                    PRIVACY POLICY
                </Link>
                <Link to="/terms-of-service" className="menu-item menu-subitem" onClick={onLinkClick}>
                    TERMS OF SERVICE
                </Link>
                {!showLimitedMenu && (
                    <>
                        <Link to="/docs" className="menu-item menu-subitem" onClick={onLinkClick}>
                            DOCUMENTATION
                        </Link>
                        <Link to="/pricing" className="menu-item menu-subitem" onClick={onLinkClick}>
                            PRICING
                        </Link>
                        <Link to="/support" className="menu-item menu-subitem" onClick={onLinkClick}>
                            SUPPORT
                        </Link>
                    </>
                )}
            </div>

            {user && (
                <>
                    <Link
                        to={userIsAdmin ? '/admin' : userSubdomain ? `/${userSubdomain}/profile` : '/profile'}
                        className="menu-item"
                        onClick={onLinkClick}
                    >
                        <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            {userIsAdmin ? 'ADMIN DASHBOARD' : 'PROFILE'}
                        </div>
                    </Link>
                    {userIsAdmin && (
                        <button
                            type="button"
                            className="menu-item w-full text-left flex items-center justify-between"
                            onClick={() => {
                                toggleSageMode();
                                // Optionally close menu or keep it open for toggle? 
                                // Usually toggles stay open, but nav links close. Let's keep it open or let user decide.
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4" />
                                SAGE MODE
                            </div>
                            <span className={`text-xs ${sageModeState.enabled ? 'text-yellow-400' : 'text-white/40'}`}>
                                {sageModeState.enabled ? 'ON' : 'OFF'}
                            </span>
                        </button>
                    )}
                    <button type="button" className="menu-item w-full text-left" onClick={handleSignOut}>
                        <div className="flex items-center gap-2">
                            <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                            LOG OUT
                        </div>
                    </button>

                    <div className="menu-item user-info">
                        <div className="text-white/60 text-xs mb-1">Logged in as:</div>
                        <div className="text-white text-sm font-medium">
                            {user.user_metadata?.author_name || user.email?.split('@')[0] || 'User'}
                        </div>
                    </div>
                </>
            )}
            {!user && (
                <button type="button" className="menu-item" onClick={onLoginClick}>
                    LOG IN
                </button>
            )}
        </>
    );
}
