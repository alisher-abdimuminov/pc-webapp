import type { WebApp } from "telegram-web-app";

/* ----------------------------------
 * SHARED STATE
 *
 * Composable bir nechta page/componentda
 * chaqirilsa ham bitta Telegram WebApp
 * instance ishlaydi.
 * ---------------------------------- */

const webApp = shallowRef<WebApp | null>(null);

const initialized = ref(false);
const initializing = ref(false);
const available = ref(false);
const error = ref("");

const version = ref("");
const platform = ref("");
const colorScheme = ref<"light" | "dark">("light");

const initData = ref("");

const isExpanded = ref(false);

const viewportHeight = ref(0);
const viewportStableHeight = ref(0);

/* ----------------------------------
 * LOCATION
 * ---------------------------------- */

const locationReady = ref(false);

const locationAvailable = ref(false);

const locationAccessRequested = ref(false);

const locationAccessGranted = ref(false);

/* ----------------------------------
 * HELPERS
 * ---------------------------------- */

function sleep(ms: number) {
	return new Promise<void>((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

/* ----------------------------------
 * COMPOSABLE
 * ---------------------------------- */

export default function useTelegramWebApp() {
	/* ----------------------------------
	 * DERIVED
	 * ---------------------------------- */

	const isTelegram = computed(() => available.value && webApp.value !== null);

	const user = computed(() => webApp.value?.initDataUnsafe?.user ?? null);

	const themeParams = computed(() => webApp.value?.themeParams ?? {});

	const locationManager = computed(
		() => webApp.value?.LocationManager ?? null,
	);

	const haptic = computed(() => webApp.value?.HapticFeedback ?? null);

	const mainButton = computed(() => webApp.value?.MainButton ?? null);

	const secondaryButton = computed(
		() => webApp.value?.SecondaryButton ?? null,
	);

	const backButton = computed(() => webApp.value?.BackButton ?? null);

	const settingsButton = computed(() => webApp.value?.SettingsButton ?? null);

	/* ----------------------------------
	 * WAIT TELEGRAM SCRIPT
	 * ---------------------------------- */

	async function waitForTelegram(timeoutMs = 3000) {
		if (!import.meta.client) {
			return null;
		}

		const startedAt = Date.now();

		while (Date.now() - startedAt < timeoutMs) {
			const tg = window.Telegram?.WebApp;

			if (tg) {
				return tg;
			}

			await sleep(50);
		}

		return null;
	}

	/* ----------------------------------
	 * SYNC STATE
	 * ---------------------------------- */

	function syncState() {
		const tg = webApp.value;

		if (!tg) {
			return;
		}

		version.value = tg.version || "";

		platform.value = tg.platform || "";

		colorScheme.value = tg.colorScheme;

		initData.value = tg.initData || "";

		isExpanded.value = tg.isExpanded;

		viewportHeight.value = tg.viewportHeight;

		viewportStableHeight.value = tg.viewportStableHeight;

		syncLocationState();
	}

	function syncLocationState() {
		const manager = webApp.value?.LocationManager;

		if (!manager) {
			locationReady.value = false;

			locationAvailable.value = false;

			locationAccessRequested.value = false;

			locationAccessGranted.value = false;

			return;
		}

		locationReady.value = manager.isInited;

		locationAvailable.value = manager.isLocationAvailable;

		locationAccessRequested.value = manager.isAccessRequested;

		locationAccessGranted.value = manager.isAccessGranted;
	}

	/* ----------------------------------
	 * TELEGRAM EVENTS
	 * ---------------------------------- */

	function handleThemeChanged() {
		syncState();
	}

	function handleViewportChanged() {
		syncState();
	}

	function handleLocationManagerUpdated() {
		syncLocationState();
	}

	/* ----------------------------------
	 * INIT
	 * ---------------------------------- */

	async function init() {
		if (initialized.value && webApp.value) {
			return webApp.value;
		}

		/*
		 * Bir vaqtda 2 ta component
		 * init() chaqirsa ikkinchisi
		 * kutadi.
		 */
		if (initializing.value) {
			while (initializing.value) {
				await sleep(20);
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

			/*
			 * Telegramga Mini App
			 * renderga tayyorligini
			 * bildiramiz.
			 */
			tg.ready();

			/*
			 * Maksimal mavjud
			 * balandlikka ochamiz.
			 */
			tg.expand();

			syncState();

			/* --------------------------
			 * EVENTS
			 * -------------------------- */

			tg.onEvent("themeChanged", handleThemeChanged);

			tg.onEvent("viewportChanged", handleViewportChanged);

			/*
			 * LocationManager yangi
			 * Telegram versiyalarida.
			 */
			if (tg.isVersionAtLeast("8.0")) {
				tg.onEvent(
					"locationManagerUpdated",
					handleLocationManagerUpdated,
				);
			}

			initialized.value = true;

			return tg;
		} catch (e) {
			error.value =
				e instanceof Error
					? e.message
					: "Telegram WebApp " + "initialization " + "xatosi.";

			throw e;
		} finally {
			initializing.value = false;
		}
	}

	/* ----------------------------------
	 * CLEANUP
	 * ---------------------------------- */

	function cleanup() {
		const tg = webApp.value;

		if (!tg) {
			return;
		}

		tg.offEvent("themeChanged", handleThemeChanged);

		tg.offEvent("viewportChanged", handleViewportChanged);

		if (tg.isVersionAtLeast("8.0")) {
			tg.offEvent("locationManagerUpdated", handleLocationManagerUpdated);
		}
	}

	/* ----------------------------------
	 * VERSION
	 * ---------------------------------- */

	function isVersionAtLeast(value: string) {
		return webApp.value?.isVersionAtLeast(value) ?? false;
	}

	/* ----------------------------------
	 * APP
	 * ---------------------------------- */

	function ready() {
		webApp.value?.ready();
	}

	function expand() {
		webApp.value?.expand();

		syncState();
	}

	function close() {
		webApp.value?.close();
	}

	/* ----------------------------------
	 * COLORS
	 * ---------------------------------- */

	function setHeaderColor(color: string) {
		webApp.value?.setHeaderColor(color);
	}

	function setBackgroundColor(color: string) {
		webApp.value?.setBackgroundColor(color);
	}

	function setBottomBarColor(color: string) {
		const tg = webApp.value;

		if (!tg || !tg.isVersionAtLeast("7.10")) {
			return;
		}

		tg.setBottomBarColor(color);
	}

	/* ----------------------------------
	 * LOCATION INIT
	 * ---------------------------------- */

	async function initLocation() {
		if (!webApp.value) {
			await init();
		}

		const tg = webApp.value;

		if (!tg) {
			throw new Error("Telegram WebApp " + "initialize qilinmagan.");
		}

		if (!tg.isVersionAtLeast("8.0")) {
			throw new Error(
				"Telegram versiyasi " +
					"LocationManager'ni " +
					"qo‘llab-quvvatlamaydi.",
			);
		}

		const manager = tg.LocationManager;

		if (!manager) {
			throw new Error("Telegram LocationManager " + "mavjud emas.");
		}

		if (manager.isInited) {
			syncLocationState();

			return manager;
		}

		await new Promise<void>((resolve) => {
			manager.init(() => {
				resolve();
			});
		});

		syncLocationState();

		return manager;
	}

	/* ----------------------------------
	 * GET LOCATION
	 * ---------------------------------- */

	async function getLocation() {
		const manager = await initLocation();

		if (!manager.isLocationAvailable) {
			throw new Error("Location qurilmada " + "mavjud emas.");
		}

		const location = await new Promise<
			NonNullable<Parameters<typeof manager.getLocation>[0]> extends (
				value: infer T,
			) => any
				? T
				: never
		>((resolve) => {
			manager.getLocation((location) => {
				resolve(location);
			});
		});

		syncLocationState();

		if (!location) {
			throw new Error("Location olishga " + "ruxsat berilmadi.");
		}

		return location;
	}

	/* ----------------------------------
	 * LOCATION SETTINGS
	 * ---------------------------------- */

	function openLocationSettings() {
		const manager = webApp.value?.LocationManager;

		if (!manager) {
			return;
		}

		manager.openSettings();
	}

	/* ----------------------------------
	 * HAPTIC
	 * ---------------------------------- */

	function impact(
		style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light",
	) {
		webApp.value?.HapticFeedback?.impactOccurred(style);
	}

	function notify(type: "error" | "success" | "warning") {
		webApp.value?.HapticFeedback?.notificationOccurred(type);
	}

	function selectionChanged() {
		webApp.value?.HapticFeedback?.selectionChanged();
	}

	/* ----------------------------------
	 * SHORT HAPTICS
	 * ---------------------------------- */

	function successHaptic() {
		notify("success");
	}

	function errorHaptic() {
		notify("error");
	}

	function warningHaptic() {
		notify("warning");
	}

	/* ----------------------------------
	 * BACK BUTTON
	 * ---------------------------------- */

	function showBackButton(handler: () => void) {
		const button = webApp.value?.BackButton;

		if (!button) {
			return;
		}

		button.onClick(handler);

		button.show();
	}

	function hideBackButton(handler?: () => void) {
		const button = webApp.value?.BackButton;

		if (!button) {
			return;
		}

		if (handler) {
			button.offClick(handler);
		}

		button.hide();
	}

	/* ----------------------------------
	 * MAIN BUTTON
	 * ---------------------------------- */

	function showMainButton(text: string, handler: () => void) {
		const button = webApp.value?.MainButton;

		if (!button) {
			return;
		}

		button.setText(text);

		button.onClick(handler);

		button.enable();

		button.show();
	}

	function hideMainButton(handler?: () => void) {
		const button = webApp.value?.MainButton;

		if (!button) {
			return;
		}

		if (handler) {
			button.offClick(handler);
		}

		button.hideProgress();
		button.hide();
	}

	function mainButtonLoading(value: boolean) {
		const button = webApp.value?.MainButton;

		if (!button) {
			return;
		}

		if (value) {
			button.disable();

			button.showProgress(true);

			return;
		}

		button.hideProgress();
		button.enable();
	}

	/* ----------------------------------
	 * ALERT
	 * ---------------------------------- */

	function showAlert(message: string) {
		return new Promise<void>((resolve) => {
			const tg = webApp.value;

			if (!tg) {
				window.alert(message);

				resolve();

				return;
			}

			tg.showAlert(message, () => {
				resolve();
			});
		});
	}

	/* ----------------------------------
	 * CONFIRM
	 * ---------------------------------- */

	function showConfirm(message: string) {
		return new Promise<boolean>((resolve) => {
			const tg = webApp.value;

			if (!tg) {
				resolve(window.confirm(message));

				return;
			}

			tg.showConfirm(message, (result) => {
				resolve(result);
			});
		});
	}

	return {
		/* --------------------------
		 * CORE
		 * -------------------------- */

		webApp,

		initialized,
		initializing,

		available,
		isTelegram,

		error,

		init,
		cleanup,

		ready,
		expand,
		close,

		/* --------------------------
		 * TELEGRAM INFO
		 * -------------------------- */

		version,
		platform,

		colorScheme,
		themeParams,

		initData,
		user,

		isExpanded,

		viewportHeight,
		viewportStableHeight,

		isVersionAtLeast,

		/* --------------------------
		 * COLORS
		 * -------------------------- */

		setHeaderColor,
		setBackgroundColor,
		setBottomBarColor,

		/* --------------------------
		 * LOCATION
		 * -------------------------- */

		locationManager,

		locationReady,
		locationAvailable,

		locationAccessRequested,
		locationAccessGranted,

		initLocation,
		getLocation,

		openLocationSettings,

		/* --------------------------
		 * HAPTIC
		 * -------------------------- */

		haptic,

		impact,
		notify,
		selectionChanged,

		successHaptic,
		errorHaptic,
		warningHaptic,

		/* --------------------------
		 * BUTTONS
		 * -------------------------- */

		backButton,
		mainButton,
		secondaryButton,
		settingsButton,

		showBackButton,
		hideBackButton,

		showMainButton,
		hideMainButton,

		mainButtonLoading,

		/* --------------------------
		 * POPUPS
		 * -------------------------- */

		showAlert,
		showConfirm,
	};
}
