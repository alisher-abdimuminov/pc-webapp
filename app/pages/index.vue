<script setup lang="ts">
import {
	FaceLandmarker,
	FilesetResolver,
	type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

import {
	CalendarDaysIcon,
	CheckCheckIcon,
	Clock3Icon,
	LoaderCircleIcon,
	LockKeyholeIcon,
	MapPinIcon,
	ScanFaceIcon,
	TriangleAlertIcon,
	XIcon,
} from "@lucide/vue";

import type { TodayAttendance, TodayAttendanceStep } from "@/types/api";

definePageMeta({
	layout: "student",
});

const { api, errorMessage } = useApi();

const auth = useAuthStore();

const tma = useTelegramWebApp();

/* ==================================
 * TYPES
 * ================================== */

interface AttendanceLocation {
	latitude: number;
	longitude: number;

	accuracy: number | null;

	source: "telegram" | "browser";
}

type TimelineStep = TodayAttendanceStep & {
	completed_at?: string | null;
};

/* ==================================
 * ATTENDANCE
 * ================================== */

const attendance = ref<TodayAttendance | null>(null);

const loading = ref(false);

const error = ref("");

let refreshTimer: ReturnType<typeof setInterval> | null = null;

/* ==================================
 * TELEGRAM / ENVIRONMENT
 * ================================== */

const isTelegramMiniApp = ref(false);

async function initEnvironment() {
	try {
		const tg = await tma.init();

		isTelegramMiniApp.value = Boolean(tg?.initData);
	} catch {
		/*
		 * Telegram tashqarisida
		 * oddiy web sifatida ishlaydi.
		 */
		isTelegramMiniApp.value = false;
	}
}

/* ==================================
 * TODAY
 * ================================== */

async function loadToday() {
	loading.value = true;
	error.value = "";

	try {
		attendance.value = await api<TodayAttendance>("/attendance/today/");

		syncServerClock(attendance.value.server_time);
	} catch (e) {
		error.value = errorMessage(e);
	} finally {
		loading.value = false;
	}
}

/* ==================================
 * LOCATION
 * ================================== */

const location = ref<AttendanceLocation | null>(null);

const locationLoading = ref(false);

const locationError = ref("");

const locationSourceText = computed(() => {
	if (!location.value) {
		return "";
	}

	return location.value.source === "telegram" ? "Telegram" : "Browser";
});

/* ----------------------------------
 * TELEGRAM LOCATION
 * ---------------------------------- */

async function getTelegramLocation(): Promise<AttendanceLocation> {
	const result = await tma.getLocation();

	if (!result) {
		throw new Error("Telegram joylashuvni qaytarmadi.");
	}

	return {
		latitude: result.latitude,

		longitude: result.longitude,

		accuracy: result.horizontal_accuracy ?? null,

		source: "telegram",
	};
}

/* ----------------------------------
 * BROWSER LOCATION
 * ---------------------------------- */

function getBrowserLocation(): Promise<AttendanceLocation> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Browser joylashuvni qo‘llab-quvvatlamaydi."));

			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					latitude: position.coords.latitude,

					longitude: position.coords.longitude,

					accuracy: position.coords.accuracy,

					source: "browser",
				});
			},

			() => {
				reject(new Error("Joylashuvni olishga ruxsat berilmadi."));
			},

			{
				enableHighAccuracy: true,

				timeout: 15000,

				maximumAge: 0,
			},
		);
	});
}

/* ----------------------------------
 * UNIFIED LOCATION
 * ---------------------------------- */

async function getCurrentLocation(): Promise<AttendanceLocation> {
	if (isTelegramMiniApp.value) {
		return await getTelegramLocation();
	}

	return await getBrowserLocation();
}

/* ----------------------------------
 * LOCATION CARD
 * ---------------------------------- */

async function requestLocation() {
	locationLoading.value = true;

	locationError.value = "";

	try {
		location.value = await getCurrentLocation();

		if (isTelegramMiniApp.value) {
			tma.successHaptic();
		}
	} catch (e) {
		location.value = null;

		locationError.value =
			e instanceof Error ? e.message : "Joylashuvni aniqlab bo‘lmadi.";

		if (isTelegramMiniApp.value) {
			tma.errorHaptic();
		}
	} finally {
		locationLoading.value = false;
	}
}

