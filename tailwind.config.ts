import type { Config } from "tailwindcss";

/** Map an MD3 role CSS var to a Tailwind color that supports opacity. */
const role = (name: string) => `rgb(var(--md-${name}) / <alpha-value>)`;

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: role("primary"),
        "on-primary": role("on-primary"),
        "primary-container": role("primary-container"),
        "on-primary-container": role("on-primary-container"),

        secondary: role("secondary"),
        "on-secondary": role("on-secondary"),
        "secondary-container": role("secondary-container"),
        "on-secondary-container": role("on-secondary-container"),

        tertiary: role("tertiary"),
        "on-tertiary": role("on-tertiary"),
        "tertiary-container": role("tertiary-container"),
        "on-tertiary-container": role("on-tertiary-container"),

        error: role("error"),
        "on-error": role("on-error"),
        "error-container": role("error-container"),
        "on-error-container": role("on-error-container"),

        background: role("background"),
        "on-background": role("on-background"),
        surface: role("surface"),
        "on-surface": role("on-surface"),
        "surface-variant": role("surface-variant"),
        "on-surface-variant": role("on-surface-variant"),
        outline: role("outline"),
        "outline-variant": role("outline-variant"),

        "surface-dim": role("surface-dim"),
        "surface-bright": role("surface-bright"),
        "surface-lowest": role("surface-container-lowest"),
        "surface-low": role("surface-container-low"),
        "surface-container": role("surface-container"),
        "surface-high": role("surface-container-high"),
        "surface-highest": role("surface-container-highest"),

        "inverse-surface": role("inverse-surface"),
        "inverse-on-surface": role("inverse-on-surface"),
      },
      borderRadius: {
        // MD3 shape scale
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "28px",
        full: "9999px",
      },
      fontSize: {
        // MD3 type scale (subset)
        "display-sm": ["36px", { lineHeight: "44px", letterSpacing: "0" }],
        "headline-sm": ["24px", { lineHeight: "32px" }],
        "title-lg": ["22px", { lineHeight: "28px" }],
        "title-md": ["16px", { lineHeight: "24px", letterSpacing: "0.15px", fontWeight: "500" }],
        "title-sm": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "0.5px" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "0.25px" }],
        "body-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.4px" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
