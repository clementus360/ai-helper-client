<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';

	onMount(async () => {
		// This parses the hash and stores the session
		const { data, error } = await supabase.auth.getSession();

		if (error) {
			console.error('Error retrieving session:', error.message);
			return;
		}

		if (data.session) {
			console.log('Session loaded from URL:', data.session);
			window.location.href = '/dashboard';
		} else {
			console.warn('No session found');
		}
	});
</script>

<AuthGuard requireAuth={false}>
	<div class="flex h-screen flex-col items-center justify-center gap-4 text-center">
		<h1 class="font-outfit text-6xl">You're all set!</h1>
		<p class="font-inter w-10/12 text-center text-sm font-light">
			Thanks for confirming your email. Redirecting to your dashboard...
		</p>
	</div>
</AuthGuard>