/* ==================================
 * TIMELINE
 * ================================== */

const HOUR_HEIGHT = 84;

function timeToMinutes(value: string) {
	const [hour, minute] = value.split(":").map(Number);

	return hour * 60 + minute;
}

const timelineSteps = computed<TimelineStep[]>(
	() => (attendance.value?.steps ?? []) as TimelineStep[],
);

const START_HOUR = computed(() => {
	if (!timelineSteps.value.length) {
		return 8;
	}

	const minimum = Math.min(
		...timelineSteps.value.map((step) => timeToMinutes(step.start)),
	);

	return Math.floor(minimum / 60);
});

const END_HOUR = computed(() => {
	if (!timelineSteps.value.length) {
		return 14;
	}

	const maximum = Math.max(
		...timelineSteps.value.map((step) => timeToMinutes(step.end)),
	);

	return Math.ceil(maximum / 60);
});

const hours = computed(() =>
	Array.from(
		{
			length: END_HOUR.value - START_HOUR.value + 1,
		},

		(_, index) => START_HOUR.value + index,
	),
);

function minutesFromStart(value: string) {
	return timeToMinutes(value) - START_HOUR.value * 60;
}

function stepStyle(step: TimelineStep) {
	const start = minutesFromStart(step.start);

	const end = minutesFromStart(step.end);

	const top = (start / 60) * HOUR_HEIGHT;

	const height = ((end - start) / 60) * HOUR_HEIGHT;

	return {
		top: `${top + 5}px`,

		height: `${Math.max(height - 10, 74)}px`,
	};
}

const completedCount = computed(
	() =>
		timelineSteps.value.filter((step) => step.status === "completed")
			.length,
);

/* ==================================
 * CURRENT TIME
 * ================================== */

const now = ref(new Date());

let serverBaseTime: number | null = null;

let serverSyncedAt = Date.now();

function syncServerClock(value?: string) {
	if (!value) {
		serverBaseTime = null;

		now.value = new Date();

		return;
	}

	const parsed = new Date(value).getTime();

	if (Number.isNaN(parsed)) {
		return;
	}

	serverBaseTime = parsed;

	serverSyncedAt = Date.now();

	updateCurrentTime();
}

function updateCurrentTime() {
	if (serverBaseTime !== null) {
		now.value = new Date(serverBaseTime + (Date.now() - serverSyncedAt));

		return;
	}

	now.value = new Date();
}

const currentTimeText = computed(() =>
	now.value.toLocaleTimeString("uz-UZ", {
		hour: "2-digit",

		minute: "2-digit",

		hour12: false,
	}),
);

const currentTimeTop = computed(() => {
	const hour = now.value.getHours();

	const minute = now.value.getMinutes();

	if (hour < START_HOUR.value || hour >= END_HOUR.value) {
		return null;
	}

	const minutes = (hour - START_HOUR.value) * 60 + minute;

	return (minutes / 60) * HOUR_HEIGHT;
});

/* ==================================
 * FACE ID
 * ================================== */

const faceDrawerOpen = ref(false);

const activeStep = ref<TimelineStep | null>(null);

const verifying = ref(false);

const verifyError = ref("");

const locationStatus = ref("");

const videoRef = ref<HTMLVideoElement | null>(null);

const faceLandmarker = shallowRef<FaceLandmarker | null>(null);

const mediaPipeLoading = ref(false);

const faceDetected = ref(false);

const faceReady = ref(false);

const faceMessage = ref("Yuzingizni oval ichiga joylashtiring.");

const faceProgress = ref(0);

const cameraStream = ref<MediaStream | null>(null);

let animationFrameId: number | null = null;

let lastVideoTime = -1;

let stableStartedAt: number | null = null;

let autoSubmitting = false;

const STABLE_DURATION = 3000;

/* ==================================
 * MEDIAPIPE INIT
 * ================================== */

