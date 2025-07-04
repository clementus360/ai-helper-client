<!-- src/routes/reset-password/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { Check, X, Eye, EyeSlash } from 'phosphor-svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';

	let password = '';
	let confirmPassword = '';
	let error = '';
	let success = '';
	let loading = false;
	let showPassword = false;
	let showConfirmPassword = false;
	let validSession = false;
	let checkingSession = true;

	onMount(async () => {
		// Check if we have a valid session from the reset link
		try {
			const {
				data: { session },
				error: sessionError
			} = await supabase.auth.getSession();

			if (sessionError || !session) {
				error = 'Invalid or expired reset link. Please request a new password reset.';
				checkingSession = false;
				return;
			}

			validSession = true;
			checkingSession = false;
		} catch (err) {
			console.error('Session check error:', err);
			error = 'Something went wrong. Please try again.';
			checkingSession = false;
		}
	});

	async function updatePassword() {
		if (password !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters long.';
			return;
		}

		error = '';
		success = '';
		loading = true;

		const { error: updateError } = await supabase.auth.updateUser({
			password: password
		});

		loading = false;

		if (updateError) {
			error = updateError.message;
		} else {
			success = 'Password updated successfully! Redirecting to login...';

			// Clear form
			password = '';
			confirmPassword = '';

			// Redirect to dashboard after short delay
			setTimeout(() => {
				goto('/login');
			}, 2000);
		}
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	function toggleConfirmPasswordVisibility() {
		showConfirmPassword = !showConfirmPassword;
	}

	// Cleanup
	onDestroy(() => {
		password = '';
		confirmPassword = '';
		error = '';
		success = '';
		loading = false;
		showPassword = false;
		showConfirmPassword = false;
	});
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-16">
	<div class="flex flex-col items-center gap-2">
		<h1 class="font-outfit text-5xl">Set New Password</h1>
		<p class="font-inter w-8/12 text-center text-sm font-light">
			Enter your new password below. Make sure it's something you'll remember!
		</p>
	</div>

	{#if checkingSession}
		<div class="flex flex-col items-center gap-4">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black"></div>
			<p class="text-sm text-gray-600">Verifying reset link...</p>
		</div>
	{:else if !validSession}
		<div class="flex w-10/12 max-w-md flex-col gap-6 text-center">
			<div
				class="flex items-center gap-2 rounded-md border border-red-500 bg-red-100 px-4 py-2 font-thin text-red-800"
			>
				<X weight="thin" class="h-5 w-5 flex-shrink-0" />
				<span>{error}</span>
			</div>

			<div class="flex flex-col gap-4">
				<a
					href="/forgot-password"
					class="rounded-full bg-black py-3 text-white transition-colors hover:bg-gray-900"
				>
					Request New Reset Link
				</a>
				<a href="/login" class="text-sm text-emerald-600 hover:underline"> Back to login </a>
			</div>
		</div>
	{:else}
		<form on:submit|preventDefault={updatePassword} class="flex w-10/12 max-w-md flex-col gap-8">
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

			<div class="flex flex-col gap-4">
				<div class="relative">
					<input
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						placeholder="New password"
						class="w-full rounded-full border border-black px-8 py-3 pr-12 text-sm font-light text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
						required
						disabled={loading}
						minlength="6"
					/>
					<button
						type="button"
						on:click={togglePasswordVisibility}
						class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
					>
						{#if showPassword}
							<EyeSlash weight="thin" class="h-5 w-5" />
						{:else}
							<Eye weight="thin" class="h-5 w-5" />
						{/if}
					</button>
				</div>

				<div class="relative">
					<input
						type={showConfirmPassword ? 'text' : 'password'}
						bind:value={confirmPassword}
						placeholder="Confirm new password"
						class="w-full rounded-full border border-black px-8 py-3 pr-12 text-sm font-light text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
						required
						disabled={loading}
						minlength="6"
					/>
					<button
						type="button"
						on:click={toggleConfirmPasswordVisibility}
						class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
					>
						{#if showConfirmPassword}
							<EyeSlash weight="thin" class="h-5 w-5" />
						{:else}
							<Eye weight="thin" class="h-5 w-5" />
						{/if}
					</button>
				</div>

				<div class="text-xs text-gray-600">
					<p>Password requirements:</p>
					<ul class="mt-1 list-inside list-disc">
						<li>At least 6 characters long</li>
						<li>Passwords must match</li>
					</ul>
				</div>
			</div>

			<button
				type="submit"
				disabled={loading || !password || !confirmPassword}
				class="cursor-pointer rounded-full bg-black py-3 text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
			>
				{#if loading}
					Updating Password...
				{:else}
					Update Password
				{/if}
			</button>

			<a href="/login" class="text-center text-sm text-emerald-600 hover:underline">
				Back to login
			</a>
		</form>
	{/if}
</div>
