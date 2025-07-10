<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { loadTasks, tasks, tasksBySession } from '$lib/stores/tasks';
	import { Check, CheckSquare, Door, Plus, SidebarSimple, Trash, X, List } from 'phosphor-svelte';
	import { signOut } from '$lib/stores/auth';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import { onMount } from 'svelte';

	// Import your API handlers
	import { updateTask, deleteTask as deleteTaskAPI, deleteSession } from '$lib/api';

	import { chatSessions, loadSessions } from '$lib/stores/sessions';

	let isLeftSidebarOpen = true;
	let isRightSidebarOpen = true;
	let isMobile = false;
	let showMobileMenu = false;
	let currentChatId: string | null = null;

	$: currentChatId = $page.url.pathname.match(/\/chat\/(.+)/)?.[1] ?? null;

	$: relevantTasks = $tasksBySession(currentChatId ?? undefined);

	// Check if we're on mobile
	function checkMobile() {
		isMobile = window.innerWidth < 768;
		// On mobile, close sidebars by default
		if (isMobile) {
			isLeftSidebarOpen = false;
			isRightSidebarOpen = false;
		}
	}

	// Load initial data
	onMount(() => {
		(async () => {
			await loadSessions();
			await loadTasks();

			// Check if we're in a specific chat
			const match = $page.url.pathname.match(/\/chat\/(.+)/);
			if (match) {
				currentChatId = match[1];
			}

			// Check mobile on mount and resize
			checkMobile();
		})();

		window.addEventListener('resize', checkMobile);

		return () => {
			window.removeEventListener('resize', checkMobile);
		};
	});

	function selectChat(chatId: string) {
		currentChatId = chatId;
		goto(`/dashboard/chat/${chatId}`);
		// Close mobile menu after selection
		if (isMobile) {
			showMobileMenu = false;
			isLeftSidebarOpen = false;
		}
	}

	function createNewChat() {
		currentChatId = null;
		goto(`/dashboard`);
		// Close mobile menu after action
		if (isMobile) {
			showMobileMenu = false;
			isLeftSidebarOpen = false;
		}
	}

	function toggleLeftSidebar() {
		if (isMobile) {
			showMobileMenu = !showMobileMenu;
		} else {
			isLeftSidebarOpen = !isLeftSidebarOpen;
		}
	}

	function toggleRightSidebar() {
		isRightSidebarOpen = !isRightSidebarOpen;
	}

	// Close mobile menu when clicking outside
	function handleMobileOverlayClick() {
		if (isMobile) {
			showMobileMenu = false;
		}
	}

	// Example of optimistic update
	async function toggleTask(taskId: string) {
		tasks.update((all) =>
			all.map((task) =>
				task.id === taskId
					? { ...task, status: task.status === 'completed' ? 'pending' : 'completed' }
					: task
			)
		);
		try {
			await updateTask(taskId, { status: 'completed' }); // use real logic
		} catch (err) {
			console.error(err);
			await loadTasks(); // fallback in case of error
		}
	}

	async function deleteTask(taskId: string) {
		try {
			await deleteTaskAPI(taskId);

			// Optimistically remove the task from the global store
			tasks.update((all) => all.filter((t) => t.id !== taskId));
		} catch (error) {
			console.error('Failed to delete task:', error);
		}
	}

	async function handleDeleteSession(sessionId: string) {
		const confirmed = confirm('Are you sure you want to delete this session?');
		if (!confirmed) return;

		try {
			await deleteSession(sessionId);
			await loadSessions(); // refresh session list
			if (currentChatId === sessionId) {
				currentChatId = null;
				goto('/dashboard'); // fallback if deleted session is open
			}
		} catch (error) {
			console.error('Failed to delete session:', error);
		}
	}

	async function handleLogout() {
		await signOut();
		goto('/login');
	}
</script>

