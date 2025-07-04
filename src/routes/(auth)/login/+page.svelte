<!-- src/routes/login/+page.svelte -->
<script lang="ts">
	import { X, Check, EyeSlash, Eye } from 'phosphor-svelte';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';

	let email = '';
	let password = '';
	let error = '';
	let success = '';
	let loading = false;

	let showPassword = false;

	async function handleLogin() {
		error = '';
		success = '';
		loading = true;

		const { error: loginError } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		loading = false;

		if (loginError) {
			error = loginError.message;
		} else {
			success = 'Login successful! Redirecting...';
			// The auth store will handle the redirect automatically
			// But we can also explicitly redirect after a short delay
			setTimeout(() => {
				goto('/dashboard');
			}, 800);

			// Clear fields
			email = '';
			password = '';
		}
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	// Cleanup
	onDestroy(() => {
		email = '';
		password = '';
		error = '';
		success = '';
		loading = false;
	});
</script>

<AuthGuard requireAuth={false}>
	<div class="flex h-full w-full flex-col items-center justify-center gap-16">
		<div class="flex flex-col items-center gap-2">
			<h1 class="font-outfit text-6xl text-center">Welcome Back!</h1>
			<p class="font-inter w-10/12 text-center text-sm font-light">
				Let's jump right in and let's get things moving.
			</p>
		</div>

		<form on:submit|preventDefault={handleLogin} class="flex w-10/12 max-w-md flex-col gap-8">
			<div class="flex flex-col gap-4">
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

				<input
					type="email"
					placeholder="Email"
					bind:value={email}
					class="rounded-full border border-black px-8 py-3 text-sm font-light text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
					required
				/>

				<div class="flex flex-col gap-2">
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
					<a
						href="/forgot-password"
						class="self-end text-sm font-light text-emerald-600 hover:underline"
					>
						Forgot password?
					</a>
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
					Log In
				{/if}
			</button>
		</form>

		<p class="mt-4 text-sm font-light">
			Don't have an account?
			<a href="/signup" class="text-emerald-600 hover:underline">Sign up</a>
		</p>
	</div>
</AuthGuard>
