<script lang="ts">
	import { ArrowUpRight } from 'phosphor-svelte';
	import { goto } from '$app/navigation';
	import { sendMessage, updateSession } from '$lib/api';
	import { loadSessions } from '$lib/stores/sessions';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';

	$: currentUser = $auth.user;

	let isTransitioning = false;
	let pendingMessage: string | null = null;
	let isLoaded = false;

	let messageInput = '';
	let isInputFocused = false;

	const suggestions = [
		'Help me plan a project timeline',
		'Explain quantum computing in simple terms',
		'Write a professional email template',
		'Suggest ways to improve team productivity',
		'Create a study schedule for learning new skills',
		'Help me brainstorm marketing ideas'
	];

	onMount(() => {
		// Trigger animations after component mounts
		setTimeout(() => {
			isLoaded = true;
		}, 100);
	});

	async function handleFirstMessage(message: string) {
		isTransitioning = true;
		pendingMessage = message;

		try {
			const response = await sendMessage({
				message,
				force_new: true // Force new session for first message
			});

			if (!response.success) {
				throw new Error(response.error || 'Failed to send message');
			}

			console.log('Chat session created:', response);

			const chatId = response.session_id;
			const chatName = message.slice(0, 50) + (message.length > 50 ? '...' : '');

			// Update title on server if necessary
			try {
				await updateSession(chatId, { title: chatName });
			} catch (err) {
				console.error('Failed to update session name:', err);
			}

			// Wait a moment for smooth transition effect
			await new Promise((resolve) => setTimeout(resolve, 500));

			await loadSessions();

			// Navigate
			goto(`/dashboard/chat/${chatId}`);
		} catch (error) {
			console.error('Failed to create chat session:', error);
		} finally {
			isTransitioning = false;
			pendingMessage = null;
		}
	}

	async function sendLocalMessage() {
		if (!messageInput.trim() || isTransitioning) return;

		const message = messageInput.trim();
		messageInput = '';

		await handleFirstMessage(message);
	}

	function useSuggestion(suggestion: string) {
		messageInput = suggestion;
		sendLocalMessage();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendLocalMessage();
		}
	}
</script>

