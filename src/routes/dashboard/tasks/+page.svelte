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
		X,
		Calendar,
		SortAscending,
		SortDescending,
		FunnelSimple,
		SquaresFour,
		List,
		Target,
		ChatCircle,
		Lightning,
		DotsThree,
		CaretDown,
		Export,
		Archive,
		Tag,
		Users,
		ChartBar
	} from 'phosphor-svelte';
	import { getTasks, deleteTask, updateTask, createTask } from '$lib/api';
	import { loadTasks, tasks as tasksStore } from '$lib/stores/tasks';
	import { fade, fly } from 'svelte/transition';
	import type { Task } from '$lib/api/types';

	let tasks: Task[] = [];
	$: tasks = $tasksStore;
	let filteredTasks: Task[] = [];
	let searchQuery = '';
	let statusFilter = 'all';
	let sortBy = 'created_at';
	let sortOrder: 'asc' | 'desc' = 'desc';
	let viewMode = 'grid'; // 'grid' or 'list'
	let loading = true;
	let isCreating = false;
	let showFilters = false;
	let selectedTasks: string[] = [];
	let bulkActionMenu = false;

	// New task form
	let newTaskTitle = '';
	let newTaskDescription = '';
	let newTaskDueDate = '';

	// Advanced filters
	let dueDateFilter = 'all'; // 'all', 'overdue', 'today', 'week', 'month'
	let aiSuggestedFilter = 'all'; // 'all', 'ai', 'manual'

	// Stats
	let taskStats = {
		total: 0,
		completed: 0,
		in_progress: 0,
		pending: 0,
		overdue: 0
	};

	const statusOptions = [
		{ value: 'all', label: 'All Tasks', icon: File, color: 'gray' },
		{ value: 'pending', label: 'Pending', icon: Clock, color: 'amber' },
		{ value: 'in_progress', label: 'In Progress', icon: WarningCircle, color: 'blue' },
		{ value: 'completed', label: 'Completed', icon: CheckCircle, color: 'emerald' }
	];

	const sortOptions = [
		{ value: 'created_at', label: 'Created Date' },
		{ value: 'due_date', label: 'Due Date' },
		{ value: 'title', label: 'Title' },
		{ value: 'status', label: 'Status' }
	];

	const dueDateOptions = [
		{ value: 'all', label: 'All Dates' },
		{ value: 'overdue', label: 'Overdue' },
		{ value: 'today', label: 'Due Today' },
		{ value: 'week', label: 'This Week' },
		{ value: 'month', label: 'This Month' }
	];

	onMount(async () => {
		await loadTasksWithFilters();
		loading = false;
	});

	async function loadTasksWithFilters() {
		const options = {
			status: statusFilter !== 'all' ? statusFilter : undefined,
			search: searchQuery || undefined,
			sort_by: sortBy,
			sort_order: sortOrder,
			limit: 100
		};

		try {
			const response = await getTasks(options);
			if (response.success) {
				tasks = response.tasks ?? [];
				calculateStats();
			}
		} catch (error) {
			console.error('Failed to load tasks:', error);
			await loadTasks(); // Fallback to store method
		}
	}

	function calculateStats() {
		taskStats.total = tasks.length;
		taskStats.completed = tasks.filter((t) => t.status === 'completed').length;
		taskStats.in_progress = tasks.filter((t) => t.status === 'in_progress').length;
		taskStats.pending = tasks.filter((t) => t.status === 'pending').length;
		taskStats.overdue = tasks.filter(
			(t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
		).length;
	}

	function filterTasks() {
		filteredTasks = tasks.filter((task) => {
			// Basic search and status filters
			const matchesSearch =
				!searchQuery ||
				task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				task.description.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

			// Due date filter
			const matchesDueDate =
				dueDateFilter === 'all' ||
				(() => {
					if (!task.due_date) return dueDateFilter === 'all';
					const dueDate = new Date(task.due_date);
					const today = new Date();
					const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
					const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

					switch (dueDateFilter) {
						case 'overdue':
							return dueDate < today && task.status !== 'completed';
						case 'today':
							return dueDate.toDateString() === today.toDateString();
						case 'week':
							return dueDate <= weekFromNow;
						case 'month':
							return dueDate <= monthFromNow;
						default:
							return true;
					}
				})();

			// AI suggested filter
			const matchesAI =
				aiSuggestedFilter === 'all' ||
				(aiSuggestedFilter === 'ai' && task.ai_suggested) ||
				(aiSuggestedFilter === 'manual' && !task.ai_suggested);

			return matchesSearch && matchesStatus && matchesDueDate && matchesAI;
		});
	}

	$: (searchQuery, statusFilter, dueDateFilter, aiSuggestedFilter, tasks, filterTasks());

	async function handleSortChange(newSortBy: string) {
		if (sortBy === newSortBy) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = newSortBy;
			sortOrder = 'desc';
		}
		await loadTasksWithFilters();
	}

	async function handleFilterChange() {
		await loadTasksWithFilters();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200';
			case 'in_progress':
				return 'bg-blue-50 text-emerald-700 border-blue-200';
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

	function getPriorityColor(task: Task) {
		if (!task.due_date) return 'border-l-gray-300';
		const dueDate = new Date(task.due_date);
		const today = new Date();
		const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays < 0) return 'border-l-red-500'; // Overdue
		if (diffDays === 0) return 'border-l-orange-500'; // Due today
		if (diffDays <= 3) return 'border-l-yellow-500'; // Due soon
		return 'border-l-green-500'; // Future
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
		const statusOrder = ['pending', 'in_progress', 'completed'];
		const currentIndex = statusOrder.indexOf(task.status);
		const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

		if (!task.id) return;

		try {
			await updateTask(task.id, { status: newStatus });
			await loadTasksWithFilters();
		} catch (error) {
			console.error('Failed to update task:', error);
		}
	}

	async function handleDeleteTask(taskId: string) {
		if (confirm('Are you sure you want to delete this task?')) {
			try {
				await deleteTask(taskId);
				await loadTasksWithFilters();
			} catch (error) {
				console.error('Failed to delete task:', error);
			}
		}
	}

	function openTask(taskId: string) {
		goto(`/dashboard/tasks/${taskId}`);
	}

	function toggleTaskSelection(taskId: string) {
		if (selectedTasks.includes(taskId)) {
			selectedTasks = selectedTasks.filter((id) => id !== taskId);
		} else {
			selectedTasks = [...selectedTasks, taskId];
		}
	}

	function selectAllTasks() {
		selectedTasks = filteredTasks.map((task) => task.id!);
	}

	function clearSelection() {
		selectedTasks = [];
	}

	async function bulkUpdateStatus(newStatus: string) {
		try {
			await Promise.all(selectedTasks.map((taskId) => updateTask(taskId, { status: newStatus })));
			await loadTasksWithFilters();
			clearSelection();
			bulkActionMenu = false;
		} catch (error) {
			console.error('Failed to bulk update tasks:', error);
		}
	}

	async function bulkDeleteTasks() {
		if (confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) {
			try {
				await Promise.all(selectedTasks.map((taskId) => deleteTask(taskId)));
				await loadTasksWithFilters();
				clearSelection();
				bulkActionMenu = false;
			} catch (error) {
				console.error('Failed to bulk delete tasks:', error);
			}
		}
	}

	function createNewTask() {
		isCreating = true;
	}

	function cancelCreate() {
		isCreating = false;
		newTaskTitle = '';
		newTaskDescription = '';
		newTaskDueDate = '';
	}

	async function saveNewTask() {
		if (!newTaskTitle.trim()) return;

		try {
			const taskData = {
				title: newTaskTitle,
				description: newTaskDescription,
				...(newTaskDueDate && { due_date: newTaskDueDate }),
			};

			const response = await createTask(taskData);

			if (response.success) {
				cancelCreate();
				await loadTasksWithFilters();
			}
		} catch (error) {
			console.error('Failed to create task:', error);
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
			<div
				class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
			>
				<div class="flex items-center space-x-4">
					<div>
						<h1 class="font-outfit text-2xl text-gray-900 sm:text-3xl">Task Management</h1>
						<p class="font-inter mt-1 text-sm text-gray-600">
							Organize, track, and complete your tasks efficiently
						</p>
					</div>
				</div>

				<div class="flex items-center space-x-3">
					<!-- View Toggle -->
					<div class="flex rounded-lg border border-gray-300 bg-white p-1">
						<button
							on:click={() => (viewMode = 'grid')}
							class={`rounded-md p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
						>
							<SquaresFour class="h-4 w-4" />
						</button>
						<button
							on:click={() => (viewMode = 'list')}
							class={`rounded-md p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
						>
							<List class="h-4 w-4" />
						</button>
					</div>

					<!-- Action Buttons -->
					<button
						on:click={() => (showFilters = !showFilters)}
						class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						<FunnelSimple class="h-4 w-4" />
						Filters
					</button>

					<button
						on:click={createNewTask}
						class="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
					>
						<Plus class="h-4 w-4" />
						New Task
					</button>
				</div>
			</div>
		</div>

		<!-- Stats Bar -->
		<div class="border-t border-gray-200 bg-gray-50">
			<div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-6">
						<div class="flex items-center space-x-2">
							<ChartBar class="h-4 w-4 text-gray-500" />
							<span class="text-sm font-medium text-gray-900">{taskStats.total} Total</span>
						</div>
						<div class="flex items-center space-x-2">
							<div class="h-2 w-2 rounded-full bg-emerald-500"></div>
							<span class="text-sm text-gray-600">{taskStats.completed} Completed</span>
						</div>
						<div class="flex items-center space-x-2">
							<div class="h-2 w-2 rounded-full bg-blue-500"></div>
							<span class="text-sm text-gray-600">{taskStats.in_progress} In Progress</span>
						</div>
						<div class="flex items-center space-x-2">
							<div class="h-2 w-2 rounded-full bg-amber-500"></div>
							<span class="text-sm text-gray-600">{taskStats.pending} Pending</span>
						</div>
						{#if taskStats.overdue > 0}
							<div class="flex items-center space-x-2">
								<div class="h-2 w-2 rounded-full bg-red-500"></div>
								<span class="text-sm text-red-600">{taskStats.overdue} Overdue</span>
							</div>
						{/if}
					</div>

					{#if selectedTasks.length > 0}
						<div class="flex items-center space-x-3">
							<span class="text-sm text-gray-600">{selectedTasks.length} selected</span>
							<div class="relative">
								<button
									on:click={() => (bulkActionMenu = !bulkActionMenu)}
									class="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
								>
									Actions
									<CaretDown class="h-3 w-3" />
								</button>
								{#if bulkActionMenu}
									<div
										class="absolute right-0 z-10 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg"
									>
										<div class="py-1">
											<button
												on:click={() => bulkUpdateStatus('pending')}
												class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
											>
												Mark as Pending
											</button>
											<button
												on:click={() => bulkUpdateStatus('in_progress')}
												class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
											>
												Mark as In Progress
											</button>
											<button
												on:click={() => bulkUpdateStatus('completed')}
												class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
											>
												Mark as Completed
											</button>
											<hr class="my-1" />
											<button
												on:click={bulkDeleteTasks}
												class="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
											>
												Delete Selected
											</button>
										</div>
									</div>
								{/if}
							</div>
							<button on:click={clearSelection} class="text-sm text-gray-500 hover:text-gray-700">
								Clear
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Search and Primary Filters -->
		<div class="border-t border-gray-200 bg-white">
			<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
				<div class="flex flex-col space-y-4 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-4">
					<!-- Search -->
					<div class="relative max-w-md flex-1">
						<MagnifyingGlass
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<input
							bind:value={searchQuery}
							placeholder="Search tasks..."
							class="w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
						/>
					</div>

					<!-- Status Filter -->
					<div class="flex space-x-2 overflow-x-auto">
						{#each statusOptions as option}
							<button
								on:click={() => {
									statusFilter = option.value;
									handleFilterChange();
								}}
								class={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
									statusFilter === option.value
										? 'border border-emerald-200 bg-emerald-100 text-emerald-700'
										: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
								}`}
							>
								<svelte:component this={option.icon} class="h-4 w-4" />
								{option.label}
							</button>
						{/each}
					</div>

					<!-- Sort -->
					<div class="flex items-center space-x-2">
						<select
							bind:value={sortBy}
							on:change={handleFilterChange}
							class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
						>
							{#each sortOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
						<button
							on:click={() => handleSortChange(sortBy)}
							class="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50"
						>
							{#if sortOrder === 'asc'}
								<SortAscending class="h-4 w-4" />
							{:else}
								<SortDescending class="h-4 w-4" />
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Advanced Filters -->
		{#if showFilters}
			<div class="border-t border-gray-200 bg-gray-50" transition:fly={{ y: -10, duration: 200 }}>
				<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div>
							<label for="due-date-filter" class="mb-2 block text-sm font-medium text-gray-700"
								>Due Date</label
							>
							<select
								id="due-date-filter"
								bind:value={dueDateFilter}
								on:change={() => filterTasks()}
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
							>
								{#each dueDateOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="source-filter" class="mb-2 block text-sm font-medium text-gray-700"
								>Source</label
							>
							<select
								id="source-filter"
								bind:value={aiSuggestedFilter}
								on:change={() => filterTasks()}
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
							>
								<option value="all">All Sources</option>
								<option value="ai">AI Suggested</option>
								<option value="manual">Manual</option>
							</select>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<!-- Create Task Modal -->
		{#if isCreating}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div class="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
					<div class="flex items-center justify-between border-b border-gray-200 p-6">
						<h3 class="text-lg font-semibold text-gray-900">Create New Task</h3>
						<button
							on:click={cancelCreate}
							class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
						>
							<X class="h-5 w-5" />
						</button>
					</div>
					<div class="p-6">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="sm:col-span-2">
								<label for="new-task-title" class="mb-2 block text-sm font-medium text-gray-700"
									>Title *</label
								>
								<input
									id="new-task-title"
									bind:value={newTaskTitle}
									placeholder="Enter task title..."
									class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
								/>
							</div>
							<div class="sm:col-span-2">
								<label
									for="new-task-description"
									class="mb-2 block text-sm font-medium text-gray-700">Description</label
								>
								<textarea
									id="new-task-description"
									bind:value={newTaskDescription}
									placeholder="Enter task description..."
									rows="3"
									class="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
								></textarea>
							</div>
							<div>
								<label for="new-task-due-date" class="mb-2 block text-sm font-medium text-gray-700"
									>Due Date</label
								>
								<input
									id="new-task-due-date"
									type="date"
									bind:value={newTaskDueDate}
									class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
								/>
							</div>
						</div>
						<div class="mt-6 flex gap-3">
							<button
								on:click={cancelCreate}
								class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								on:click={saveNewTask}
								disabled={!newTaskTitle.trim()}
								class="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
							>
								Create Task
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tasks Display -->
		{#if loading}
			<div
				class={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
			>
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
				<h3 class="mb-2 text-lg font-semibold text-gray-900">No tasks found</h3>
				<p class="mb-6 max-w-md text-sm text-gray-600">
					{searchQuery || statusFilter !== 'all' || dueDateFilter !== 'all'
						? 'No tasks match your current filters. Try adjusting your search or filters.'
						: 'Get started by creating your first task to stay organized and productive.'}
				</p>
				<button
					on:click={createNewTask}
					class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700"
				>
					<Plus class="h-5 w-5" />
					Create Your First Task
				</button>
			</div>
		{:else}
			<!-- Grid View -->
			{#if viewMode === 'grid'}
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each filteredTasks as task, index}
						<div
							in:fade={{ duration: 200, delay: index * 30 }}
							class={`group relative overflow-hidden rounded-xl border-l-4 ${getPriorityColor(task)} border-t border-r border-b border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
						>
							<!-- Task Card Header -->
							<div class="p-6">
								<div class="mb-4 flex items-start justify-between">
									<div class="flex items-center space-x-3">
										<input
											type="checkbox"
											checked={selectedTasks.includes(task.id!)}
											on:change={() => toggleTaskSelection(task.id!)}
											class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
										/>
										<div class="min-w-0 flex-1">
											<button on:click={() => openTask(task.id!)} class="w-full text-left">
												<h3
													class={`text-lg leading-tight font-semibold transition-colors ${
														task.status === 'completed'
															? 'text-gray-500 line-through'
															: 'text-gray-900 group-hover:text-emerald-600'
													}`}
												>
													{task.title}
												</h3>
											</button>
										</div>
									</div>

									<div class="flex items-center space-x-2">
										{#if task.ai_suggested}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700"
											>
												<Lightning class="h-3 w-3" />
												AI
											</span>
										{/if}
										{#if task.goal_id}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
											>
												<Target class="h-3 w-3" />
											</span>
										{/if}
										{#if task.session_id}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
											>
												<ChatCircle class="h-3 w-3" />
											</span>
										{/if}
									</div>
								</div>

								<!-- Description -->
								{#if task.description}
									<p class="mb-4 line-clamp-3 text-sm text-gray-600">
										{task.description}
									</p>
								{/if}

								<!-- Status Badge -->
								<div class="mb-4">
									<span
										class={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(task.status)}`}
									>
										<svelte:component this={getStatusIcon(task.status)} class="h-3 w-3" />
										{task.status.replace('_', ' ').toUpperCase()}
									</span>
								</div>

								<!-- Due Date -->
								{#if task.due_date}
									<div class="mb-4 flex items-center gap-2">
										<Calendar class="h-4 w-4 text-gray-400" />
										<span
											class={`text-xs font-inter ${
												task.due_date < new Date().toISOString() && task.status !== 'completed'
													? 'font-medium text-red-600'
													: 'text-gray-600'
											}`}
										>
											{formatDueDate(task.due_date)}
										</span>
									</div>
								{/if}

								<!-- Footer Actions -->
								<div class="flex items-center justify-between border-t border-gray-100 pt-4">
									<div class="flex items-center space-x-2">
										<button
											on:click|stopPropagation={() => toggleTaskStatus(task)}
											class={`rounded-lg p-2 transition-all duration-200 ${
												task.status === 'completed'
													? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
													: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
											}`}
										>
											{#if task.status === 'completed'}
												<Check class="h-4 w-4" weight="bold" />
											{:else}
												<CheckSquare class="h-4 w-4" />
											{/if}
										</button>

										<span class="text-xs text-gray-500">
											{formatDate(task.created_at)}
										</span>
									</div>

									<button
										on:click|stopPropagation={() => handleDeleteTask(task.id!)}
										class="rounded-lg p-2 text-gray-400 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
									>
										<Trash class="h-4 w-4" />
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<!-- List View -->
				<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<!-- List Header -->
					<div class="border-b border-gray-200 bg-gray-50 px-6 py-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-4">
								<input
									type="checkbox"
									checked={selectedTasks.length === filteredTasks.length &&
										filteredTasks.length > 0}
									on:change={(e) =>
										e.target && (e.target as HTMLInputElement).checked
											? selectAllTasks()
											: clearSelection()}
									class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
								/>
								<span class="text-sm font-medium text-gray-700">
									{filteredTasks.length} tasks
								</span>
							</div>
							<div
								class="flex items-center space-x-6 text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								<span class="w-20 text-center">Status</span>
								<span class="w-24 text-center">Due Date</span>
								<span class="w-20 text-center">Actions</span>
							</div>
						</div>
					</div>

					<!-- List Items -->
					<div class="divide-y divide-gray-200">
						{#each filteredTasks as task, index}
							<div
								in:fade={{ duration: 200, delay: index * 20 }}
								class={`group flex items-center px-6 py-4 hover:bg-gray-50 ${getPriorityColor(task)} border-l-4 border-l-transparent transition-all duration-200 hover:border-l-emerald-500`}
							>
								<!-- Checkbox -->
								<div class="flex min-w-0 flex-1 items-center space-x-4">
									<input
										type="checkbox"
										checked={selectedTasks.includes(task.id!)}
										on:change={() => toggleTaskSelection(task.id!)}
										class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
									/>

									<!-- Task Info -->
									<div class="min-w-0 flex-1">
										<button on:click={() => openTask(task.id!)} class="w-full text-left">
											<div class="flex items-center space-x-3">
												<h3
													class={`text-base font-semibold ${
														task.status === 'completed'
															? 'text-gray-500 line-through'
															: 'text-gray-900 group-hover:text-emerald-600'
													}`}
												>
													{task.title}
												</h3>
												<div class="flex items-center space-x-2">
													{#if task.ai_suggested}
														<Lightning class="h-3 w-3 text-purple-600" />
													{/if}
													{#if task.goal_id}
														<Target class="h-3 w-3 text-emerald-600" />
													{/if}
													{#if task.session_id}
														<ChatCircle class="h-3 w-3 text-green-600" />
													{/if}
												</div>
											</div>
											{#if task.description}
												<p class="mt-1 line-clamp-1 text-sm text-gray-600">
													{task.description}
												</p>
											{/if}
										</button>
									</div>
								</div>

								<!-- Status -->
								<div class="flex w-20 justify-center">
									<span
										class={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}
									>
										<svelte:component this={getStatusIcon(task.status)} class="h-3 w-3" />
									</span>
								</div>

								<!-- Due Date -->
								<div class="w-24 text-center">
									{#if task.due_date}
										<span
											class={`text-xs ${
												task.due_date < new Date().toISOString() && task.status !== 'completed'
													? 'font-medium text-red-600'
													: 'text-gray-600'
											}`}
										>
											{formatDueDate(task.due_date)}
										</span>
									{:else}
										<span class="text-sm text-gray-400">—</span>
									{/if}
								</div>

								<!-- Actions -->
								<div class="flex w-20 justify-center space-x-2">
									<button
										on:click|stopPropagation={() => toggleTaskStatus(task)}
										class={`rounded-lg p-1.5 transition-all duration-200 ${
											task.status === 'completed'
												? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
												: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
										}`}
									>
										{#if task.status === 'completed'}
											<Check class="h-3 w-3" weight="bold" />
										{:else}
											<CheckSquare class="h-3 w-3" />
										{/if}
									</button>

									<button
										on:click|stopPropagation={() => handleDeleteTask(task.id!)}
										class="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
									>
										<Trash class="h-3 w-3" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
