export default defineNuxtPlugin(() => {
	const { hash } = location;
	const router = useRouter();

	// If vue-router broke hash on init, restore it back.
	// See https://github.com/deptyped/vue-telegram/issues/18
	let needFixHash = router.currentRoute.value.hash !== hash;
	if (needFixHash) {
		router.afterEach(() => {
			if (needFixHash) {
				location.hash = hash;
				needFixHash = false;
			}
		});
	}
});
