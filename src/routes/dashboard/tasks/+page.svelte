<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Plus,
		MagnifyingGlass,
		File,
		CheckCircle,
		Clock,
		WarningCircle,
		Check,
		CheckSquare,
		Trash,
		Spinner,
		X
	} from 'phosphor-svelte';
	import { getTasks, deleteTask, updateTask, createTask } from '$lib/api';
	import { loadTasks, tasks as tasksStore } from '$lib/stores/tasks';
	import { fade } from 'svelte/transition';

	interface Task {
		id?: string;
		user_id: string;
		goal_id?: string | null;
		title: string;
		description: string;
		status: string;
		due_date?: string | null;
		ai_suggested: boolean;
		created_at: string;
		session_id?: string | null;
		decision?: string;
		follow_up_due_at?: string;
		followed_up?: boolean;
	}

	let tasks: Task[] = [];
	$: tasks = $tasksStore;
	let filteredTasks: Task[] = [];
	let searchQuery = '';
	let statusFilter = 'all';
	let loading = true;
	let isCreating = false;
	let newTaskTitle = '';
	let newTaskDescription = '';

	const statusOptions = [
		{ value: 'all', label: 'All', icon: File },
		{ value: 'pending', label: 'Pending', icon: Clock },
		{ value: 'in_progress', label: 'In Progress', icon: WarningCircle },
		{ value: 'completed', label: 'Completed', icon: CheckCircle }
	];

	onMount(async () => {
		await loadTasks();
		loading = false;
	});

	function filterTasks() {
		filteredTasks = tasks.filter((task) => {
			const matchesSearch =
				task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				task.description.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	}

	$: (searchQuery, statusFilter, tasks, filterTasks());

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200';
			case 'in_progress':
				return 'bg-blue-50 text-blue-700 border-blue-200';
			case 'pending':
				return 'bg-amber-50 text-amber-700 border-amber-200';
			default:
				return 'bg-gray-50 text-gray-700 border-gray-200';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'completed':
				return CheckCircle;
			case 'in_progress':
				return WarningCircle;
			case 'pending':
				return Clock;
			default:
				return Clock;
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatDueDate(dateString: string) {
		const date = new Date(dateString);
		const today = new Date();
		const diffTime = date.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Due today';
		if (diffDays === 1) return 'Due tomorrow';
		if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
		return `Due in ${diffDays} days`;
	}

	async function toggleTaskStatus(task: Task) {
		const newStatus = task.status === 'completed' ? 'pending' : 'completed';
		if (!task.id) {
			console.error('Task id is undefined. Cannot update task status.');
			return;
		}
		try {
			await updateTask(task.id, { status: newStatus });
			await loadTasks();
		} catch (error) {
			console.error('Failed to update task:', error);
		}
	}

	async function handleDeleteTask(taskId: string) {
		if (confirm('Are you sure you want to delete this task?')) {
			try {
				await deleteTask(taskId);
				await loadTasks();
			} catch (error) {
				console.error('Failed to delete task:', error);
			}
		}
	}

	function openTask(taskId: string) {
		goto(`/dashboard/tasks/${taskId}`);
	}

	function createNewTask() {
		isCreating = true;
	}

	function cancelCreate() {
		isCreating = false;
		newTaskTitle = '';
		newTaskDescription = '';
	}

	async function saveNewTask() {
		if (!newTaskTitle.trim()) return;

		try {
			const response = await createTask({
				title: newTaskTitle,
				description: newTaskDescription
			});

			if (response.success) {
				isCreating = false;
				newTaskTitle = '';
				newTaskDescription = '';
				await loadTasks();
			}
		} catch (error) {
			console.error('Failed to create task:', error);
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="sticky top-0 z-10 bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div
				class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
			>
				<div>
					<h1 class="font-outfit text-2xl font-bold text-gray-900 sm:text-3xl">Tasks</h1>
					<p class="font-inter mt-1 text-sm text-gray-600 sm:text-base">
						Manage your tasks and stay organized
					</p>
				</div>
				<button
					on:click={createNewTask}
					class="font-inter inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none sm:px-8 sm:py-4"
				>
					<Plus class="h-5 w-5" />
					<span class="hidden sm:inline">New Task</span>
					<span class="sm:hidden">New</span>
				</button>
			</div>
		</div>

		<!-- Search and Filters -->
		<div class="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6 lg:px-8">
			<div class="mx-auto max-w-7xl">
				<div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
					<!-- Search -->
					<div class="relative flex-1">
						<MagnifyingGlass
							class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400"
						/>
						<input
							bind:value={searchQuery}
							placeholder="Search tasks..."
							class="font-inter w-full rounded-lg border border-gray-300 bg-white py-3 pr-4 pl-10 text-sm transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
						/>
					</div>

					<!-- Status Filter -->
					<div class="flex space-x-2 overflow-x-auto pb-2 sm:pb-0">
						{#each statusOptions as option}
							<button
								on:click={() => (statusFilter = option.value)}
								class={`flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none ${
									statusFilter === option.value
										? 'bg-emerald-500 text-white shadow-sm'
										: 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
								}`}
							>
								<svelte:component this={option.icon} class="h-4 w-4" />
								<span class="hidden sm:inline">{option.label}</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<!-- Create Task Modal -->
		{#if isCreating}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div class="w-full max-w-md rounded-xl bg-white shadow-2xl">
					<div class="flex items-center justify-between border-b border-gray-200 p-6">
						<h3 class="text-lg font-semibold text-gray-900">Create New Task</h3>
						<button
							on:click={cancelCreate}
							class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
						>
							<X class="h-5 w-5" />
						</button>
					</div>
					<div class="p-6">
						<div class="space-y-4">
							<div>
								<label for="new-task-title" class="block text-sm font-medium text-gray-700">Title</label>
								<input
									id="new-task-title"
									bind:value={newTaskTitle}
									placeholder="Enter task title..."
									class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
								/>
							</div>
							<div>
								<label for="new-task-description" class="block text-sm font-medium text-gray-700">Description</label>
								<textarea
									id="new-task-description"
									bind:value={newTaskDescription}
									placeholder="Enter task description (optional)..."
									rows="3"
									class="mt-1 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
								></textarea>
							</div>
						</div>
						<div class="mt-6 flex gap-3">
							<button
								on:click={cancelCreate}
								class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
							>
								Cancel
							</button>
							<button
								on:click={saveNewTask}
								disabled={!newTaskTitle.trim()}
								class="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
							>
								Create Task
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tasks Grid -->
		{#if loading}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each Array(6) as _}
					<div class="animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
						<div class="mb-3 h-4 w-3/4 rounded bg-gray-300"></div>
						<div class="mb-2 h-3 w-full rounded bg-gray-300"></div>
						<div class="h-3 w-2/3 rounded bg-gray-300"></div>
					</div>
				{/each}
			</div>
		{:else if filteredTasks.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div
					class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100"
				>
					<File class="h-12 w-12 text-gray-400" />
				</div>
				<h3 class="mb-2 text-lg font-semibold text-gray-900 sm:text-xl">No tasks found</h3>
				<p class="mb-6 max-w-md text-sm text-gray-600 sm:text-base">
					{searchQuery
						? "Try adjusting your search or filters to find what you're looking for."
						: 'Get started by creating your first task to stay organized and productive.'}
				</p>
				<button
					on:click={createNewTask}
					class="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
				>
					<Plus class="h-5 w-5" />
					Create Your First Task
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredTasks as task, index}
					<div
						in:fade={{ duration: 200, delay: index * 30 }}
						class="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 hover:-translate-y-1 hover:shadow-lg"
						on:click={() => openTask(task.id!)}
						role="button"
						tabindex="0"
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								openTask(task.id!);
							}
						}}
					>
						<!-- Status indicator -->
						<div
							class={`absolute top-0 left-0 h-1 w-full ${
								task.status === 'completed'
									? 'bg-emerald-500'
									: task.status === 'in_progress'
										? 'bg-blue-500'
										: task.status === 'pending'
											? 'bg-amber-500'
											: 'bg-gray-300'
							}`}
						></div>

						<div class="p-6">
							<!-- Header -->
							<div class="mb-4 flex items-start justify-between gap-4">
								<div class="min-w-0 flex-1">
									<h3
										class={`font-inter text-lg leading-tight font-semibold transition-colors duration-200 ${
											task.status === 'completed'
												? 'text-gray-500 line-through'
												: 'text-gray-900 group-hover:text-gray-700'
										}`}
									>
										{task.title}
									</h3>
								</div>

								{#if task.ai_suggested}
									<span
										class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700"
									>
										<Spinner class="h-3 w-3" />
										AI
									</span>
								{/if}
							</div>

							<!-- Description -->
							{#if task.description}
								<p
									class="font-inter mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600 transition-colors duration-200 group-hover:text-gray-700"
								>
									{task.description}
								</p>
							{/if}

							<!-- Footer -->
							<div class="flex items-center justify-between border-t border-gray-100 pt-4">
								<div class="flex items-center gap-3">
									<!-- Status Toggle -->
									<button
										on:click|stopPropagation={() => toggleTaskStatus(task)}
										on:keydown|stopPropagation={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												toggleTaskStatus(task);
											}
										}}
										class={`rounded-lg p-2 transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
											task.status === 'completed'
												? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
												: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
										}`}
									>
										{#if task.status === 'completed'}
											<Check class="h-4 w-4" weight="bold" />
										{:else}
											<CheckSquare class="h-4 w-4" weight="regular" />
										{/if}
									</button>

									<!-- Metadata -->
									<div class="flex flex-col gap-1 text-xs text-gray-500">
										{#if task.due_date}
											<span
												class={`inline-flex items-center gap-1 ${
													task.due_date < new Date().toISOString()
														? 'text-red-600'
														: 'text-blue-600'
												}`}
											>
												<Clock class="h-3 w-3" />
												{formatDueDate(task.due_date)}
											</span>
										{/if}
										<span class="flex items-center gap-1">
											<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											{formatDate(task.created_at)}
										</span>
									</div>
								</div>

								<!-- Delete Button -->
								<button
									on:click|stopPropagation={() => handleDeleteTask(task.id!)}
									on:keydown|stopPropagation={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleDeleteTask(task.id!);
										}
									}}
									class="rounded-lg p-2 text-gray-400 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
									title="Delete task"
								>
									<Trash class="h-4 w-4" weight="regular" />
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
