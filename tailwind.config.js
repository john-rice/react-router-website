const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  purge: ["./app/**/*.{ts,tsx}"],
  darkMode: "media", // or 'media' or 'class'
  theme: {
    fontFamily: {
      display: [
        '"Test Founders Grotesk"',
        '"Arial Black"',
        ...defaultTheme.fontFamily.sans,
      ],
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        sm: "1.5rem",
        md: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
        "2xl": "2.5rem",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: null,
            color: "rgba(18, 18, 18, 0.8)",
            "h1, h2, h3, h4, h5, h6": {
              fontFamily: theme("fontFamily.display").join(),
              color: theme("colors.black"),
            },
          },
        },
        dark: {
          css: {
            color: "rgba(255, 255, 255, 0.8)",
            a: {
              color: "inherit",
            },
            "h1, h2, h3, h4, h5, h6": {
              color: theme("colors.white"),
            },
            "a code, code, strong": {
              color: "inherit",
            },
          },
        },
      }),
    },
  },
  variants: {
    extend: {
      ringWidth: ["focus-visible"],
      ringColor: ["focus-visible"],
      ringOffsetWidth: ["focus-visible"],
      ringOffsetColor: ["focus-visible"],
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
