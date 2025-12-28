import { Link } from 'react-router-dom';
import { useState, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface InteractiveCardProps {
  to?: string;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: string;
  description?: string;
  showFlip?: boolean;
  backContent?: ReactNode;
}

export default function InteractiveCard({
  to,
  href,
  onClick,
  children,
  className = '',
  icon,
  title,
  description,
  showFlip = true,
  backContent,
}: InteractiveCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardId = `card-${Math.random().toString(36).substr(2, 9)}`;

  const handleClick = (e: React.MouseEvent) => {
    if (showFlip && !onClick) {
      e.preventDefault();
      setIsFlipped(true);
      
      setTimeout(() => {
        if (to) {
          window.location.href = to;
        } else if (href) {
          window.location.href = href;
        }
      }, 300);
    } else if (onClick) {
      onClick();
    }
  };

  const baseClasses = "group relative bg-black/50 border border-white rounded-none px-6 py-4 hover:border-white hover:bg-white/5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between cursor-pointer";
  
  // If it's a simple card without flip, just render normally
  if (!showFlip) {
    const content = (
      <div className={`${baseClasses} ${className}`}>
        {children}
      </div>
    );

    if (to) {
      return <Link to={to} className={`${baseClasses} ${className}`}>{children}</Link>;
    }
    if (href) {
      return <a href={href} className={`${baseClasses} ${className}`}>{children}</a>;
    }
    return <div onClick={onClick} className={`${baseClasses} ${className}`}>{content}</div>;
  }

  // Card with flip animation
  return (
    <div
      className={`tool-card ${isFlipped ? 'flipped' : ''}`}
      onClick={handleClick}
    >
      <div className="tool-card-inner">
        {to ? (
          <Link
            to={to}
            className={`tool-card-front ${baseClasses} ${className}`}
          >
            {icon && (
              <div className="w-10 h-10 border border-white flex items-center justify-center text-white group-hover:border-white group-hover:scale-110 transition-all flex-shrink-0">
                {icon}
              </div>
            )}
            {(title || description) ? (
              <div className="flex items-center gap-4 flex-1">
                {icon && (
                  <div className="w-10 h-10 border border-white flex items-center justify-center text-white group-hover:border-white group-hover:scale-110 transition-all flex-shrink-0">
                    {icon}
                  </div>
                )}
                <div className="flex flex-col justify-center min-h-[40px] flex-1">
                  {title && <h2 className="text-lg font-bold text-white leading-none text-left">{title}</h2>}
                  {description && <p className="text-sm text-white/70 leading-tight mt-1.5 text-left">{description}</p>}
                </div>
              </div>
            ) : (
              children
            )}
            <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-2 transition-all" />
          </Link>
        ) : href ? (
          <a
            href={href}
            className={`tool-card-front ${baseClasses} ${className}`}
          >
            {icon && (
              <div className="w-10 h-10 border border-white flex items-center justify-center text-white group-hover:border-white group-hover:scale-110 transition-all flex-shrink-0">
                {icon}
              </div>
            )}
            {(title || description) ? (
              <div className="flex items-center gap-4 flex-1">
                {icon && (
                  <div className="w-10 h-10 border border-white flex items-center justify-center text-white group-hover:border-white group-hover:scale-110 transition-all flex-shrink-0">
                    {icon}
                  </div>
                )}
                <div className="flex flex-col justify-center min-h-[40px] flex-1">
                  {title && <h2 className="text-lg font-bold text-white leading-none text-left">{title}</h2>}
                  {description && <p className="text-sm text-white/70 leading-tight mt-1.5 text-left">{description}</p>}
                </div>
              </div>
            ) : (
              children
            )}
            <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-2 transition-all" />
          </a>
        ) : (
          <div
            onClick={onClick}
            className={`tool-card-front ${baseClasses} ${className}`}
          >
            {children}
          </div>
        )}
        <div className="tool-card-back group relative bg-black/50 border border-white rounded-none px-6 py-4 flex items-center justify-center cursor-pointer">
          {backContent || (
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-white rounded-none flex items-center justify-center text-white mx-auto mb-4 animate-spin">
                <ArrowRight className="w-8 h-8" />
              </div>
              <p className="text-white/80 text-sm">Loading...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

