/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /**
         * Brand palette — mirrors `app/theme/colors.ts`.
         *
         * NativeWind screens use these classes for layout-level brand fills;
         * theme-aware surfaces still read `useThemeColors()` because the app's
         * light/dark preference lives in ThemeContext rather than in
         * NativeWind's colour-scheme hook.
         */
        navy: {
          50: '#F2F5FA',
          100: '#E4EAF4',
          200: '#C7D3E6',
          300: '#9CB0D1',
          400: '#6A85B4',
          500: '#3F5F97',
          600: '#1E3E75',
          700: '#132B55',
          800: '#0B1B33',
          900: '#06101F',
          DEFAULT: '#132B55',
        },
        orange: {
          50: '#FFF4EC',
          100: '#FFE7D4',
          200: '#FFCBA9',
          300: '#FFA971',
          400: '#FF8534',
          500: '#F2761B',
          600: '#D65E0A',
          700: '#AC4707',
          DEFAULT: '#F2761B',
        },
        ink: '#0C1626',
        'ink-muted': '#55627A',
        'ink-faint': '#AEB9C9',
        page: '#F7F9FC',
        card: '#FFFFFF',
        'card-alt': '#F2F5FA',
        line: '#E4E9F0',
        'line-soft': '#EDF1F6',

        /** Brand aliases keep remaining legacy NativeWind screens on the canvas palette. */
        blue: {
          50: '#F2F5FA',
          100: '#E4EAF4',
          200: '#C7D3E6',
          300: '#9CB0D1',
          400: '#6A85B4',
          500: '#3F5F97',
          600: '#1E3E75',
          700: '#132B55',
          800: '#0B1B33',
          900: '#06101F',
        },
        gray: {
          50: '#F8FAFC',
          100: '#F4F6FA',
          200: '#EDF1F6',
          300: '#E4E9F0',
          400: '#8A97AC',
          500: '#55627A',
          600: '#55627A',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
        },
        primary: {
          50: '#F2F5FA',
          100: '#E4EAF4',
          200: '#C7D3E6',
          300: '#9CB0D1',
          400: '#6A85B4',
          500: '#3F5F97',
          600: '#1E3E75',
          700: '#132B55',
          800: '#0B1B33',
          900: '#06101F',
          DEFAULT: '#132B55',
        },
        secondary: {
          50: '#FFF4EC',
          100: '#FFE7D4',
          200: '#FFCBA9',
          300: '#FFA971',
          400: '#FF8534',
          500: '#F2761B',
          600: '#D65E0A',
          700: '#AC4707',
          DEFAULT: '#F2761B',
        },
        success: '#147A48',
        warning: '#9A5B06',
        danger: '#B32525',
        info: '#3b82f6',
        // Light theme colors
        light: '#F7F9FC',
        'light-card': '#ffffff',
        'light-text': '#0C1626',
        'light-muted': '#55627A',
        // Dark theme colors  
        dark: '#09090B',
        'dark-card': '#18181B',
        'dark-text': '#FAFAFA',
        'dark-muted': '#A1A1AA',
      },
      fontFamily: {
        sans: ['RubikRegular', 'Rubik', 'system-ui', 'sans-serif'],
        /** Rubik families registered in `app/_layout.tsx` via expo-font. */
        rubik: ['RubikRegular'],
        'rubik-medium': ['RubikMedium'],
        'rubik-semibold': ['RubikSemiBold'],
        'rubik-bold': ['RubikBold'],
        'rubik-extrabold': ['RubikExtraBold'],
      },
      borderRadius: {
        md: '10px',
        lg: '13px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
