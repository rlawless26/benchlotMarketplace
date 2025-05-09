/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        benchlot: {
          primary: '#243B53',    // Navy blue primary
          secondary: '#1A2C40',  // Darker navy for hover states
          accent: '#C08B7C',     // Light clay/terracotta accent
          'accent-hover': '#A77A6C',
          'accent-light': '#F2ECEA',
          'accent-dark': '#d4d4d4',
          'accent-bg': '#EFE9E7',
          base: '#FAFAFA',       // Base background color
          white: '#FFFFFF',
          'text-primary': '#121A24',
          'text-secondary': '#364A63',
          'footer-bg': '#121A24',
          'ivory-light': '#FAFAFA',
          success: '#2E6E7E',
          error: '#B43C38',
        },
        navy: {
          50: '#EFF3F7',
          100: '#D0DCE8',
          200: '#B1C5DA',
          300: '#92AECC',
          400: '#6E93BB',
          500: '#5179A5',
          600: '#3A5E87',
          700: '#243B53',
          800: '#1A2C40',
          900: '#121A24',
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
      sans: ['Mulish', 'sans-serif'],
    }
  },
  plugins: [],
}