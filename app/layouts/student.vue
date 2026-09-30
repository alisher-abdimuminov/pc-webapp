<script setup lang="ts">
import { CalendarIcon, HomeIcon, ListTodoIcon } from "@lucide/vue";
</script>

<template>
	<div class="h-screen w-screen">
		<ScrollArea class="h-full">
			<div class="flex items-center justify-center">
				<slot />
			</div>
		</ScrollArea>
		<div
			class="z-50 fixed bottom-0 flex items-center justify-center p-3 w-full"
		>
			<Tabs default-value="home">
				<TabsList>
					<TabsTrigger value="home">
						<HomeIcon />
						<span>Bosh sahifa</span>
					</TabsTrigger>
					<TabsTrigger value="assignments">
						<ListTodoIcon />
						<!-- <span>Topshiriqlar</span> -->
					</TabsTrigger>
					<TabsTrigger value="attendance">
						<CalendarIcon />
						<!-- <span>Davomat</span> -->
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	</div>
</template>
