export default defineNuxtPlugin((nuxtApp) => {
	const { theme } = useTheme();

	if (import.meta.server) {
		useHead({
			htmlAttrs: {
				class: theme.value,
			},
		});
	}

	return {
		provide: {
			theme: useTheme().theme,
			isDark: useTheme().isDark,
			toggleTheme: useTheme().toggleTheme,
		},
	};
});
