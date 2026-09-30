/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primaryDark: '#4F46E5',
        primary: '#6366F1',
        primaryLight: '#EEF2FF',
        accent: '#8B5CF6',
        sidebar: '#1E1B4B',
        background: '#F5F5FF',
        surface: '#FFFFFF',
        inputBg: '#F8F8FF',
        border: '#E5E7EB',
        glassBorder: 'rgba(99,102,241,0.16)',
        textPrimary: '#111827',
        textSecondary: '#374151',
        textMuted: '#6B7280',
        textPlaceholder: '#9CA3AF',
        success: '#10B981',
        successBg: '#DCFCE7',
        warning: '#F59E0B',
        warningBg: '#FEF3C7',
        danger: '#EF4444',
        dangerBg: '#FEE2E2',
      },
      fontFamily: {
        regular: ['Poppins-Regular'],
        medium: ['Poppins-Medium'],
        semibold: ['Poppins-SemiBold'],
        bold: ['Poppins-Bold'],
        extrabold: ['Poppins-ExtraBold'],
      },
    },
  },
  plugins: [],
};
