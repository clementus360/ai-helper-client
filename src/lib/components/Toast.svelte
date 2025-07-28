<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { CheckCircle, WarningCircle, XCircle, Info } from 'phosphor-svelte';

	export let message: string;
	export let type: 'success' | 'error' | 'warning' | 'info' = 'info';
	export let duration: number = 3000;

	let visible = true;

	const close = () => (visible = false);

	onMount(() => {
		const timeout = setTimeout(close, duration);
		return () => clearTimeout(timeout);
	});

	const iconMap = {
		success: CheckCircle,
		error: XCircle,
		warning: WarningCircle,
		info: Info
	};

	const styleMap = {
		success: 'bg-emerald-600 text-white',
		error: 'bg-red-600 text-white',
		warning: 'bg-yellow-400 text-black',
		info: 'bg-gray-800 text-white'
	};

	$: Icon = iconMap[type] ?? Info;
	$: styles = styleMap[type] ?? styleMap.info;
</script>

{#if visible}
	<div
		in:fly={{ x: 100, duration: 250 }}
		out:fade={{ duration: 200 }}
		class={`fixed right-4 bottom-4 z-50 w-80 rounded-lg p-4 shadow-lg transition-all duration-300 ${styles}`}
	>
		<div class="flex items-start justify-between gap-3">
			<div class="flex items-start gap-2">
				<Icon size={20} weight="bold" class="mt-0.5 flex-shrink-0" />
				<p class="text-sm leading-snug">{message}</p>
			</div>
			<button
				on:click={close}
				class="text-sm text-white/60 transition-colors hover:text-white"
				aria-label="Close toast"
			>
				✕
			</button>
		</div>
	</div>
{/if}