<div class="mx-auto flex h-full max-w-4xl flex-col px-4 sm:px-6 lg:px-8">
	<!-- Welcome Section -->
	<div class="flex flex-1 flex-col items-center justify-center py-8 sm:py-12 lg:py-16">
		<div class="w-full max-w-3xl space-y-4 text-center sm:space-y-6 md:text-start">
			<div class="flex flex-col space-y-2 sm:space-y-3">
				<h2
					class={`font-outfit text-3xl font-semibold text-gray-300 transition-all duration-1000 ease-out sm:text-4xl lg:text-5xl ${
						isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
					}`}
				>
					Hi <span
						class={`inline-block transition-all duration-1200 ease-out ${
							isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
						}`}
						style="transition-delay: 200ms;"
						>{@html $auth.user?.user_metadata?.username ?? 'Guest'}</span
					>,
				</h2>
				<h2
					class={`font-outfit text-3xl font-semibold text-gray-300 transition-all duration-1000 ease-out sm:text-4xl lg:text-5xl ${
						isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
					}`}
					style="transition-delay: 400ms;"
				>
					How can I help you?
				</h2>
			</div>
			<p
				class={`mx-auto max-w-2xl text-sm font-thin text-gray-500 transition-all duration-1000 ease-out sm:mx-0 sm:text-base ${
					isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
				}`}
				style="transition-delay: 600ms;"
			>
				Hope today gives you space to think, breathe, and maybe even grow a little. Start wherever
				you left off—or just start fresh. That's okay too.
			</p>
		</div>
	</div>

	<!-- Message Input Section -->
	<div class="pb-6 sm:pb-8 lg:pb-10">
		<div class="mx-auto max-w-3xl">
			<div
				id="shared-input"
				class={`relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-1000 ease-out ${
					isInputFocused
						? 'border-emerald-400/50 bg-white/10 shadow-md shadow-emerald-500/10'
						: 'border-white/10 hover:border-white/20'
				} ${isTransitioning ? 'morph-out' : ''} ${
					isLoaded ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'
				}`}
				style="transition-delay: 800ms;"
			>
				<textarea
					bind:value={messageInput}
					on:keydown={handleKeyDown}
					on:focus={() => (isInputFocused = true)}
					on:blur={() => (isInputFocused = false)}
					disabled={isTransitioning}
					placeholder="Type your message here..."
					rows="3"
					class="w-full resize-none border-none bg-transparent p-3 pr-14 text-sm text-white placeholder-gray-400 outline-none focus:border-transparent focus:ring-0 focus:outline-none disabled:opacity-50 sm:p-4 sm:pr-16 sm:text-base"
				></textarea>
				<button
					on:click={sendLocalMessage}
					disabled={!messageInput.trim() || isTransitioning}
					class="absolute right-3 bottom-3 rounded-xl bg-emerald-500/90 p-2 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 disabled:bg-gray-600/50 disabled:hover:scale-100 sm:right-4 sm:bottom-4"
				>
					{#if isTransitioning}
						<div
							class="h-4 w-4 animate-spin rounded-full border-b-2 border-white sm:h-5 sm:w-5"
						></div>
					{:else}
						<ArrowUpRight class="h-4 w-4 sm:h-5 sm:w-5" />
					{/if}
				</button>
			</div>
			<p
				class={`mt-3 text-center text-xs text-gray-400 transition-all duration-1000 ease-out sm:text-sm ${
					isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
				}`}
				style="transition-delay: 1000ms;"
			>
				Press <kbd
					class="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-xs text-gray-300 backdrop-blur-sm sm:px-2 sm:py-1"
					>Enter</kbd
				>
				to send,
				<kbd
					class="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-xs text-gray-300 backdrop-blur-sm sm:px-2 sm:py-1"
					>Shift + Enter</kbd
				> for new line
			</p>
		</div>
	</div>

	<!-- Suggestions Grid -->
	<div class="flex flex-wrap justify-center gap-2 px-2 pb-6 sm:gap-3 sm:px-4 sm:pb-8">
		{#each suggestions as suggestion, index (index)}
			<button
				on:click={() => useSuggestion(suggestion)}
				disabled={isTransitioning}
				class={`rounded-full border border-gray-300 px-3 py-1.5 text-xs font-thin text-gray-400 transition-all duration-700 ease-out hover:scale-105 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm ${
					isLoaded ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'
				}`}
				style={`transition-delay: ${1200 + index * 100}ms;`}
			>
				{suggestion}
			</button>
		{/each}
	</div>
</div>

<style>
	kbd {
		font-family: inherit;
		font-size: 0.75rem;
	}

	@keyframes morphDown {
		from {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		to {
			transform: translateY(100px) scale(0.95);
			opacity: 0.5;
		}
	}

	.morph-out {
		animation: morphDown 0.4s ease forwards;
	}

	/* Add a subtle glow effect to the name */
	h2 span {
		background: linear-gradient(45deg, #10b981, #065f46);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: gentle-glow 3s ease-in-out infinite alternate;
	}

	@keyframes gentle-glow {
		0% {
			filter: brightness(1);
		}
		100% {
			filter: brightness(1.1);
		}
	}

	/* Mobile-specific improvements */
	@media (max-width: 640px) {
		h2 {
			line-height: 1.2;
		}

		/* Better touch targets on mobile */
		button {
			min-height: 44px;
		}

		/* Ensure suggestions don't wrap too much on small screens */
		.flex-wrap button {
			white-space: nowrap;
		}
	}

	/* Add this to your <style> section */

	.noise-overlay {
		position: relative;
	}

	.noise-overlay::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #000000;
		background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="100%" height="100%" filter="url(%23noise)" opacity="0.05"/></svg>');
		background-size: 200px 200px;
		opacity: 1;
		pointer-events: none;
		z-index: 1;
		mix-blend-mode: screen; /* Use 'overlay' for a subtle effect */
	}

	/* Ensure content appears above overlay */
	.noise-overlay > * {
		position: relative;
		z-index: 2;
	}

	/* Alternative: If you want to use an external noise image instead */
	.noise-overlay-external::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: url('/path/to/your/noise-texture.png');
		background-size: 300px 300px;
		background-repeat: repeat;
		opacity: 0.08;
		pointer-events: none;
		z-index: 1;
		mix-blend-mode: overlay;
	}
</style>