async function initFaceLandmarker() {
	if (faceLandmarker.value) {
		return;
	}

	mediaPipeLoading.value = true;

	try {
		const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");

		faceLandmarker.value = await FaceLandmarker.createFromOptions(vision, {
			baseOptions: {
				modelAssetPath: "/models/face_landmarker.task",
			},

			runningMode: "VIDEO",

			numFaces: 2,

			minFaceDetectionConfidence: 0.7,

			minFacePresenceConfidence: 0.7,

			minTrackingConfidence: 0.7,

			outputFaceBlendshapes: false,

			outputFacialTransformationMatrixes: true,
		});
	} finally {
		mediaPipeLoading.value = false;
	}
}

/* ==================================
 * FACE ROTATION
 * ================================== */

function rodriguesRotationVectorFromMatrix(rotationMatrix: number[]) {
	const trace = rotationMatrix[0] + rotationMatrix[4] + rotationMatrix[8];

	const cosAngle = Math.max(
		-1,

		Math.min(
			1,

			(trace - 1) / 2,
		),
	);

	const angle = Math.acos(cosAngle);

	if (Math.abs(angle) < 0.00001) {
		return [0, 0, 0];
	}

	const denominator = 2 * Math.sin(angle);

	if (Math.abs(denominator) < 0.00001) {
		return [0, 0, 0];
	}

	const axis = [
		(rotationMatrix[7] - rotationMatrix[5]) / denominator,

		(rotationMatrix[2] - rotationMatrix[6]) / denominator,

		(rotationMatrix[3] - rotationMatrix[1]) / denominator,
	];

	return axis.map((component) => (component * angle * 180) / Math.PI);
}

function rotationMatrixFromFaceMatrix(data: number[]) {
	if (data.length < 16) {
		return null;
	}

	return [
		data[0],
		data[1],
		data[2],

		data[4],
		data[5],
		data[6],

		data[8],
		data[9],
		data[10],
	];
}

/* ==================================
 * FACE BOUNDS
 * ================================== */

function getFaceBounds(landmarks: NormalizedLandmark[]) {
	let minX = 1;
	let minY = 1;

	let maxX = 0;
	let maxY = 0;

	for (const point of landmarks) {
		minX = Math.min(minX, point.x);

		minY = Math.min(minY, point.y);

		maxX = Math.max(maxX, point.x);

		maxY = Math.max(maxY, point.y);
	}

	return {
		width: maxX - minX,

		height: maxY - minY,

		centerX: (minX + maxX) / 2,

		centerY: (minY + maxY) / 2,
	};
}

/* ==================================
 * FACE VALIDATION
 * ================================== */

function validateFaceFrame(
	landmarks: NormalizedLandmark[],

	matrixData: number[] | undefined,
) {
	const bounds = getFaceBounds(landmarks);

	const centeredX = Math.abs(bounds.centerX - 0.5) <= 0.11;

	const centeredY = Math.abs(bounds.centerY - 0.48) <= 0.13;

	if (!centeredX || !centeredY) {
		return {
			valid: false,

			message: "Yuzingizni oval markaziga joylashtiring.",
		};
	}

	if (bounds.width < 0.24 || bounds.height < 0.32) {
		return {
			valid: false,

			message: "Kameraga biroz yaqinroq keling.",
		};
	}

	if (bounds.width > 0.68 || bounds.height > 0.82) {
		return {
			valid: false,

			message: "Kameradan biroz uzoqlashing.",
		};
	}

	if (!matrixData || matrixData.length < 16) {
		return {
			valid: false,

			message: "Yuz holati aniqlanmoqda...",
		};
	}

	const rotationMatrix = rotationMatrixFromFaceMatrix(matrixData);

	if (!rotationMatrix) {
		return {
			valid: false,

			message: "Yuz holati aniqlanmadi.",
		};
	}

	const rotation = rodriguesRotationVectorFromMatrix(rotationMatrix);

	const pitch = Math.abs(rotation[0] || 0);

	const yaw = Math.abs(rotation[1] || 0);

	const roll = Math.abs(rotation[2] || 0);

	if (yaw > 15) {
		return {
			valid: false,

			message: "Boshingizni kameraga to‘g‘ri qarating.",
		};
	}

	if (pitch > 15) {
		return {
			valid: false,

			message: "Boshingizni tepaga yoki pastga egmang.",
		};
	}

	if (roll > 12) {
		return {
			valid: false,

			message: "Boshingizni tik tuting.",
		};
	}

	return {
		valid: true,

		message: "Yuz aniqlandi. Harakatlanmang.",
	};
}

