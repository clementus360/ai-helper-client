<!-- src/routes/auth/callback/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';

	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			// Get URL parameters
			const urlParams = new URLSearchParams(window.location.search);
			const type = urlParams.get('type');

			const { data, error: sessionError } = await supabase.auth.getSession();

			if (sessionError) {
				console.error('Error getting session:', sessionError);
				error = 'Authentication failed. Please try again.';
				loading = false;
				return;
			}

			if (data.session) {
				// Check if this is a password recovery flow
				if (type === 'recovery') {
					// This is a password reset - redirect to reset password page
					goto('/reset-password');
				} else {
					// Regular login/signup - redirect to dashboard
					goto('/dashboard');
				}
			} else {
				// No session found, redirect to login
				goto('/login');
			}
		} catch (err) {
			console.error('Callback error:', err);
			error = 'Something went wrong. Please try again.';
			loading = false;
		}
	});
</script>

<div class="flex h-screen w-full items-center justify-center">
	<div class="flex flex-col items-center gap-4">
		{#if loading}
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black"></div>
			<p class="text-sm text-gray-600">Processing authentication...</p>
		{:else if error}
			<div class="text-center">
				<p class="mb-4 text-red-600">{error}</p>
				<a href="/login" class="text-emerald-600 hover:underline"> Return to login </a>
			</div>
		{/if}
	</div>
</div>
