// types/telegram.d.ts
import "@types/telegram-web-app";

declare global {
	interface Window {
		Telegram: {
			WebApp: typeof Telegram.WebApp;
		};
	}
}
