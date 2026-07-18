import type { Config } from "tailwindcss";

// Single source of truth for WarrantyBuddy's visual identity.
// Change a value here to change it everywhere in the app.
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0F1F3D",
        teal: "#00C2A8",
        amber: "#F59E0B",
        red: "#E24B4A",
        cloud: "#F4F6F8",
        ink: "#5B6B82",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        body: ["var(--font-hanken-grotesk)"],
      },
    },
  },
} satisfies Config;
