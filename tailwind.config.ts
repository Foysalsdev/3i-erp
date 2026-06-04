/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sap: {
          // Horizon Core Colors
          blue:           '#0070F2',
          blueDark:       '#0040B0',
          blueLight:      '#E8F3FF',
          shell:          '#1D2D3E',
          sidebar:        '#243342',
          sidebarHover:   '#2E4056',
          sidebarActive:  '#354A5E',

          // Status
          success:        '#107E3E',
          successLight:   '#F1FDF6',
          warning:        '#E9730C',
          warningLight:   '#FEF7F1',
          error:          '#BB0000',
          errorLight:     '#FFF0F0',
          info:           '#0070F2',
          infoLight:      '#E8F3FF',

          // Surface
          bg:             '#F5F6F7',
          surface:        '#FFFFFF',
          surfaceHover:   '#F0F4F9',
          overlay:        '#E8ECF0',

          // Text
          text:           '#1D2D3E',
          textSecondary:  '#556B82',
          textDisabled:   '#9DB0C5',
          textInverse:    '#FFFFFF',

          // Border
          border:         '#C5D0DC',
          borderFocus:    '#0070F2',
          borderError:    '#BB0000',
        }
      },
      borderRadius: {
        'sap-sm':  '4px',
        'sap':     '8px',
        'sap-lg':  '12px',
        'sap-xl':  '16px',
      },
      boxShadow: {
        'sap-card':   '0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        'sap-panel':  '0 2px 8px rgba(0,0,0,0.14)',
        'sap-modal':  '0 8px 32px rgba(0,0,0,0.20)',
        'sap-focus':  '0 0 0 3px rgba(0,112,242,0.25)',
      },
      fontFamily: {
        sap: ['"72"', '"SAP72"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'sap-xs':  ['11px', { lineHeight: '16px', fontWeight: '400' }],
        'sap-sm':  ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'sap-md':  ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'sap-lg':  ['16px', { lineHeight: '22px', fontWeight: '400' }],
        'sap-xl':  ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'sap-h1':  ['28px', { lineHeight: '36px', fontWeight: '700' }],
      },
      spacing: {
        'sap-xs':  '4px',
        'sap-sm':  '8px',
        'sap-md':  '16px',
        'sap-lg':  '24px',
        'sap-xl':  '32px',
        'sap-2xl': '48px',
      },
    }
  },
  plugins: [],
}
