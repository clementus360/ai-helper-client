<!-- src/routes/signup/+page.svelte -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { Check, Eye, EyeSlash, X } from 'phosphor-svelte';
	import { onDestroy } from 'svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';

	let email = '';
	let password = '';
	let username = '';
	let error = '';
	let success = '';
	let loading = false;

	let showPassword = false;

	async function handleSignup() {
		error = '';
		success = '';
		loading = true;

		const { data, error: signupError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: { username },
				emailRedirectTo: `${window.location.origin}/auth/callback`
			}
		});

		loading = false;

		if (signupError) {
			error = signupError.message;
		} else {
			success = 'Account created successfully! Please check your email for verification.';
			// Clear form
			email = '';
			password = '';
			username = '';
		}
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	// Cleanup when user leaves the page
	onDestroy(() => {
		email = '';
		password = '';
		username = '';
		error = '';
		success = '';
		loading = false;
	});
</script>

<AuthGuard requireAuth={false}>
	<div class="flex h-full w-full flex-col items-center justify-center gap-16">
		<div class="flex flex-col items-center gap-2">
			<h1 class="font-outfit text-6xl text-center">Create Account</h1>
			<p class="font-inter w-10/12 text-center text-sm font-light">
				Join us and start making progress today.
			</p>
		</div>

		<form on:submit|preventDefault={handleSignup} class="flex w-10/12 max-w-md flex-col gap-8">
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
				<input
					type="text"
					placeholder="Username"
					bind:value={username}
					class="rounded-full border border-black px-8 py-3 text-sm font-light text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
					required
				/>

				<input
					type="email"
					placeholder="Email"
					bind:value={email}
					class="rounded-full border border-black px-8 py-3 text-sm font-light text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
					required
				/>

				<div class="relative">
					<input
						type={showPassword ? 'text' : 'password'}
						placeholder="Password"
						bind:value={password}
						class="w-full rounded-full border border-black px-8 py-3 pr-12 text-sm font-light text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
						required
						disabled={loading}
						minlength="6"
					/>
					<button
						type="button"
						on:click={togglePasswordVisibility}
						class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700"
					>
						{#if showPassword}
							<EyeSlash weight="thin" class="h-5 w-5" />
						{:else}
							<Eye weight="thin" class="h-5 w-5" />
						{/if}
					</button>
				</div>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="cursor-pointer rounded-full bg-black py-3 text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
			>
				{#if loading}
					please wait...
				{:else}
					Sign Up
				{/if}
			</button>
		</form>

		<p class="text-sm font-light">
			Already have an account?
			<a href="/login" class="text-emerald-600 hover:underline">Log in</a>
		</p>
	</div>
</AuthGuard>
