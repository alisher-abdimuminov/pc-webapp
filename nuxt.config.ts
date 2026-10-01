import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	css: ["~/assets/css/tailwind.css"],

	devServer: {
		host: "127.0.0.1",
		port: 3000,
	},

	vite: {
		plugins: [tailwindcss()],
	},

	// nitro: {
	// 	preset: "bun",
	// },

	modules: ["shadcn-nuxt", "@pinia/nuxt"],

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

	runtimeConfig: {
		public: {
			apiBase: "https://api.pc.samdpi.uz/api",
			// apiBase: "http://127.0.0.1:8000/api",
			hemisStudentURL: "https://student.samdpi.uz/oauth/authorize",
			hemisClientID: "15",
			hemisRedirectUri:
				"https://pc-webapp-umber.vercel.app/auth/callback/",
			// hemisRedirectUri: "http://127.0.0.1:3000/auth/callback/",
		},
	},
});
