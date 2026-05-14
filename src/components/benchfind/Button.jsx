import React from 'react';

/**
 * Benchfind Button primitive.
 *
 * Variants:
 *   - primary   — forest-700 bg, paper-50 text. Hover: forest-900.
 *   - secondary — transparent bg, rule-strong border, ink-900 text.
 *   - ghost     — no chrome, ink-700 text, hover bg-paper-100.
 *   - danger    — transparent, danger color text+border.
 *
 * Sizes: sm (36px min-h), md (44px min-h, default), lg (52px min-h).
 * No scale-on-hover, no scale-on-press — tool feel, not toy feel.
 */
const VARIANT_CLASSES = {
  primary:
    'bg-forest-700 text-paper-50 border-transparent hover:bg-forest-900 focus-visible:ring-forest-700/20',
  secondary:
    'bg-transparent text-ink-900 hover:bg-paper-100 focus-visible:ring-forest-700/20',
  ghost:
    'bg-transparent text-ink-700 border-transparent hover:bg-paper-100 focus-visible:ring-forest-700/20',
  danger:
    'bg-transparent text-[#B0321F] hover:bg-[#F7DDD6] focus-visible:ring-[#B0321F]/20',
};

const SIZE_CLASSES = {
  sm: 'min-h-[36px] px-3 py-[7px] text-[13px]',
  md: 'min-h-[44px] px-4 py-[10px] text-[14px]',
  lg: 'min-h-[52px] px-5 py-[13px] text-[15px]',
};

const Button = React.forwardRef(({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled = false,
  children,
  onClick,
  ...rest
}, ref) => {
  const base = 'inline-flex items-center gap-2 font-sans font-semibold rounded-md transition-colors duration-fast outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-paper-400';
  const border = variant === 'secondary' ? 'border border-[#C9BC9E]'
    : variant === 'danger' ? 'border border-[#B0321F]'
    : 'border border-transparent';
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        base,
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
        border,
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
});

Button.displayName = 'BenchfindButton';

export default Button;