<AuthGuard requireAuth={true}>
	<div class="relative flex h-screen w-full bg-black text-white">
		<!-- Mobile Menu Overlay -->
		{#if isMobile && showMobileMenu}
			<button
				type="button"
				class="bg-opacity-50 fixed inset-0 z-40 bg-black md:hidden"
				aria-label="Close mobile menu overlay"
				on:click={handleMobileOverlayClick}
				on:keydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') handleMobileOverlayClick();
				}}
				tabindex="0"
				style="border: none; padding: 0; margin: 0; background: none;"
			></button>
		{/if}

		<!-- Left Sidebar -->
		<aside
			class={`
				z-50 flex resize-x flex-col justify-between p-4 transition-all duration-300
				${
					isMobile
						? `fixed top-0 left-0 h-full bg-black ${showMobileMenu ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}`
						: `${isLeftSidebarOpen ? 'w-64' : 'w-16'}`
				}
			`}
		>
			<div>
				<div class="mb-6 flex items-end justify-end">
					<button
						on:click={toggleLeftSidebar}
						class="touch-manipulation rounded-full p-2 hover:bg-gray-900"
					>
						{#if isMobile}
							<X class="h-5 w-5" weight="thin" />
						{:else}
							<SidebarSimple class="h-5 w-5" weight="thin" />
						{/if}
					</button>
				</div>

				{#if (isLeftSidebarOpen && !isMobile) || (isMobile && showMobileMenu)}
					<nav class="flex flex-col gap-2 text-sm">
						<button
							on:click={createNewChat}
							class="flex cursor-pointer touch-manipulation items-center gap-2 rounded-md px-4 py-3 hover:bg-gray-900"
						>
							<Plus class="h-5 w-5" weight="thin" />
							<span>New Chat</span>
						</button>
						<a
							href="/dashboard/tasks"
							class="flex touch-manipulation items-center gap-2 rounded-md px-4 py-3 hover:bg-gray-900"
						>
							<CheckSquare class="h-5 w-5" weight="thin" />
							<span>Tasks</span>
						</a>
					</nav>

					<div class="mt-6">
						<p class="mb-2 text-xs text-gray-400">Recent Chats</p>
						<div class="flex max-h-64 flex-col overflow-y-auto md:max-h-none">
							{#each $chatSessions as chat (chat.id)}
								<div
									class={`group flex items-center justify-between gap-2 rounded-sm px-3 hover:bg-gray-900 ${currentChatId === chat.id ? 'bg-gray-900' : ''}`}
								>
									<button
										on:click={() => chat.id && selectChat(chat.id)}
										class={`flex-1 py-3 truncate text-left text-sm font-thin text-gray-200 ${currentChatId === chat.id ? 'font-normal text-white' : ''}`}
									>
										{chat.title}
									</button>
									<button
										on:click={() => chat.id && handleDeleteSession(chat.id)}
										class="invisible text-gray-500 group-hover:visible hover:text-red-400"
									>
										<Trash class="h-4 w-4" weight="thin" />
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			{#if (isLeftSidebarOpen && !isMobile) || (isMobile && showMobileMenu)}
				<button
					on:click={handleLogout}
					class="flex cursor-pointer touch-manipulation items-center gap-2 rounded-md px-4 py-3 text-sm hover:bg-gray-900"
				>
					<Door class="h-5 w-5" weight="thin" />
					<span>Logout</span>
				</button>
			{/if}
		</aside>

		<!-- Mobile Header -->
		{#if isMobile}
			<div
				class="fixed top-0 right-0 left-0 z-30 flex items-center justify-between border-b border-gray-700 bg-black p-4"
			>
				<button
					on:click={toggleLeftSidebar}
					class="touch-manipulation rounded-full p-2 hover:bg-gray-900"
				>
					<List class="h-5 w-5" weight="thin" />
				</button>
				<h1 class="text-lg font-semibold">Dashboard</h1>
				<button
					on:click={toggleRightSidebar}
					class="touch-manipulation rounded-full p-2 hover:bg-gray-900"
				>
					<CheckSquare class="h-5 w-5" weight="thin" />
				</button>
			</div>
		{/if}

		<!-- Main Panel -->
		<div
			class={`
			relative flex flex-1 flex-col overflow-hidden rounded-xl bg-gray-50 text-black
			${isMobile ? 'mt-16' : ''}
		`}
		>
			<main class="flex-1 overflow-y-auto p-4 md:p-6">
				<slot />
			</main>
		</div>

		<!-- Right Sidebar -->
		<aside
			class={`
				flex resize-x flex-col p-4 text-white transition-all duration-300
				${
					isMobile
						? `fixed top-16 right-0 z-40 h-full border-l border-gray-700 bg-black ${isRightSidebarOpen ? 'w-64 translate-x-0' : 'w-64 translate-x-full'}`
						: `${isRightSidebarOpen ? 'w-64' : 'w-16'}`
				}
			`}
		>
			<div class="mb-6 flex items-center justify-between">
				{#if isMobile && isRightSidebarOpen}
					<h2 class="text-lg font-semibold">Tasks</h2>
				{/if}
				<button
					on:click={toggleRightSidebar}
					class="touch-manipulation rounded-full p-2 hover:bg-gray-900"
				>
					{#if isMobile}
						<X class="h-5 w-5" weight="thin" />
					{:else}
						<SidebarSimple class="h-5 w-5" weight="thin" />
					{/if}
				</button>
			</div>

			{#if (isRightSidebarOpen && !isMobile) || (isMobile && isRightSidebarOpen)}
				<div class="mb-4 flex items-center justify-between">
					<p class="text-sm text-gray-400">
						Tasks {currentChatId ? 'for Current Chat' : 'Overview'}
					</p>
				</div>
				<div class="flex flex-col gap-2 overflow-y-auto">
					{#if relevantTasks.length === 0}
						<p class="text-sm text-gray-500">No tasks available.</p>
					{:else}
						{#each relevantTasks as task (task.id)}
							<div
								class="flex touch-manipulation items-center justify-between rounded-md px-4 py-3 hover:bg-gray-900"
							>
								<div class="flex min-w-0 flex-1 items-center gap-2">
									<button
										on:click={() => task.id && toggleTask(task.id)}
										class="flex-shrink-0 touch-manipulation"
									>
										{#if task.status === 'completed'}
											<Check class="h-5 w-5 text-emerald-400" weight="thin" />
										{:else}
											<CheckSquare class="h-5 w-5" weight="thin" />
										{/if}
									</button>
									<button
										type="button"
										on:click={() => goto(`/dashboard/tasks/${task.id}`)}
										class={`m-0 cursor-pointer truncate border-none bg-transparent p-0 text-left ${task.status === 'completed' ? 'text-gray-500 line-through' : ''}`}
										style="background: none;"
									>
										{task.title}
									</button>
								</div>
								<button
									on:click={() => task.id && deleteTask(task.id)}
									class="ml-2 flex-shrink-0 touch-manipulation hover:text-red-400"
								>
									<Trash class="h-5 w-5" weight="thin" />
								</button>
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</aside>
	</div>
</AuthGuard>

<style>
	:global(body) {
		font-family: 'Inter', sans-serif;
		background-color: #111827;
	}

	/* Touch-friendly interactions */
	.touch-manipulation {
		touch-action: manipulation;
		min-height: 44px;
		min-width: 44px;
	}

	/* Smooth scrolling on mobile */
	@media (max-width: 768px) {
		.overflow-y-auto {
			-webkit-overflow-scrolling: touch;
		}
	}

	/* Ensure proper z-index stacking */
	.z-30 {
		z-index: 30;
	}
	.z-40 {
		z-index: 40;
	}
	.z-50 {
		z-index: 50;
	}
</style>
