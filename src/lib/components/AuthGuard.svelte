<!-- src/lib/components/AuthGuard.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';

	export let redirectTo = '/login';
	export let requireAuth = true;

	let mounted = false;

	onMount(() => {
		mounted = true;
	});

	$: if (mounted && !$auth.loading) {
		const isAuthenticated = !!$auth.user;
		const currentPath = $page.url.pathname;

		if (requireAuth && !isAuthenticated) {
			// User should be authenticated but isn't - redirect to login
			goto(redirectTo);
		} else if (!requireAuth && isAuthenticated) {
			// User shouldn't be authenticated but is - redirect to dashboard
			goto('/dashboard');
		}
	}
</script>

{#if $auth.loading}
	<div class="flex h-screen w-full items-center justify-center">
		<div class="flex flex-col items-center gap-4">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black"></div>
			<p class="text-sm text-gray-600">Loading...</p>
		</div>
	</div>
{:else if requireAuth && $auth.user}
	<slot />
{:else if !requireAuth && !$auth.user}
	<slot />
{/if}
