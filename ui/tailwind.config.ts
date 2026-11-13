import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'curio-green': 'rgb(21 128 61)', // Same as green-700
      },
      height: {
        '15': '3.75rem', // 60px
      }
    },
  },
  plugins: [],
};

export default config; 