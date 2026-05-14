/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Benchlot (legacy aggregator brand) ────────────────────────────
        // KEEP. Used throughout benchlot.com surfaces. Do not retune values.
        spruce: {
          DEFAULT: '#1a3030',
          light: '#2a4a48',
          dark: '#0e2020',
        },
        bone: {
          DEFAULT: '#f2f0eb',
          dark: '#e8e6e0',
          light: '#f8f6f2',
        },
        honey: {
          DEFAULT: '#d4aa60',
          light: '#e0c080',
          dark: '#b08a40',
        },
        'dark-teal': {
          DEFAULT: '#0c1c1e',
          light: '#1a2e30',
        },
        badge: {
          accent: '#d4aa60',
          'accent-text': '#0c1c1e',
          highlight: '#d6ece4',
          'highlight-text': '#1a3030',
          neutral: '#e8e6e0',
          'neutral-text': '#4a5a54',
        },
        success: '#2a6a4a',
        error: '#a83a2a',
        warning: '#b08a40',
        info: '#2a5a6a',
        kind: {
          dealer: '#d4aa60',
          forum: '#2a6a4a',
          reddit: '#a83a2a',
          marketplace: '#2a5a6a',
          auction: '#6a4a2a',
        },

        // ─── Benchfind (photo-ID brand on benchfind.com) ───────────────────
        // From design_handoff_benchfind/foundations/tailwind.config.js.
        // Note: the design system's "spruce" is renamed to "forest" here to
        // avoid colliding with Benchlot's own "spruce" (which is dark teal).
        // Benchfind components: use `bg-forest-700`, `text-forest-50`, etc.
        paper: {
          50:  '#FBF8F2',  // page base — never pure white
          100: '#F6F1E7',  // card-on-page hairline tint
          200: '#ECE4D2',  // inset wells, table-stripe
          300: '#DDD2B9',  // rule, hairline
          400: '#C2B393',  // disabled text
          DEFAULT: '#FBF8F2',
        },
        ink: {
          400: '#9B9189',
          500: '#7A6F66',
          600: '#5A514A',
          700: '#3D3631',
          800: '#2A2420',
          900: '#1B1714',  // primary text — never pure black
          DEFAULT: '#1B1714',
        },
        iron: {
          300: '#B4B8BB',
          500: '#6B7178',
          700: '#3C4348',
        },
        // FOREST = Benchfind primary accent (named "spruce" in design files)
        forest: {
          50:  '#EEF4F0',
          100: '#E0EBE4',
          300: '#94B3A2',
          500: '#2F6B52',
          700: '#1F4D3A',  // primary action
          900: '#143527',
          DEFAULT: '#1F4D3A',
        },
        brass: {
          100: '#F0E3C3',
          500: '#B08938',
          700: '#8C6B22',
          DEFAULT: '#B08938',
        },
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
        // Confidence & condition semantic ramps (Benchfind)
        conf: {
          'high':       '#2F6B3D',
          'high-bg':    '#E4EFE2',
          'medium':     '#9A6B12',
          'medium-bg':  '#F5E9C8',
          'low':        '#8A4419',
          'low-bg':     '#F5E3D2',
        },
        cond: {
          excellent: '#2F6B3D',
          good:      '#4F8A7A',
          fair:      '#9A6B12',
          project:   '#8A4419',
        },
      },
      fontFamily: {
        // Existing Benchlot stack
        display: ["'Petrona'", 'Georgia', "'Times New Roman'", 'serif'],
        body: ["'Outfit'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
        // Benchfind additions
        sans: ["'Inter'", 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Existing Benchlot semantic scale
        'hero': '72px',
        'h1': '48px',
        'h2': '32px',
        'h3': '24px',
        'h4': '20px',
        'body': '15px',
        'body-sm': '13px',
        'caption': '11px',
        'label': '10px',
        'nav': '13px',
        'btn': '13px',
        'btn-sm': '11px',
        'price': '16px',
        'wordmark': '20px',
        // Benchfind scale — overrides Tailwind defaults. Minor 1-2px shifts
        // versus Tailwind defaults; acceptable risk on existing Benchlot pages.
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
        tight: '-0.01em',
        wide: '0.04em',
      },
      borderColor: {
        DEFAULT: '#e4e2dc',
        light: '#eceae4',
        dark: '#d4d2cc',
      },
      backgroundColor: {
        page: '#f2f0eb',
        'success-bg': '#d6ece4',
      },
      textColor: {
        primary: '#0c1c1e',
        secondary: '#4a5a54',
        muted: '#8a8a80',
        price: '#d4aa60',
        'on-spruce': '#f2f0eb',
        'on-dark': '#f2f0eb',
        'on-dark-muted': '#6a8a84',
        'on-honey': '#0c1c1e',
      },
      borderRadius: {
        // Benchlot
        'card': '10px',
        'btn': '8px',
        'btn-sm': '6px',
        'section': '12px',
        'badge': '16px',
        // Benchfind (overrides Tailwind defaults)
        'xs':   '2px',
        'sm':   '4px',
        DEFAULT:'6px',
        'md':   '6px',
        'lg':   '10px',
        'xl':   '14px',
        'pill': '999px',
      },
      boxShadow: {
        // Benchfind warm-RGB shadows override Tailwind defaults.
        // Existing Benchlot pages using `shadow-sm` etc. shift to warm tones.
        'sm':  '0 1px 2px rgba(40,30,20,0.06), 0 1px 1px rgba(40,30,20,0.04)',
        DEFAULT: '0 2px 6px rgba(40,30,20,0.08), 0 1px 2px rgba(40,30,20,0.04)',
        'md':  '0 2px 6px rgba(40,30,20,0.08), 0 1px 2px rgba(40,30,20,0.04)',
        'lg':  '0 8px 24px rgba(40,30,20,0.10), 0 2px 6px rgba(40,30,20,0.06)',
        'hairline': 'inset 0 0 0 1px #DDD2B9',
        'focus':    '0 0 0 3px rgba(31,77,58,0.20)',  // forest-700 alpha
        // Benchlot legacy named shadows
        'card': '0 2px 8px rgba(12, 28, 30, 0.08)',
        'card-hover': '0 4px 16px rgba(12, 28, 30, 0.10)',
      },
      spacing: {
        // Benchlot
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
        // Benchfind named tokens
        'gutter': '24px',
        'gutter-lg': '48px',
        'page-x': '24px',
        'page-x-lg': '64px',
        'tap': '44px',  // minimum mobile hit target
      },
      maxWidth: {
        'container': '55rem',
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
      },
    },
  },
  plugins: [],
}
