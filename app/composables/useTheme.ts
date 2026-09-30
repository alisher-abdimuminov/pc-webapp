export default function useTheme() {
	const theme = useCookie<"dark" | "light">("theme", {
		default: () => "dark",
		sameSite: "lax",
	});

	const isDark = computed({
		get: () => theme.value === "dark",

		set(value: boolean) {
			theme.value = value ? "dark" : "light";
		},
	});

	const toggleTheme = () => {
		theme.value = theme.value === "dark" ? "light" : "dark";
	};

	useHead(() => ({
		htmlAttrs: {
			class: theme.value,
		},
	}));

	return {
		theme,
		isDark,
		toggleTheme,
	};
}
