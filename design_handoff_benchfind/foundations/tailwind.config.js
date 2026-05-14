/**
 * Benchfind — Tailwind theme.extend block.
 * Drop into the `theme.extend` key of your tailwind.config.js.
 *
 * Naming convention:
 *   - Color families use raw names (paper / ink / iron / rust / patina) with numeric stops.
 *   - Semantic colors live under `bg`, `fg`, `rule`, `accent`, `conf`, `cond`.
 *   - Component code should reach for semantic tokens (e.g. `bg-paper`, `text-fg-body`)
 *     and only drop to raw stops when no semantic role fits.
 */

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Raw families
        paper: {
          50:  '#FBF8F2',
          100: '#F6F1E7',
          200: '#ECE4D2',
          300: '#DDD2B9',
          400: '#C2B393',
          DEFAULT: '#FBF8F2',
        },
        ink: {
          400: '#9B9189',
          500: '#7A6F66',
          600: '#5A514A',
          700: '#3D3631',
          800: '#2A2420',
          900: '#1B1714',
          DEFAULT: '#1B1714',
        },
        iron: {
          300: '#B4B8BB',
          500: '#6B7178',
          700: '#3C4348',
        },
        // Spruce — primary accent (B v2). Deep forest.
        spruce: {
          50:  '#EEF4F0',
          100: '#E0EBE4',
          300: '#94B3A2',
          500: '#2F6B52',
          700: '#1F4D3A', // primary action
          900: '#143527',
          DEFAULT: '#1F4D3A',
        },
        // Brass — warm secondary highlight, sparing use.
        brass: {
          100: '#F0E3C3',
          500: '#B08938',
          700: '#8C6B22',
          DEFAULT: '#B08938',
        },
        // Rust — demoted to semantic-only (low confidence, project condition).
        rust: {
          50:  '#FBF0E4',
          100: '#F5E3D2',
          300: '#E2B895',
          500: '#B86631',
          600: '#A85427',
          700: '#8A4419',
          DEFAULT: '#8A4419',
        },
        patina: {
          100: '#DDEAE5',
          500: '#4F8A7A',
          700: '#2F5D52',
        },

        // Semantic — confidence (high/medium/low) + condition + status
        conf: {
          'high':       '#2F6B3D',
          'high-bg':    '#E4EFE2',
          'medium':     '#8C6B22',  // brass-700
          'medium-bg':  '#F0E3C3',  // brass-100
          'low':        '#8A4419',
          'low-bg':     '#F5E3D2',
        },
        cond: {
          excellent: '#2F6B3D',
          good:      '#4F8A7A',
          fair:      '#8C6B22',
          project:   '#8A4419',
        },
        danger: {
          DEFAULT: '#B0321F',
          bg:      '#F7DDD6',
        },

        // Aliases used in JSX components
        bg:        '#FBF8F2',
        'bg-elev': '#FFFFFF',
        'bg-inset':'#F6F1E7',
        'bg-well': '#ECE4D2',
        rule:      '#DDD2B9',
        'rule-strong': '#C9BC9E',
        fg:        '#1B1714',
        'fg-strong': '#2A2420',
        'fg-body':   '#5A514A',
        'fg-meta':   '#7A6F66',
        accent:      '#1F4D3A',   // spruce-700
        'accent-hover': '#143527',// spruce-900
        'accent-soft':  '#E0EBE4',// spruce-100
        highlight:      '#B08938',// brass-500
        'highlight-soft':'#F0E3C3',// brass-100
      },

      fontFamily: {
        display: ['Petrona', 'Newsreader', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Named scale with sensible line-height defaults
        'xs':   ['12px', { lineHeight: '1.4' }],
        'sm':   ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.55' }],
        'md':   ['17px', { lineHeight: '1.55' }],
        'lg':   ['20px', { lineHeight: '1.4' }],
        'xl':   ['24px', { lineHeight: '1.3' }],
        '2xl':  ['30px', { lineHeight: '1.25' }],
        '3xl':  ['38px', { lineHeight: '1.2' }],
        '4xl':  ['48px', { lineHeight: '1.1' }],
        '5xl':  ['60px', { lineHeight: '1.05' }],
        '6xl':  ['76px', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
      },

      letterSpacing: {
        tightest: '-0.02em',
        tight:    '-0.01em',
        wide:     '0.04em',
      },

      spacing: {
        // Tailwind already has 0–96; we add a few named tokens used by layouts.
        'gutter':    '24px',
        'gutter-lg': '48px',
        'page-x':    '24px',
        'page-x-lg': '64px',
        'tap':       '44px',  // minimum mobile hit target
      },

      borderRadius: {
        'xs':   '2px',
        'sm':   '4px',
        DEFAULT:'6px',
        'md':   '6px',
        'lg':   '10px',
        'xl':   '14px',
        'pill': '999px',
      },

      boxShadow: {
        // Soft, warm, low. No bluish drop shadows.
        'sm':  '0 1px 2px rgba(40,30,20,0.06), 0 1px 1px rgba(40,30,20,0.04)',
        DEFAULT: '0 2px 6px rgba(40,30,20,0.08), 0 1px 2px rgba(40,30,20,0.04)',
        'md':  '0 2px 6px rgba(40,30,20,0.08), 0 1px 2px rgba(40,30,20,0.04)',
        'lg':  '0 8px 24px rgba(40,30,20,0.10), 0 2px 6px rgba(40,30,20,0.06)',
        'hairline': 'inset 0 0 0 1px #DDD2B9',
        'focus':    '0 0 0 3px rgba(31,77,58,0.20)',  // spruce alpha
      },

      transitionDuration: {
        'fast': '120ms',
        DEFAULT: '180ms',
        'slow': '320ms',
      },

      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.2, 0.0, 0.2, 1)',
        'emphasis': 'cubic-bezier(0.2, 0.0, 0.0, 1)',
      },

      animation: {
        'fade-in':  'fade-in 180ms cubic-bezier(0.2,0,0.2,1) both',
        'rise-in':  'rise-in 240ms cubic-bezier(0.2,0,0.2,1) both',
        'scan':     'scan 1400ms cubic-bezier(0.4,0,0.6,1) infinite',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scan': {
          '0%, 100%': { opacity: '0.35' },
          '50%':       { opacity: '1' },
        },
      },
    },
  },
};
