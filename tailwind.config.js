/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
 theme: {
    extend: {
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            h2: {
              fontSize: theme("fontSize.2xl"),
              fontWeight: theme("fontWeight.semibold"),
              color: theme("colors.gray.800"),
            },
            h3: {
              fontSize: theme("fontSize.xl"),
              fontWeight: theme("fontWeight.semibold"),
            },
          },
        },
      }),
      keyframes: {
        scan: { from: { transform: "translateX(-25%)" }, to: { transform: "translateX(25%)" } },
      },
      animation: {
        scan: "scan 9s linear infinite",
      },
      fontFamily: {
        sans: ["var(--font-onest)", "system-ui", "sans-serif"],
        display: ["var(--font-onest)", "var(--font-manrope)", "system-ui", "sans-serif"],
        mono: ["var(--font-jbmono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};