/* ==================================
 * CAMERA
 * ================================== */

async function startCamera() {
	await initFaceLandmarker();

	if (!navigator.mediaDevices?.getUserMedia) {
		throw new Error("Kamera mavjud emas.");
	}

	const stream = await navigator.mediaDevices.getUserMedia({
		video: {
			facingMode: "user",

			width: {
				ideal: 720,
			},

			height: {
				ideal: 720,
			},
		},

		audio: false,
	});

	cameraStream.value = stream;

	await nextTick();

	if (!videoRef.value) {
		throw new Error("Video element topilmadi.");
	}

	videoRef.value.srcObject = stream;

	await videoRef.value.play();

	startFaceTracking();
}

/* ==================================
 * FACE TRACKING
 * ================================== */

function startFaceTracking() {
	stopFaceTracking();

	faceDetected.value = false;

	faceReady.value = false;

	faceProgress.value = 0;

	faceMessage.value = "Yuzingizni oval ichiga joylashtiring.";

	stableStartedAt = null;

	lastVideoTime = -1;

	const detect = async () => {
		const video = videoRef.value;

		const landmarker = faceLandmarker.value;

		if (!video || !landmarker || !faceDrawerOpen.value) {
			return;
		}

		if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
			animationFrameId = requestAnimationFrame(detect);

			return;
		}

		if (video.currentTime === lastVideoTime) {
			animationFrameId = requestAnimationFrame(detect);

			return;
		}

		lastVideoTime = video.currentTime;

		try {
			const result = landmarker.detectForVideo(video, performance.now());

			const faces = result.faceLandmarks;

			if (faces.length === 0) {
				resetStableFace("Yuz aniqlanmadi.");

				animationFrameId = requestAnimationFrame(detect);

				return;
			}

			if (faces.length !== 1) {
				resetStableFace("Kadrda faqat bitta yuz bo‘lishi kerak.");

				animationFrameId = requestAnimationFrame(detect);

				return;
			}

			faceDetected.value = true;

			const matrix = result.facialTransformationMatrixes?.[0];

			const validation = validateFaceFrame(faces[0], matrix?.data);

			if (!validation.valid) {
				resetStableFace(validation.message);

				animationFrameId = requestAnimationFrame(detect);

				return;
			}

			faceMessage.value = validation.message;

			const current = performance.now();

			if (stableStartedAt === null) {
				stableStartedAt = current;
			}

			const elapsed = current - stableStartedAt;

			faceProgress.value = Math.min(
				100,

				(elapsed / STABLE_DURATION) * 100,
			);

			if (elapsed >= STABLE_DURATION) {
				faceReady.value = true;

				faceProgress.value = 100;

				faceMessage.value = "Yuz tasdiqlandi.";

				if (!autoSubmitting) {
					autoSubmitting = true;

					stopFaceTracking();

					await submitVerifiedFace();
				}

				return;
			}
		} catch {
			resetStableFace("Yuzni aniqlashda xatolik.");
		}

		animationFrameId = requestAnimationFrame(detect);
	};

	animationFrameId = requestAnimationFrame(detect);
}

function resetStableFace(message: string) {
	stableStartedAt = null;

	faceReady.value = false;

	faceProgress.value = 0;

	faceMessage.value = message;
}

function stopFaceTracking() {
	if (animationFrameId !== null) {
		cancelAnimationFrame(animationFrameId);

		animationFrameId = null;
	}

	stableStartedAt = null;
}

