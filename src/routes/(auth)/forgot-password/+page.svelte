<!-- src/routes/forgot-password/+page.svelte -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { Check, X } from 'phosphor-svelte';
	import { onDestroy } from 'svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';

	let email = '';
	let message = '';
	let error = '';
	let success = '';
	let loading = false;

	async function resetPassword() {
		error = '';
		success = '';
		loading = true;

		const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`
		});

		loading = false;

		if (resetError) {
			error = resetError.message;
		} else {
			success = 'Password reset link sent successfully!';
			message = 'Check your email for a password reset link. The link will be valid for 1 hour.';
			email = ''; // Clear the email field
		}
	}

	// Cleanup
	onDestroy(() => {
		email = '';
		message = '';
		error = '';
		success = '';
		loading = false;
	});
</script>

<AuthGuard requireAuth={false}>
	<div class="flex h-full w-full flex-col items-center justify-center gap-16">
		<div class="flex flex-col items-center gap-2">
			<h1 class="font-outfit text-5xl">Reset Password</h1>
			<p class="font-inter w-8/12 text-center text-sm font-light">
				Don't worry, we all forget things. Enter your email and we'll send you a link to reset your
				password.
			</p>
		</div>

		<form on:submit|preventDefault={resetPassword} class="flex w-10/12 max-w-md flex-col gap-8">
			{#if error}
				<div
					class="flex items-center gap-2 rounded-md border border-red-500 bg-red-100 px-4 py-2 font-thin text-red-800"
				>
					<X weight="thin" class="h-5 w-5 flex-shrink-0" />
					<span>{error}</span>
				</div>
			{/if}

			{#if success}
				<div
					class="flex items-center gap-2 rounded-md border border-green-500 bg-green-100 px-4 py-2 font-thin text-green-800"
				>
					<Check weight="thin" class="h-5 w-5 flex-shrink-0" />
					<span>{success}</span>
				</div>
			{/if}

			{#if message}
				<div class="rounded-md border border-blue-500 bg-blue-50 px-4 py-2 text-sm text-blue-800">
					{message}
				</div>
			{/if}

			<div class="flex flex-col gap-4">
				<input
					type="email"
					bind:value={email}
					placeholder="Your email"
					class="rounded-full border border-black px-8 py-3 text-sm font-light text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
					required
					disabled={loading}
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="rounded-full bg-black py-3 text-white transition-colors hover:bg-gray-900 disabled:opacity-50 cursor-pointer"
			>
				{#if loading}
					Sending...
				{:else}
					Send Reset Link
				{/if}
			</button>

			<a href="/login" class="text-center text-sm text-emerald-600 hover:underline">
				Back to login
			</a>
		</form>
	</div>
</AuthGuard>
