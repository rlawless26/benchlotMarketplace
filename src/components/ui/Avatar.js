/**
 * Unified Avatar component.
 *
 * Renders a user's profile photo with a consistent fallback (letter initial
 * on a Spruce background). Used everywhere a user image appears: header
 * dropdown, seller dashboard sidebar, conversation views, offer cards, etc.
 *
 * Props:
 *   src        — photoURL string (optional)
 *   name       — display name or email used for the initial fallback
 *   size       — 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 *   className  — optional extra classes on the outer container
 */
import React from 'react';

const SIZES = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
};

function getInitial(name) {
  if (!name) return '?';
  // Skip email-prefix-looking strings — use first real letter
  const cleaned = name.replace(/[^a-zA-Z]/g, '');
  return (cleaned[0] || '?').toUpperCase();
}

const Avatar = ({ src, name = '', size = 'md', className = '' }) => {
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ${sizeClass} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'User'}
          className="h-full w-full object-cover"
          onError={(e) => {
            // If the image fails to load, hide it so the fallback shows
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className={`h-full w-full bg-spruce flex items-center justify-center font-body font-semibold text-bone ${src ? 'hidden' : ''}`}
        style={src ? { display: 'none' } : undefined}
      >
        {getInitial(name)}
      </div>
    </div>
  );
};

export default Avatar;
