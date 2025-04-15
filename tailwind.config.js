/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        benchlot: {
          primary: '#17613F',    // Forest green primary
          secondary: '#145535',  // Darker forest green for hover states
          accent: '#78ab96',     // Accent light forest green
          'accent-hover': '#114a2e',
          'accent-light': '#e6f0eb',
          'accent-dark': '#d4d4d4',
          'accent-bg': '#e3dacc',
          base: '#F0EEE6',       // Base background color
          white: '#FFFFFF',
          'text-primary': '#44403C',
          'text-secondary': '#57534E',
          'footer-bg': '#141413',
          'ivory-light': '#faf9f5',
          success: '#047857',
          error: '#b91c1c',
        },
        forest: {
          50: '#e6f0eb',
          100: '#c1d9cf',
          200: '#9dc2b3',
          300: '#78ab96',
          400: '#54947a',
          500: '#17613f',
          600: '#145535',
          700: '#114a2e',
          800: '#0e3f27',
          900: '#0a3420',
        }
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'sm': '0.25rem',
        'lg': '0.5rem',
        'card': '0.5rem',
        'full': '9999px',
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      maxWidth: {
        'container': '55rem',
      },
    },
    fontFamily: {
      serif: ['Spectral', 'serif'],
      sans: ['Montserrat', 'sans-serif'],
    }
  },
  plugins: [],
}