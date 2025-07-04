<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		ArrowLeft,
		Check,
		CheckSquare,
		Calendar,
		Clock,
		User,
		FileText,
		Trash,
		PencilSimple,
		FloppyDisk,
		X,
		Spinner,
		CheckCircle,
		WarningCircle,
		ExclamationMark
	} from 'phosphor-svelte';
	import { updateTask, deleteTask, getSingleTask } from '$lib/api';
	import { loadTasks } from '$lib/stores/tasks';
	import { fade, slide } from 'svelte/transition';
	import type { Task } from '$lib/api/types';

	let task: Task | null = null;
	let loading = true;
	let error = '';
	let isEditing = false;
	let isSaving = false;
	let isDeleting = false;

	// Edit form fields
	let editTitle = '';
	let editDescription = '';
	let editStatus = '';
	let editDueDate = '';

	$: taskId = $page.params.taskId;

	onMount(async () => {
		await loadTask();
	});

	async function loadTask() {
		if (!taskId) return;

		loading = true;
		error = '';

		try {
			const response = await getSingleTask(taskId);
			if (response.success && response.task) {
				task = response.task[0];
				// Initialize edit form with current values
				if (task) {
					editTitle = task.title;
					editDescription = task.description;
					editStatus = task.status;
					editDueDate = task.due_date ? task.due_date.split('T')[0] : '';
				}
			} else {
				error = 'Task not found';
			}
		} catch (err) {
			console.error('Failed to load task:', err);
			error = 'Failed to load task';
		} finally {
			loading = false;
		}
	}

	function startEditing() {
		isEditing = true;
		// Reset form values
		if (task) {
			editTitle = task.title;
			editDescription = task.description;
			editStatus = task.status;
			editDueDate = task.due_date ? task.due_date.split('T')[0] : '';
		}
	}

	function cancelEditing() {
		isEditing = false;
	}

	async function saveChanges() {
		if (!task || !taskId) return;

		isSaving = true;

		try {
			const updates: Partial<Task> = {
				title: editTitle,
				description: editDescription,
				status: editStatus,
				due_date: editDueDate ? `${editDueDate}T00:00:00Z` : null
			};

			const response = await updateTask(taskId, updates);
			if (response.success) {
				await loadTask();
				await loadTasks(); // Refresh the main task list
				isEditing = false;
			}
		} catch (err) {
			console.error('Failed to update task:', err);
			error = 'Failed to update task';
		} finally {
			isSaving = false;
		}
	}

	async function toggleTaskStatus() {
		if (!task || !taskId) return;

		const newStatus = task.status === 'completed' ? 'pending' : 'completed';

		try {
			await updateTask(taskId, { status: newStatus });
			await loadTask();
			await loadTasks();
		} catch (err) {
			console.error('Failed to update task status:', err);
		}
	}

	async function handleDeleteTask() {
		if (!taskId || !confirm('Are you sure you want to delete this task?')) return;

		isDeleting = true;

		try {
			await deleteTask(taskId);
			await loadTasks();
			goto('/dashboard/tasks');
		} catch (err) {
			console.error('Failed to delete task:', err);
			error = 'Failed to delete task';
		} finally {
			isDeleting = false;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed':
				return 'bg-emerald-100 text-emerald-800 border-emerald-200';
			case 'in_progress':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'pending':
				return 'bg-orange-100 text-orange-800 border-orange-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
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
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
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

	function goBack() {
		goto('/dashboard/tasks');
	}
</script>

<svelte:head>
	<title>{task ? task.title : 'Task'} - Tasks</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
		<div class="mx-auto max-w-4xl px-4 py-4 sm:px-6">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<button
					on:click={goBack}
					class="flex items-center gap-2 self-start rounded-xl bg-gray-100 px-4 py-2 text-gray-700 transition-all duration-200 hover:scale-105 hover:bg-gray-200"
				>
					<ArrowLeft class="h-4 w-4" />
					<span class="hidden sm:inline">Back to Tasks</span>
					<span class="sm:hidden">Back</span>
				</button>

				{#if task && !isEditing}
					<div class="flex items-center gap-2 sm:gap-3">
						<button
							on:click={startEditing}
							class="flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm text-white transition-all duration-200 hover:scale-105 hover:bg-blue-600 sm:px-4"
						>
							<PencilSimple class="h-4 w-4" />
							<span class="hidden sm:inline">Edit</span>
						</button>
						<button
							on:click={handleDeleteTask}
							disabled={isDeleting}
							class="flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-sm text-white transition-all duration-200 hover:scale-105 hover:bg-red-600 disabled:opacity-50 sm:px-4"
						>
							{#if isDeleting}
								<Spinner class="h-4 w-4 animate-spin" />
							{:else}
								<Trash class="h-4 w-4" />
							{/if}
							<span class="hidden sm:inline">Delete</span>
						</button>
					</div>
				{/if}

				{#if isEditing}
					<div class="flex items-center gap-2 sm:gap-3">
						<button
							on:click={cancelEditing}
							class="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-all duration-200 hover:bg-gray-200 sm:px-4"
						>
							<X class="h-4 w-4" />
							Cancel
						</button>
						<button
							on:click={saveChanges}
							disabled={isSaving || !editTitle.trim()}
							class="flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm text-white transition-all duration-200 hover:bg-emerald-600 disabled:opacity-50 sm:px-4"
						>
							{#if isSaving}
								<Spinner class="h-4 w-4 animate-spin" />
							{:else}
								<FloppyDisk class="h-4 w-4" />
							{/if}
							<span class="hidden sm:inline">Save Changes</span>
							<span class="sm:hidden">Save</span>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
		{#if loading}
			<div class="animate-pulse space-y-4">
				<div class="mb-6 h-8 w-3/4 rounded bg-gray-300"></div>
				<div class="mb-4 h-4 w-full rounded bg-gray-300"></div>
				<div class="mb-4 h-4 w-2/3 rounded bg-gray-300"></div>
				<div class="h-32 w-full rounded bg-gray-300"></div>
			</div>
		{:else if error}
			<div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
				<div class="mb-4 flex justify-center">
					<div class="rounded-full bg-red-100 p-3">
						<ExclamationMark class="h-8 w-8 text-red-600" />
					</div>
				</div>
				<h2 class="mb-2 text-xl font-semibold text-red-800">Error</h2>
				<p class="mb-4 text-red-600">{error}</p>
				<button
					on:click={goBack}
					class="rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
				>
					Go Back
				</button>
			</div>
		{:else if task}
			<div in:fade={{ duration: 300 }}>
				<!-- Task Card -->
				<div
					class="mb-6 overflow-hidden rounded-2xl border border-gray-200/40 bg-gradient-to-br from-white to-gray-50/30 shadow-lg backdrop-blur-sm sm:mb-8"
				>
					<!-- Status bar -->
					<div class={`h-1 w-full ${getStatusColor(task.status)} bg-gradient-to-r`}></div>

					<div class="relative p-4 sm:p-6 lg:p-8">
						{#if isEditing}
							<!-- Edit Form -->
							<div in:slide={{ duration: 300 }} class="space-y-4 sm:space-y-6">
								<div>
									<!-- svelte-ignore a11y_label_has_associated_control -->
									<label for="edit-title" class="mb-2 block text-sm font-medium text-gray-700"
										>Title</label
									>
									<input
										id="edit-title"
										bind:value={editTitle}
										class="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-semibold focus:border-transparent focus:ring-2 focus:ring-blue-500"
										placeholder="Task title..."
									/>
								</div>

								<div>
									<label for="edit-description" class="mb-2 block text-sm font-medium text-gray-700"
										>Description</label
									>
									<textarea
										id="edit-description"
										bind:value={editDescription}
										rows="4"
										class="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
										placeholder="Task description..."
									></textarea>
								</div>

								<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div>
										<label for="edit-status" class="mb-2 block text-sm font-medium text-gray-700"
											>Status</label
										>
										<select
											id="edit-status"
											bind:value={editStatus}
											class="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
										>
											<option value="pending">Pending</option>
											<option value="in_progress">In Progress</option>
											<option value="completed">Completed</option>
										</select>
									</div>

									<div>
										<label for="edit-due-date" class="mb-2 block text-sm font-medium text-gray-700"
											>Due Date</label
										>
										<input
											id="edit-due-date"
											bind:value={editDueDate}
											type="date"
											class="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
										/>
									</div>
								</div>
							</div>
						{:else}
							<!-- View Mode -->
							<div class="space-y-4 sm:space-y-6">
								<!-- Title and Status -->
								<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0 flex-1">
										<h1
											class={`text-2xl leading-tight font-bold break-words sm:text-3xl ${
												task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
											}`}
										>
											{task.title}
										</h1>
									</div>

									<div class="flex flex-wrap items-center gap-2 sm:gap-4">
										{#if task.ai_suggested}
											<span
												class="inline-flex items-center gap-1.5 rounded-full border border-purple-200/60 bg-gradient-to-r from-purple-50 to-blue-50 px-3 py-1.5 text-xs font-medium text-purple-700 shadow-sm sm:text-sm"
											>
												<Spinner class="h-4 w-4" />
												AI Suggested
											</span>
										{/if}

										<button
											on:click={toggleTaskStatus}
											class={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 hover:scale-105 sm:text-sm ${
												task.status === 'completed'
													? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
													: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
											}`}
										>
											{#if task.status === 'completed'}
												<Check class="h-4 w-4" weight="bold" />
												<span class="hidden sm:inline">Completed</span>
											{:else}
												<CheckSquare class="h-4 w-4" weight="regular" />
												<span class="hidden sm:inline">Mark Complete</span>
												<span class="sm:hidden">Complete</span>
											{/if}
										</button>
									</div>
								</div>

								<!-- Description -->
								{#if task.description}
									<div class="prose prose-gray max-w-none">
										<p
											class="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 sm:text-base"
										>
											{task.description}
										</p>
									</div>
								{/if}

								<!-- Metadata Grid -->
								<div
									class="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 sm:pt-6 lg:grid-cols-3"
								>
									<!-- Status -->
									<div class="flex items-center gap-3">
										<div class={`rounded-xl p-3 ${getStatusColor(task.status)}`}>
											<svelte:component this={getStatusIcon(task.status)} class="h-5 w-5" />
										</div>
										<div class="min-w-0 flex-1">
											<div class="truncate text-sm font-medium text-gray-900 capitalize">
												{task.status.replace('_', ' ')}
											</div>
											<div class="text-xs text-gray-500">Status</div>
										</div>
									</div>

									<!-- Created Date -->
									<div class="flex items-center gap-3">
										<div class="rounded-xl bg-gray-100 p-3">
											<Calendar class="h-5 w-5 text-gray-600" />
										</div>
										<div class="min-w-0 flex-1">
											<div class="truncate text-sm font-medium text-gray-900">
												{formatDate(task.created_at)}
											</div>
											<div class="text-xs text-gray-500">Created</div>
										</div>
									</div>

									<!-- Due Date -->
									{#if task.due_date}
										<div class="flex items-center gap-3">
											<div
												class={`rounded-xl p-3 ${
													task.due_date < new Date().toISOString()
														? 'bg-red-100 text-red-600'
														: 'bg-blue-100 text-blue-600'
												}`}
											>
												<Clock class="h-5 w-5" />
											</div>
											<div class="min-w-0 flex-1">
												<div class="truncate text-sm font-medium text-gray-900">
													{formatDueDate(task.due_date)}
												</div>
												<div class="text-xs text-gray-500">Due Date</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Additional Task Details -->
				{#if task.session_id && !isEditing}
					<div class="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
						<h3 class="mb-4 text-lg font-semibold text-gray-900">Additional Details</h3>
						<div class="space-y-3">
							<div class="flex items-start gap-3">
								<div class="mt-0.5 rounded-lg bg-gray-100 p-2">
									<User class="h-4 w-4 text-gray-600" />
								</div>
								<div class="min-w-0 flex-1">
									<span class="block text-sm font-medium text-gray-700">Session ID</span>
									<span class="text-sm break-all text-gray-600">{task.session_id}</span>
								</div>
							</div>

							{#if task.goal_id}
								<div class="flex items-start gap-3">
									<div class="mt-0.5 rounded-lg bg-gray-100 p-2">
										<FileText class="h-4 w-4 text-gray-600" />
									</div>
									<div class="min-w-0 flex-1">
										<span class="block text-sm font-medium text-gray-700">Goal ID</span>
										<span class="text-sm break-all text-gray-600">{task.goal_id}</span>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.prose {
		color: inherit;
	}

	.prose p {
		margin-bottom: 1em;
	}

	.prose p:last-child {
		margin-bottom: 0;
	}
</style>
