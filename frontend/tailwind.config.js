/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            animation: {
                "bounce-slow": "bounce 2s infinite",
                "pulse-slow": "pulse 3s infinite",
                "fade-in": "fadeIn 0.6s ease-in-out",
                "scale-in": "scaleIn 0.3s ease-out",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                scaleIn: {
                    "0%": { transform: "scale(0.95)", opacity: "0.8" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};
