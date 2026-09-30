<script setup lang="ts">
import {
	CalendarDaysIcon,
	CheckCheckIcon,
	Clock3Icon,
	LockKeyholeIcon,
	MapPinIcon,
	ScanFaceIcon,
	TriangleAlertIcon,
} from "@lucide/vue";
import type { LocationData } from "telegram-web-app";

definePageMeta({
	layout: "student",
});

/* ----------------------------------
 * TIMELINE
 * ---------------------------------- */

const START_HOUR = 8;
const END_HOUR = 14;

const HOUR_HEIGHT = 84;

const hours = Array.from(
	{
		length: END_HOUR - START_HOUR + 1,
	},
	(_, index) => START_HOUR + index,
);

type StepStatus = "completed" | "available" | "missed" | "locked";

interface StepItem {
	step: number;
	start: string;
	end: string;

	status: StepStatus;

	completed_at?: string;
}

const steps = ref<StepItem[]>([
	{
		step: 1,
		start: "08:00",
		end: "10:00",
		status: "completed",
		completed_at: "08:23",
	},
	{
		step: 2,
		start: "10:00",
		end: "12:00",
		status: "available",
	},
	{
		step: 3,
		start: "12:00",
		end: "14:00",
		status: "locked",
	},
]);

/* ----------------------------------
 * CURRENT TIME
 * ---------------------------------- */

const now = ref(new Date());

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
	timer = setInterval(() => {
		now.value = new Date();
	}, 30_000);
});

onBeforeUnmount(() => {
	if (timer) {
		clearInterval(timer);
	}
});

