<script setup lang="ts">
definePageMeta({ layout: "auth" });
import { Loader2, CircleAlert } from "@lucide/vue";

const route = useRoute();
const auth = useAuthStore();
const { api, errorMessage } = useApi();
const error = ref("");

onMounted(async () => {
	const code = String(route.query.code || "");
	const type = "student";

	if (!code) {
		error.value = "HEMIS authorization code topilmadi.";
		return;
	}
	try {
		const d = await api<any>("/auth/hemis/callback/", {
			method: "POST",
			body: { code, type },
		});
		auth.setSession(d);
		await navigateTo({ name: "index" });
	} catch (e) {
		error.value = errorMessage(e);
	}
});
</script>
<template>
	<div class="flex min-h-[calc(100vh-2rem)] items-center justify-center">
		<Card class="w-full max-w-md">
			<CardContent class="py-12 text-center">
				<template v-if="!error">
					<Loader2 class="mx-auto h-8 w-8 animate-spin" />
					<h1 class="mt-4 text-lg font-semibold">
						HEMIS tasdiqlanmoqda
					</h1>
					<p class="mt-1 text-sm">
						Profil ma’lumotlari olinmoqda.
					</p></template
				>
				<template v-else>
					<CircleAlert class="mx-auto h-8 w-8 text-red-600" />
					<h1 class="mt-4 font-semibold">Kirishda xatolik</h1>
					<p class="mt-2 text-sm text-red-600">{{ error }}</p>
					<Button
						class="mt-5"
						@click="navigateTo({ name: 'auth-login' })"
					>
						Kirish sahifasiga qaytish
					</Button>
				</template>
			</CardContent>
		</Card>
	</div>
</template>
