export function useApi() {
	const config = useRuntimeConfig();
	const auth = useAuthStore();
	async function refreshToken() {
		if (!auth.refresh) throw new Error("Session tugagan");
		const data = await $fetch<{ access: string }>(
			`${config.public.apiBase}/auth/refresh/`,
			{ method: "POST", body: { refresh: auth.refresh } },
		);
		auth.access = data.access;
	}
	async function api<T>(path: string, options: any = {}): Promise<T> {
		const url = path.startsWith("http")
			? path
			: `${config.public.apiBase}${path}`;
		const headers: any = { ...(options.headers || {}) };
		if (auth.access) headers.Authorization = `Bearer ${auth.access}`;
		try {
			return await $fetch<T>(url, { ...options, headers });
		} catch (e: any) {
			if (
				e?.response?.status === 401 &&
				auth.refresh &&
				!options.__retried
			) {
				try {
					await refreshToken();
					return await api<T>(path, { ...options, __retried: true });
				} catch {
					auth.clear();
					await navigateTo("/login");
					throw e;
				}
			}
			throw e;
		}
	}
	function errorMessage(e: any) {
		const d = e?.data;
		if (typeof d?.detail === "string") return d.detail;
		if (typeof d === "string") return d;
		if (d && typeof d === "object")
			return Object.values(d).flat().join(", ");
		return e?.message || "Xatolik yuz berdi";
	}
	return { api, errorMessage };
}