const currentTimeText = computed(() => {
	return now.value.toLocaleTimeString("uz-UZ", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
});

const currentTimeTop = computed(() => {
	const hour = now.value.getHours();

	const minute = now.value.getMinutes();

	if (hour < START_HOUR || hour >= END_HOUR) {
		return null;
	}

	const minutes = (hour - START_HOUR) * 60 + minute;

	return (minutes / 60) * HOUR_HEIGHT;
});

/* ----------------------------------
 * STEP POSITION
 * ---------------------------------- */

function minutesFromStart(value: string) {
	const [hour, minute] = value.split(":").map(Number);

	return (hour - START_HOUR) * 60 + minute;
}

function stepStyle(step: StepItem) {
	const start = minutesFromStart(step.start);

	const end = minutesFromStart(step.end);

	const top = (start / 60) * HOUR_HEIGHT;

	const height = ((end - start) / 60) * HOUR_HEIGHT;

	return {
		top: `${top + 5}px`,

		height: `${Math.max(height - 10, 74)}px`,
	};
}

/* ----------------------------------
 * UI
 * ---------------------------------- */

const completedCount = computed(
	() => steps.value.filter((step) => step.status === "completed").length,
);

function statusText(status: StepStatus) {
	if (status === "completed") {
		return "Bajarildi";
	}

	if (status === "available") {
		return "Ochiq";
	}

	if (status === "missed") {
		return "O‘tkazildi";
	}

	return "Yopiq";
}

const tma = useTelegramWebApp();

const location = ref<LocationData | null>(null);

const locationLoading = ref(false);

const locationError = ref("");

async function requestLocation() {
	locationLoading.value = true;
	locationError.value = "";

	try {
		await tma.init();

		location.value = await tma.getLocation();
	} catch (e) {
		location.value = null;

		locationError.value =
			e instanceof Error ? e.message : "Joylashuvni aniqlab bo‘lmadi.";
	} finally {
		locationLoading.value = false;
	}
}

onMounted(async () => {
	try {
		await tma.init();
	} catch (e) {
		console.error(e);
	}
});
</script>

<template>
	<div class="grid w-full max-w-md min-w-sm gap-5 p-5 pb-18">
		<!-- =========================
		     STUDENT CARD
		     ========================= -->

		<Card>
			<CardContent>
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0 flex-1">
						<h1
							class="mt-1 truncate text-xl font-bold tracking-tight"
						>
							Abdurashid G‘ulomov
						</h1>

						<p
							class="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground"
						>
							TABIIY_2023_09-Guruh (Geografiya va IBA), o‘zbek
						</p>
					</div>

					<Avatar
						class="h-14 w-14 shrink-0 border-2 border-background shadow-sm"
					>
						<AvatarImage
							src="https://api.practicum.samdpi.uz/media/attendance_attempts/2026/09/29/attendance_OzxuUSg.jpg"
						/>

						<AvatarFallback> AG </AvatarFallback>
					</Avatar>
				</div>

				<!-- INFO -->
			</CardContent>
		</Card>

		<Card>
			<CardContent class="p-4">
				<div class="flex items-start justify-between gap-4">
					<div class="flex min-w-0 items-start gap-3">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
						>
							<MapPinIcon class="h-5 w-5" />
						</div>

						<div class="min-w-0">
							<p class="font-semibold">Joylashuv</p>

							<p
								v-if="!location"
								class="mt-0.5 text-xs text-muted-foreground"
							>
								Davomat uchun joylashuvingizni aniqlang
							</p>

							<p v-else class="mt-0.5 text-xs text-emerald-600">
								Joylashuv olindi
							</p>
						</div>
					</div>

					<Button
						v-if="!location"
						size="sm"
						:disabled="locationLoading"
						@click="requestLocation"
					>
						<LoaderCircleIcon
							v-if="locationLoading"
							class="mr-2 h-4 w-4 animate-spin"
						/>

						<MapPinIcon v-else class="mr-2 h-4 w-4" />

						{{ locationLoading ? "Aniqlanmoqda..." : "Aniqlash" }}
					</Button>

					<Button
						v-else
						size="sm"
						variant="outline"
						:disabled="locationLoading"
						@click="requestLocation"
					>
						<LoaderCircleIcon
							v-if="locationLoading"
							class="mr-2 h-4 w-4 animate-spin"
						/>

						<MapPinIcon v-else class="mr-2 h-4 w-4" />

						Yangilash
					</Button>
				</div>

				<!-- LOCATION DATA -->

				<div v-if="location" class="mt-4 grid grid-cols-2 gap-2">
					<div class="rounded-xl bg-muted/60 p-3">
						<p class="text-[10px] text-muted-foreground">
							Latitude
						</p>

						<p class="mt-1 break-all font-mono text-xs font-medium">
							{{ location.latitude }}
						</p>
					</div>

					<div class="rounded-xl bg-muted/60 p-3">
						<p class="text-[10px] text-muted-foreground">
							Longitude
						</p>

						<p class="mt-1 break-all font-mono text-xs font-medium">
							{{ location.longitude }}
						</p>
					</div>

					<div
						class="col-span-2 flex items-center justify-between rounded-xl bg-muted/60 p-3"
					>
						<div>
							<p class="text-[10px] text-muted-foreground">
								Aniqlik
							</p>

							<p class="mt-1 text-sm font-semibold">
								<template
									v-if="location.horizontal_accuracy !== null"
								>
									{{
										location.horizontal_accuracy.toFixed(1)
									}}
									metr
								</template>

								<template v-else> — </template>
							</p>
						</div>

						<Badge
							v-if="location.horizontal_accuracy !== null"
							:variant="
								location.horizontal_accuracy <= 50
									? 'default'
									: 'secondary'
							"
							class="rounded-full"
						>
							{{
								location.horizontal_accuracy <= 50
									? "Yaxshi"
									: "O‘rtacha"
							}}
						</Badge>
					</div>
				</div>

				<!-- ERROR -->

				<div
					v-if="locationError"
					class="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive"
				>
					{{ locationError }}
				</div>
			</CardContent>
		</Card>

		<!-- =========================
		     ATTENDANCE HEADER
		     ========================= -->

		<div class="flex items-end justify-between">
			<div>
				<div class="flex items-center gap-2">
					<div class="p-1 bg-primary rounded-lg">
						<CalendarDaysIcon class="h-5 w-5" />
					</div>

					<h2 class="text-lg font-bold">{{ tma.user }}</h2>
				</div>

				<p class="mt-1 text-xs text-muted-foreground">
					3 ta qadamdan
					{{ completedCount }}
					tasi bajarildi
				</p>
			</div>

			<Badge variant="secondary" class="rounded-full">
				{{ completedCount }}
				/ 3
			</Badge>
		</div>

		<!-- =========================
		     TIMELINE
		     ========================= -->

		<Card>
			<CardContent class="pl-0">
				<div
					class="relative"
					:style="{
						height: (END_HOUR - START_HOUR) * HOUR_HEIGHT + 'px',
					}"
				>
					<!-- HOURS -->

					<div
						v-for="hour in hours"
						:key="hour"
						class="absolute inset-x-0 flex"
						:style="{
							top: (hour - START_HOUR) * HOUR_HEIGHT + 'px',
						}"
					>
						<div class="w-13 shrink-0 pr-2 text-right">
							<span
								class="text-[10px] font-medium text-muted-foreground"
							>
								{{ String(hour).padStart(2, "0") }}:00
							</span>
						</div>

						<div class="relative flex-1">
							<div
								class="absolute left-2 right-0 top-1.75 border-t border-dashed border-border/70"
							/>
						</div>
					</div>

					<!-- VERTICAL AXIS -->

					<div
						class="absolute bottom-0 left-15.25 top-1.75 w-px bg-border"
					/>

					<!-- =========================
					     STEP CARDS
					     ========================= -->

					<div
						v-for="step in steps"
						:key="step.step"
						class="absolute left-19 right-1"
						:style="stepStyle(step)"
					>
						<!-- COMPLETED -->

						<div
							v-if="step.status === 'completed'"
							class="flex h-full flex-col justify-between rounded-[20px] border-2 border-emerald-500 bg-emerald-500/10 p-3 text-emerald-600 shadow-sm"
						>
							<div class="flex items-start justify-between gap-2">
								<div>
									<p class="font-bold">
										{{ step.step }}-qadam
									</p>

									<p class="mt-0.5 text-[10px] opacity-80">
										{{ step.start }}
										—
										{{ step.end }}
									</p>
								</div>

								<Badge
									class="rounded-full bg-emerald-600 text-white hover:bg-emerald-600"
								>
									{{ statusText(step.status) }}
								</Badge>
							</div>

							<div class="flex items-end justify-between">
								<div>
									<p class="text-[10px] opacity-70">
										Tasdiqlangan
									</p>

									<div
										class="mt-0.5 flex items-center gap-1 text-xs font-semibold"
									>
										<Clock3Icon class="h-3.5 w-3.5" />

										<code>{{ step.completed_at }}</code>
									</div>
								</div>

								<div
									class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white"
								>
									<CheckCheckIcon class="h-5 w-5" />
								</div>
							</div>
						</div>

						<!-- AVAILABLE -->

						<div
							v-else-if="step.status === 'available'"
							class="flex h-full flex-col justify-between rounded-[20px] border-2 border-primary border-dashed bg-primary/10 p-3 text-primary shadow-sm"
						>
							<div class="flex items-start justify-between gap-2">
								<div>
									<p class="font-bold">
										{{ step.step }}-qadam
									</p>

									<p class="mt-0.5 text-[10px] opacity-80">
										{{ step.start }}
										—
										{{ step.end }}
									</p>
								</div>

								<Badge class="rounded-full">
									{{ statusText(step.status) }}
								</Badge>
							</div>

							<div class="flex items-end justify-between">
								<div>
									<p class="text-[10px] opacity-70">
										FaceID va GPS
									</p>

									<p class="mt-0.5 text-xs font-semibold">
										Tasdiqlash mumkin
									</p>
								</div>

								<Button
									size="icon"
									class="h-10 w-10 rounded-full"
								>
									<ScanFaceIcon class="h-5 w-5" />
								</Button>
							</div>
						</div>

						<!-- MISSED -->

						<div
							v-else-if="step.status === 'missed'"
							class="flex h-full flex-col justify-between rounded-[20px] border-2 border-dashed border-rose-500 bg-rose-500/10 p-3 text-rose-600"
						>
							<div class="flex items-start justify-between gap-2">
								<div>
									<p class="font-bold">
										{{ step.step }}-qadam
									</p>

									<p class="mt-0.5 text-[10px]">
										{{ step.start }}
										—
										{{ step.end }}
									</p>
								</div>

								<Badge
									variant="destructive"
									class="rounded-full"
								>
									O‘tkazildi
								</Badge>
							</div>

							<div class="flex items-center justify-between">
								<p class="text-xs font-medium">Vaqti tugagan</p>

								<TriangleAlertIcon class="h-5 w-5" />
							</div>
						</div>

						<!-- LOCKED -->

						<div
							v-else
							class="flex h-full flex-col justify-between rounded-[20px] border-2 bg-muted/60 p-3 text-muted-foreground"
						>
							<div class="flex items-start justify-between gap-2">
								<div>
									<p class="font-bold text-foreground">
										{{ step.step }}-qadam
									</p>

									<p class="mt-0.5 text-[10px]">
										{{ step.start }}
										—
										{{ step.end }}
									</p>
								</div>

								<Badge variant="outline" class="rounded-full">
									Yopiq
								</Badge>
							</div>

							<div class="flex items-center justify-between">
								<p class="text-[11px]">Vaqti kelmagan</p>

								<div
									class="flex h-9 w-9 items-center justify-center rounded-full bg-background"
								>
									<LockKeyholeIcon class="h-4 w-4" />
								</div>
							</div>
						</div>
					</div>

					<!-- =========================
					     CURRENT TIME LINE
					     ========================= -->

					<div
						v-if="currentTimeTop !== null"
						class="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
						:style="{
							top: currentTimeTop + 'px',
						}"
					>
						<!-- TIME LABEL -->

						<div
							class="relative z-20 rounded-full bg-rose-500 px-2 py-1 text-[9px] font-bold leading-none text-white shadow-md"
						>
							{{ currentTimeText }}
						</div>

						<!-- DOT -->

						<div
							class="-ml-0.5 h-3 w-3 shrink-0 rounded-full border-[3px] border-background bg-rose-500 shadow"
						/>

						<!-- LINE -->

						<div
							class="h-0.5 flex-1 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.45)]"
						/>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- FOOT NOTE -->
	</div>
</template>