function stopCamera() {
	stopFaceTracking();

	if (cameraStream.value) {
		for (const track of cameraStream.value.getTracks()) {
			track.stop();
		}
	}

	cameraStream.value = null;

	if (videoRef.value) {
		videoRef.value.srcObject = null;
	}

	faceDetected.value = false;

	faceReady.value = false;

	faceProgress.value = 0;

	stableStartedAt = null;

	autoSubmitting = false;
}

/* ==================================
 * CAPTURE
 * ================================== */

function captureImage(): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const video = videoRef.value;

		if (!video || !video.videoWidth || !video.videoHeight) {
			reject(new Error("Kamera tasviri tayyor emas."));

			return;
		}

		const canvas = document.createElement("canvas");

		canvas.width = video.videoWidth;

		canvas.height = video.videoHeight;

		const context = canvas.getContext("2d");

		if (!context) {
			reject(new Error("Rasm olinmadi."));

			return;
		}

		context.drawImage(video, 0, 0, canvas.width, canvas.height);

		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error("Rasm olinmadi."));

					return;
				}

				resolve(blob);
			},

			"image/jpeg",

			0.92,
		);
	});
}

/* ==================================
 * OPEN FACE
 * ================================== */

function openFace(step: TimelineStep) {
	if (step.status !== "available") {
		return;
	}

	activeStep.value = step;

	verifyError.value = "";

	locationStatus.value = "";

	faceDrawerOpen.value = true;
}

watch(faceDrawerOpen, async (open) => {
	if (open) {
		autoSubmitting = false;

		faceProgress.value = 0;

		faceReady.value = false;

		faceMessage.value = "Yuzingizni oval ichiga joylashtiring.";

		try {
			await startCamera();
		} catch (e) {
			verifyError.value = errorMessage(e);
		}

		return;
	}

	stopCamera();

	activeStep.value = null;
});

/* ==================================
 * SUBMIT FACE
 * ================================== */

async function submitVerifiedFace() {
	if (!activeStep.value || !videoRef.value) {
		autoSubmitting = false;

		return;
	}

	verifying.value = true;

	verifyError.value = "";

	locationStatus.value = isTelegramMiniApp.value
		? "Telegram orqali joylashuv aniqlanmoqda..."
		: "Browser orqali joylashuv aniqlanmoqda...";

	try {
		/*
		 * Har bir FaceID attempt uchun
		 * yangi location olinadi.
		 *
		 * Location carddagi oldingi
		 * qiymat ishlatilmaydi.
		 */
		const [image, position] = await Promise.all([
			captureImage(),

			getCurrentLocation(),
		]);

		location.value = position;

		locationStatus.value = "Joylashuv olindi.";

		const formData = new FormData();

		formData.append(
			"face_image",

			image,

			`attendance-${Date.now()}.jpg`,
		);

		formData.append(
			"latitude",

			String(position.latitude),
		);

		formData.append(
			"longitude",

			String(position.longitude),
		);

		await api("/attendance/check/", {
			method: "POST",

			body: formData,
		});

		if (isTelegramMiniApp.value) {
			tma.successHaptic();
		}

		faceDrawerOpen.value = false;

		await loadToday();
	} catch (e) {
		if (isTelegramMiniApp.value) {
			tma.errorHaptic();
		}

		verifyError.value = errorMessage(e);

		autoSubmitting = false;

		await loadToday();

		if (faceDrawerOpen.value) {
			startFaceTracking();
		}
	} finally {
		verifying.value = false;
	}
}

/* ==================================
 * USER UI
 * ================================== */

const userName = computed(
	() => auth.user?.full_name || auth.user?.username || "Talaba",
);

const userGroup = computed(
	() => auth.user?.group_name || "Guruh biriktirilmagan",
);

const userImage = computed(
	() => auth.user?.image_url || auth.user?.image || "",
);

const userInitials = computed(() => {
	const value = userName.value
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((item) => item[0]?.toUpperCase() || "")
		.join("");

	return value || "T";
});

/* ==================================
 * LIFECYCLE
 * ================================== */

onMounted(async () => {
	await initEnvironment();

	await loadToday();

	updateCurrentTime();

	refreshTimer = setInterval(
		async () => {
			updateCurrentTime();

			if (!faceDrawerOpen.value) {
				await loadToday();
			}
		},

		60_000,
	);
});

