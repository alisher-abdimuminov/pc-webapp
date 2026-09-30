import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	css: ["~/assets/css/tailwind.css"],

	vite: {
		plugins: [tailwindcss()],
	},

	// nitro: {
	// 	preset: "bun",
	// },

	modules: ["shadcn-nuxt"],

	shadcn: {
		prefix: "",
		componentDir: "@/components/ui",
	},

	app: {
		head: {
			script: [
				{
					src: "https://telegram.org/js/telegram-web-app.js?63",
					tagPosition: "head",
				},
			],
		},
	},
});
