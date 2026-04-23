// Benchlot Tailwind Theme Extension
// Add to your tailwind.config.js under theme.extend

module.exports = {
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
      },
      fontFamily: {
        display: ["'Petrona'", 'Georgia', "'Times New Roman'", 'serif'],
        body: ["'Outfit'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
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
      },
      borderRadius: {
        'card': '10px',
        'btn': '8px',
        'btn-sm': '6px',
        'section': '12px',
        'badge': '16px',
      },
    },
  },
};