onBeforeUnmount(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer);

		refreshTimer = null;
	}

	stopCamera();

	faceLandmarker.value?.close();

	faceLandmarker.value = null;
});
</script>

<template>
	<div class="mx-auto grid w-full min-w-sm max-w-md gap-5 p-5 pb-24">
		<!-- =========================
		     STUDENT
		     ========================= -->

		<Card class="rounded-[28px]">
			<CardContent class="p-5">
				<div class="flex items-center justify-between gap-4">
					<div class="min-w-0 flex-1">
						<h1 class="truncate text-xl font-bold tracking-tight">
							{{ userName }}
						</h1>

						<p
							class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground"
						>
							{{ userGroup }}

							<template v-if="auth.user?.faculty">
								•
								{{ auth.user.faculty }}
							</template>
						</p>
					</div>

					<Avatar
						class="h-14 w-14 shrink-0 border-2 border-background shadow-sm"
					>
						<AvatarImage v-if="userImage" :src="userImage" />

						<AvatarFallback>
							{{ userInitials }}
						</AvatarFallback>
					</Avatar>
				</div>
			</CardContent>
		</Card>

		<!-- =========================
		     LOCATION
		     ========================= -->

		<Card class="rounded-[28px]">
			<CardContent class="p-4">
				<div class="flex items-center justify-between gap-4">
					<div class="flex min-w-0 items-center gap-3">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
						>
							<MapPinIcon class="h-6 w-6" />
						</div>

						<div class="min-w-0">
							<p class="font-bold">Joylashuv</p>

							<p
								v-if="!location"
								class="mt-1 text-xs leading-5 text-muted-foreground"
							>
								Davomat uchun joylashuvingizni aniqlang
							</p>

							<div v-else class="mt-1">
								<p class="text-xs font-medium text-emerald-600">
									Joylashuv olindi
								</p>

								<p
									class="mt-0.5 text-[10px] text-muted-foreground"
								>
									{{ locationSourceText }}

									<template v-if="location.accuracy !== null">
										•
										{{ location.accuracy.toFixed(0) }}
										m
									</template>
								</p>
							</div>
						</div>
					</div>

					<Button
						class="shrink-0 rounded-full"
						:variant="location ? 'outline' : 'default'"
						:disabled="locationLoading"
						@click="requestLocation"
					>
						<LoaderCircleIcon
							v-if="locationLoading"
							class="mr-2 h-4 w-4 animate-spin"
						/>

						<MapPinIcon v-else class="mr-2 h-4 w-4" />

						{{
							locationLoading
								? "Aniqlanmoqda"
								: location
									? "Yangilash"
									: "Aniqlash"
						}}
					</Button>
				</div>

				<div
					v-if="locationError"
					class="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive"
				>
					{{ locationError }}
				</div>
			</CardContent>
		</Card>

		<!-- =========================
		     ERROR
		     ========================= -->

		<div
			v-if="error"
			class="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
		>
			{{ error }}
		</div>

		<!-- =========================
		     LOADING
		     ========================= -->

		<Card v-if="loading && !attendance" class="rounded-[28px]">
			<CardContent class="flex h-48 items-center justify-center">
				<LoaderCircleIcon class="mr-2 h-5 w-5 animate-spin" />

				Yuklanmoqda...
			</CardContent>
		</Card>

		<!-- =========================
		     NO SCHEDULE
		     ========================= -->

		<Card
			v-else-if="attendance && !attendance.has_schedule"
			class="rounded-[28px]"
		>
			<CardContent
				class="flex min-h-52 flex-col items-center justify-center p-6 text-center"
			>
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"
				>
					<CalendarDaysIcon class="h-6 w-6 text-muted-foreground" />
				</div>

				<h2 class="mt-4 font-bold">Bugun amaliyot yo‘q</h2>

				<p class="mt-2 max-w-64 text-sm text-muted-foreground">
					Siz yoki guruhingiz uchun bugunga jadval belgilanmagan.
				</p>
			</CardContent>
		</Card>

		<!-- =========================
		     ATTENDANCE
		     ========================= -->

		<template v-else-if="attendance?.has_schedule">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
					>
						<CalendarDaysIcon class="h-5 w-5" />
					</div>

					<div>
						<h2 class="text-xl font-bold">Bugungi davomat</h2>

						<p class="mt-0.5 text-xs text-muted-foreground">
							{{ attendance.shift_name }}

							<template v-if="attendance.location?.name">
								•
								{{ attendance.location.name }}
							</template>
						</p>
					</div>
				</div>

				<Badge variant="secondary" class="rounded-full">
					{{ completedCount }}
					/
					{{ timelineSteps.length }}
				</Badge>
			</div>

			<!-- =====================
			     TIMELINE
			     ===================== -->

			<Card class="overflow-hidden rounded-[28px]">
				<CardContent class="pl-0 pr-3 pt-5">
					<div
						class="relative"
						:style="{
							height:
								(END_HOUR - START_HOUR) * HOUR_HEIGHT + 'px',
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

						<!-- VERTICAL LINE -->

						<div
							class="absolute bottom-0 left-15.25 top-1.75 w-px bg-border"
						/>

						<!-- =================
						     STEP CARDS
						     ================= -->

						<div
							v-for="step in timelineSteps"
							:key="step.step"
							class="absolute left-19 right-1"
							:style="stepStyle(step)"
						>
							<!-- COMPLETED -->

							<div
								v-if="step.status === 'completed'"
								class="flex h-full flex-col justify-between rounded-[20px] border-2 border-emerald-500 bg-emerald-500/10 p-3 text-emerald-600 shadow-sm"
							>
								<div
									class="flex items-start justify-between gap-2"
								>
									<div>
										<p class="font-bold">
											{{ step.step }}-qadam
										</p>

										<p
											class="mt-0.5 text-[10px] opacity-80"
										>
											{{ step.start }}
											—
											{{ step.end }}
										</p>
									</div>

									<Badge
										class="rounded-full bg-emerald-600 text-white hover:bg-emerald-600"
									>
										Bajarildi
									</Badge>
								</div>

								<div class="flex items-end justify-between">
									<div>
										<p class="text-[10px] opacity-70">
											Tasdiqlangan
										</p>

										<div
											class="mt-1 flex items-center gap-1 text-xs font-semibold"
										>
											<Clock3Icon class="h-3.5 w-3.5" />

											<code>
												{{
													step.completed_at ||
													"Tasdiqlandi"
												}}
											</code>
										</div>
									</div>

									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white"
									>
										<CheckCheckIcon class="h-5 w-5" />
									</div>
								</div>
							</div>

							<!-- AVAILABLE -->

							<div
								v-else-if="step.status === 'available'"
								class="flex h-full flex-col justify-between rounded-[20px] border-2 border-dashed border-primary bg-primary/10 p-3 text-primary shadow-sm"
							>
								<div
									class="flex items-start justify-between gap-2"
								>
									<div>
										<p class="font-bold">
											{{ step.step }}-qadam
										</p>

										<p
											class="mt-0.5 text-[10px] opacity-80"
										>
											{{ step.start }}
											—
											{{ step.end }}
										</p>
									</div>

									<Badge class="rounded-full"> Ochiq </Badge>
								</div>

								<div class="flex items-end justify-between">
									<div>
										<p class="text-[10px] opacity-70">
											FaceID va joylashuv
										</p>

										<p class="mt-0.5 text-xs font-semibold">
											Tasdiqlash mumkin
										</p>
									</div>

									<Button
										size="icon"
										class="h-10 w-10 rounded-full"
										@click="openFace(step)"
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
								<div
									class="flex items-start justify-between gap-2"
								>
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
									<p class="text-xs font-medium">
										Vaqti tugagan
									</p>

									<TriangleAlertIcon class="h-5 w-5" />
								</div>
							</div>

							<!-- LOCKED -->

							<div
								v-else
								class="flex h-full flex-col justify-between rounded-[20px] border-2 bg-muted/60 p-3 text-muted-foreground"
							>
								<div
									class="flex items-start justify-between gap-2"
								>
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

									<Badge
										variant="outline"
										class="rounded-full"
									>
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

						<!-- =================
						     CURRENT TIME
						     ================= -->

						<div
							v-if="currentTimeTop !== null"
							class="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
							:style="{
								top: currentTimeTop + 'px',
							}"
						>
							<div
								class="relative z-20 rounded-full bg-rose-500 px-2 py-1 text-[9px] font-bold leading-none text-white shadow-md"
							>
								{{ currentTimeText }}
							</div>

							<div
								class="-ml-0.5 h-3 w-3 shrink-0 rounded-full border-[3px] border-background bg-rose-500 shadow"
							/>

							<div
								class="h-0.5 flex-1 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.45)]"
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</template>

		<!-- =========================
		     FACE DRAWER
		     ========================= -->

		<Drawer v-model:open="faceDrawerOpen">
			<DrawerContent class="mx-auto h-[95dvh] max-w-md">
				<DrawerHeader class="relative">
					<DrawerTitle>
						{{ activeStep?.step }}-qadamni tasdiqlash
					</DrawerTitle>

					<DrawerDescription>
						Yuzingizni oval ichiga joylashtiring.
					</DrawerDescription>

					<Button
						variant="ghost"
						size="icon"
						class="absolute right-3 top-3 rounded-full"
						:disabled="verifying"
						@click="faceDrawerOpen = false"
					>
						<XIcon class="h-5 w-5" />
					</Button>
				</DrawerHeader>

				<div class="flex-1 overflow-y-auto px-4 pb-8">
					<!-- CAMERA -->

					<div
						class="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[32px] bg-black"
					>
						<video
							ref="videoRef"
							autoplay
							playsinline
							muted
							class="h-full w-full scale-x-[-1] object-cover"
						/>

						<!-- OVAL -->

						<div
							class="pointer-events-none absolute inset-0 flex items-center justify-center"
						>
							<svg class="h-[78%] w-[72%]" viewBox="0 0 200 260">
								<ellipse
									cx="100"
									cy="130"
									rx="78"
									ry="112"
									fill="none"
									stroke="rgba(255,255,255,.3)"
									stroke-width="5"
								/>

								<ellipse
									cx="100"
									cy="130"
									rx="78"
									ry="112"
									fill="none"
									stroke="currentColor"
									stroke-width="5"
									stroke-linecap="round"
									pathLength="100"
									:stroke-dasharray="100"
									:stroke-dashoffset="100 - faceProgress"
									class="text-white transition-[stroke-dashoffset] duration-100"
									transform="rotate(-90 100 130)"
								/>
							</svg>
						</div>

						<div
							v-if="mediaPipeLoading"
							class="absolute inset-0 flex items-center justify-center bg-black/60 px-5 text-center text-sm text-white"
						>
							<LoaderCircleIcon
								class="mr-2 h-4 w-4 animate-spin"
							/>

							Yuz tekshiruvi tayyorlanmoqda...
						</div>
					</div>

					<!-- MESSAGE -->

					<div class="mt-5 text-center">
						<p class="font-semibold">
							{{ faceMessage }}
						</p>

						<p
							v-if="faceProgress > 0 && faceProgress < 100"
							class="mt-1 text-sm text-muted-foreground"
						>
							{{
								Math.ceil(
									(STABLE_DURATION *
										(1 - faceProgress / 100)) /
										1000,
								)
							}}
							soniya harakatlanmang
						</p>

						<p
							v-if="verifying"
							class="mt-2 text-sm text-muted-foreground"
						>
							FaceID va joylashuv tekshirilmoqda...
						</p>
					</div>

					<!-- LOCATION STATUS -->

					<div
						v-if="locationStatus"
						class="mt-4 flex items-center gap-3 rounded-2xl bg-muted/60 p-4 text-sm"
					>
						<MapPinIcon class="h-5 w-5 shrink-0 text-primary" />

						{{ locationStatus }}
					</div>

					<!-- ERROR -->

					<div
						v-if="verifyError"
						class="mt-4 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive"
					>
						{{ verifyError }}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	</div>
</template>
