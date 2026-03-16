/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        // Semantic colors
        success: '#2a6a4a',
        error: '#a83a2a',
        warning: '#b08a40',
        info: '#2a5a6a',
      },
      fontFamily: {
        display: ["'Petrona'", 'Georgia', "'Times New Roman'", 'serif'],
        body: ["'Outfit'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
      },
      fontSize: {
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
      },
      borderColor: {
        DEFAULT: '#e4e2dc',
        light: '#eceae4',
        dark: '#d4d2cc',
      },
      backgroundColor: {
        page: '#f2f0eb',
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
        'card': '10px',
        'btn': '8px',
        'btn-sm': '6px',
        'section': '12px',
        'badge': '16px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(12, 28, 30, 0.05)',
        'md': '0 2px 8px rgba(12, 28, 30, 0.08)',
        'lg': '0 4px 16px rgba(12, 28, 30, 0.10)',
        'card': '0 2px 8px rgba(12, 28, 30, 0.08)',
        'card-hover': '0 4px 16px rgba(12, 28, 30, 0.10)',
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
  },
  plugins: [],
}
