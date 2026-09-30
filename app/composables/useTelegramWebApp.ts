import type { WebApp } from "telegram-web-app";

function sleep(ms: number) {
	return new Promise<void>((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

export default function useTelegramWebApp() {
	const { toggleTheme } = useTheme();
	const webApp = shallowRef<WebApp | null>(null);

	const initialized = ref(false);

	const initializing = ref(false);

	const available = ref(false);

	const error = ref("");

	async function waitForTelegram(timeoutMs = 1000) {
		if (!import.meta.client) {
			return null;
		}

		const startedAt = Date.now();

		while (Date.now() - startedAt < timeoutMs) {
			const tg = window.Telegram?.WebApp;

			if (tg) {
				return tg;
			}

			await sleep(100);
		}

		return null;
	}

	async function init() {
		if (initialized.value && webApp.value) {
			return webApp.value;
		}

		if (initializing.value) {
			while (initializing.value) {
				await sleep(50);
			}

			return webApp.value;
		}

		initializing.value = true;

		error.value = "";

		try {
			const tg = await waitForTelegram();

			if (!tg) {
				available.value = false;

				throw new Error("Telegram WebApp mavjud emas.");
			}

			webApp.value = tg;

			available.value = true;

			tg.ready();

			tg.expand();

			initialized.value = true;

			/*
			 * Theme o'zgarsa reactive
			 * state ham yangilanadi.
			 */

			tg.onEvent("themeChanged", toggleTheme);

			return tg;
		} catch (e) {
			error.value =
				e instanceof Error
					? e.message
					: "Telegram WebApp initialization xatosi.";

			throw e;
		} finally {
			initializing.value = false;
		}
	}

	return {
		webApp,
		init,
	};
}
