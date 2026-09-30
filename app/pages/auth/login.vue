<script setup lang="ts">
import {
	ExternalLinkIcon,
	GraduationCapIcon,
	LoaderCircleIcon,
	ShieldCheckIcon,
} from "@lucide/vue";

definePageMeta({
	layout: "auth",
});

const runtimeConfig = useRuntimeConfig();

const loading = ref(false);
const error = ref("");

const hemisStudentLogin = () => {
	useCookie("hemis_type").value = "student";
	navigateTo(
		`${runtimeConfig.public.hemisStudentURL}?client_id=${runtimeConfig.public.hemisClientID}&redirect_uri=${runtimeConfig.public.hemisRedirectUri}&response_type=code`,
		{
			external: true,
		},
	);
};
</script>

<template>
	<div class="flex min-h-dvh items-center justify-center px-5 py-8">
		<div class="grid w-full max-w-sm gap-6">
			<!-- BRAND -->

			<div class="text-center">
				<div
					class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg"
				>
					<GraduationCapIcon class="h-8 w-8" />
				</div>

				<h1 class="mt-5 text-2xl font-bold tracking-tight">
					Amaliyot tizimi
				</h1>

				<p
					class="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground"
				>
					Talabalar tizimga HEMIS akkaunti orqali kiradi.
				</p>
			</div>

			<!-- LOGIN CARD -->

			<Card class="rounded-[28px] shadow-sm">
				<CardContent class="grid gap-5 p-5">
					<div>
						<h2 class="text-lg font-bold">Tizimga kirish</h2>

						<p class="mt-1 text-sm leading-5 text-muted-foreground">
							Davomat, topshiriqlar va amaliyot ma’lumotlarini
							ko‘rish uchun HEMIS orqali tasdiqlang.
						</p>
					</div>

					<Button
						size="lg"
						class="h-12 w-full rounded-2xl text-base font-semibold"
						:disabled="loading"
						@click="hemisStudentLogin"
					>
						<LoaderCircleIcon
							v-if="loading"
							class="mr-2 h-5 w-5 animate-spin"
						/>

						<ExternalLinkIcon v-else class="mr-2 h-5 w-5" />

						{{
							loading
								? "Yo‘naltirilmoqda..."
								: "HEMIS orqali kirish"
						}}
					</Button>

					<div
						v-if="error"
						class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
					>
						{{ error }}
					</div>
				</CardContent>
			</Card>

			<!-- INFO -->

			<div class="flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background"
				>
					<ShieldCheckIcon class="h-4 w-4 text-primary" />
				</div>

				<div>
					<p class="text-sm font-semibold">Xavfsiz kirish</p>

					<p class="mt-1 text-xs leading-5 text-muted-foreground">
						Parolingiz ushbu tizimda saqlanmaydi. Autentifikatsiya
						HEMIS orqali amalga oshiriladi.
					</p>
				</div>
			</div>
		</div>
	</div>
</template>
