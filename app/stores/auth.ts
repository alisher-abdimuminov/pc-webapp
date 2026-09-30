import { defineStore } from "pinia";
import type { User, Role } from "@/types/auth";

export const useAuthStore = defineStore("auth", () => {
	const user = ref<User | null>(null);
	const access = useCookie<string | null>("pc_access", { sameSite: "lax" });
	const refresh = useCookie<string | null>("pc_refresh", { sameSite: "lax" });
	const loading = ref(false);

	const role = computed<Role | null>(() => user.value?.role || null);
	const isAuthenticated = computed(() => !!access.value);

	function setSession(payload: {
		user: User;
		tokens: { access: string; refresh: string };
	}) {
		user.value = payload.user;
		access.value = payload.tokens.access;
		refresh.value = payload.tokens.refresh;
	}
	function clear() {
		user.value = null;
		access.value = null;
		refresh.value = null;
	}
	async function fetchMe() {
		if (!access.value) {
			user.value = null;
			return null;
		}
		loading.value = true;
		try {
			user.value = await $fetch<User>(
				`${useRuntimeConfig().public.apiBase}/auth/me/`,
				{ headers: { Authorization: `Bearer ${access.value}` } },
			);
			return user.value;
		} catch {
			return null;
		} finally {
			loading.value = false;
		}
	}
	return {
		user,
		access,
		refresh,
		loading,
		role,
		isAuthenticated,
		setSession,
		clear,
		fetchMe,
	};
});
