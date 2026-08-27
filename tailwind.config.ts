/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#132521',
          light: '#1a332d',
          hover: '#1f3d35',
          active: '#264a3f',
        },
        primary: {
          DEFAULT: '#176C5B',
          50: '#E5F2EE',
          100: '#CCE5DD',
          200: '#99CCBB',
          300: '#66B399',
          400: '#339977',
          500: '#176C5B',
          600: '#125648',
          700: '#0F4F43',
          800: '#0B3D33',
          900: '#082C24',
        },
        page: {
          DEFAULT: '#F4F7F5',
        },
        muted: {
          DEFAULT: '#6F7A76',
        },
        border: {
          DEFAULT: '#E4E9E7',
        },
        main: {
          DEFAULT: '#17211F',
        },
        status: {
          amber: '#B96C22',
          'amber-pale': '#FFF0DD',
          blue: '#3779A7',
          'blue-pale': '#E8F1F7',
          green: '#3D8B6E',
          'green-pale': '#E8F5EF',
          red: '#B94747',
          'red-pale': '#FCE8E8',
          purple: '#7664A8',
          'purple-pale': '#F0EDF7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        label: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '14px',
      },
    },
  },
  plugins: [],
}