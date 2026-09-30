export default defineNuxtRouteMiddleware(async (to) => {
	// for webapp testing
	if (to.path.startsWith("/auth/")) return;
	const auth = useAuthStore();
	if (!auth.access) return navigateTo({ name: "auth-login" });
	if (!auth.user) {
		const u = await auth.fetchMe();
		if (!u) {
			auth.clear();
			return navigateTo({ name: "auth-login" });
		}
	}
});
