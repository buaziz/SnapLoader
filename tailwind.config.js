module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'snap-yellow': '#FFFC00',
        'snap-black': '#000000',
        'snap-dark': '#1C1C1E', // Dark mode background often used by Snap
        'snap-gray': '#2C2C2E', // Secondary dark
        'snap-ghost': '#FAFAFA', // Off-white/Ghost white
      },
      fontFamily: {
        sans: ['Avenir Next', 'Avenir', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
