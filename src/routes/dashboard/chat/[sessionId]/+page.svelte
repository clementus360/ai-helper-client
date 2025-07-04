<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, tick } from 'svelte';
	import { User, Boat, ArrowUpRight, CheckCircle, Clock } from 'phosphor-svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	import { sendMessage as apiSendMessage, getTasks, sendMessage } from '$lib/api';
	import { getMessages } from '$lib/api'; // adjust if your import path differs
	import type { Message as ApiMessageBase, GetTasksOptions } from '$lib/api/types';

	// Extend ApiMessage to include optional tasks property
	type ApiMessage = ApiMessageBase & { tasks?: Task[] };
	import { loadTasks } from '$lib/stores/tasks';
	import { fade, fly } from 'svelte/transition';

	export let isTransitioning: boolean;

	interface Task {
		id?: string;
		title: string;
		description: string;
		status: string;
		ai_suggested: boolean;
		created_at: string;
		session_id: string;
		follow_up_due_at?: string;
	}

	interface Message {
		id: string;
		content: string;
		role: 'user' | 'assistant';
		timestamp: Date;
		tasks?: Task[]; // Add tasks to messages
	}

	let messages: Message[] = [];
	let messageInput = '';
	let chatContainer: HTMLElement;
	let messagesContainer: HTMLElement;
	let isLoading = false;
	let isChatLoading = true;
	let previousChatId: string | null = null;

	let lastMessageEl: HTMLElement | null = null;
	let lastMessageCount = 0;

	$: chatId = $page.params.sessionId;

	// Configure marked for better rendering
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	// Function to safely render markdown
	function renderMarkdown(content: string): string {
		try {
			const html = marked.parse(content) as string;
			return DOMPurify.sanitize(html);
		} catch (error) {
			console.error('Error rendering markdown:', error);
			return content;
		}
	}

	// Function to determine if content should be rendered as markdown
	function shouldRenderAsMarkdown(content: string, role: 'user' | 'assistant'): boolean {
		if (role === 'assistant') return true;

		const markdownPatterns = [
			/\*\*.*?\*\*/,
			/\*.*?\*/,
			/`.*?`/,
			/```[\s\S]*?```/,
			/^#{1,6}\s/m,
			/^\s*[-*+]\s/m,
			/^\s*\d+\.\s/m,
			/\[.*?\]\(.*?\)/
		];

		return markdownPatterns.some((pattern) => pattern.test(content));
	}

	// Function to generate task URL
	function getTaskUrl(taskId: string): string {
		return `/dashboard/tasks/${taskId}`;
	}

	// Reactively load messages when chatId changes
	$: if (chatId && chatId !== previousChatId) {
		loadMessagesForChat(chatId);
		previousChatId = chatId;
	}

	async function loadMessagesForChat(currentChatId: string) {
		messages = [];
		messageInput = '';
		isLoading = false;
		isChatLoading = true;

		if (currentChatId?.startsWith('temp-')) {
			isChatLoading = false;
			return;
		}

		try {
			const MAX_TASK_DELAY = 30 * 1000;

			// Load both messages and tasks for this session
			const [messagesResponse, tasksResponse] = await Promise.all([
				getMessages(currentChatId),
				getTasks({ session_id: currentChatId } as GetTasksOptions)
			]);

			if (currentChatId === chatId) {
				// Map messages and associate tasks with assistant messages
				const loadedMessages = messagesResponse.messages.map((msg: ApiMessage) => ({
					id: msg.id || crypto.randomUUID(),
					content: msg.content,
					role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
					timestamp: new Date(msg.created_at || new Date().toISOString()),
					tasks: msg.tasks || [] // Include tasks if they come with the message
				}));

				// If tasks weren't included in messages, associate them with assistant messages
				// by finding tasks created around the same time as assistant messages
				if (tasksResponse && Array.isArray(tasksResponse.tasks) && tasksResponse.tasks.length > 0) {
					loadedMessages.forEach((message, index) => {
						if (message.role === 'assistant' && (!message.tasks || message.tasks.length === 0)) {
							// Find tasks created shortly after this message
							const messageTime = message.timestamp.getTime();
							const associatedTasks = (tasksResponse.tasks ?? [])
								.map((task: any) => ({ ...task, session_id: task.session_id ?? '' }))
								.filter((task: Task) => {
									const taskTime = new Date(task.created_at).getTime();
									return taskTime >= messageTime && taskTime <= messageTime + MAX_TASK_DELAY;
								});

							if (associatedTasks.length > 0) {
								message.tasks = associatedTasks;
							}
						}
					});
				}

				messages = loadedMessages;
			}
		} catch (error) {
			console.error('Failed to load chat messages:', error);
			if (currentChatId === chatId) {
				messages = [];
			}
		} finally {
			if (currentChatId === chatId) {
				isChatLoading = false;
			}
		}
	}

	async function sendChatMessage(message: string) {
		const messageToSend = message.trim();
		messageInput = '';

		const userMsg: Message = {
			id: crypto.randomUUID(),
			content: messageToSend,
			role: 'user',
			timestamp: new Date()
		};
		messages = [...messages, userMsg];
		isLoading = true;

		await tick();
		setTimeout(scrollToBottom, 300);

		try {
			const response = await apiSendMessage({
				message: messageToSend,
				session_id: chatId,
				force_new: false
			});

			// Create assistant message with tasks
			const assistantMsg: Message = {
				id: crypto.randomUUID(),
				content: response.ai_response ?? '(no response)',
				role: 'assistant',
				timestamp: new Date(),
				tasks: (response.action_items || []).map((task: any) => ({
					...task,
					session_id: task.session_id ?? ''
				})) // Ensure session_id is always a string
			};

			messages = [...messages, assistantMsg];
			messageInput = '';
			await loadTasks();
		} catch (error) {
			console.error('Error sending message:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (messageInput.trim()) {
				sendChatMessage(messageInput);
			}
		}
	}

	function scrollToBottom() {
		if (lastMessageEl) {
			lastMessageEl.scrollIntoView({ behavior: 'smooth' });
		}
	}

	function setLastMessageRef(node: HTMLElement, isLastMessage: boolean) {
		if (isLastMessage) {
			lastMessageEl = node;
		}
		return {
			update(newIsLastMessage: boolean) {
				if (newIsLastMessage) {
					lastMessageEl = node;
				} else if (lastMessageEl === node) {
					lastMessageEl = null;
				}
			}
		};
	}

	$: {
		if (messages.length > lastMessageCount) {
			setTimeout(scrollToBottom, 100);
		}
		lastMessageCount = messages.length;
	}

	onMount(() => {
		console.log('Chat component mounted');
	});
</script>

<div class="flex h-full w-full flex-col justify-end">
	{#if isChatLoading}
		<div class="flex h-full items-center justify-center text-gray-500">
			<div class="flex flex-col items-center gap-2">
				<div class="h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500"></div>
				<p>Loading messages...</p>
			</div>
		</div>
	{:else}
		<!-- Messages Container -->
		<div bind:this={chatContainer} class="mb-8 flex w-full justify-center overflow-y-scroll">
			<div bind:this={messagesContainer} class="max-w-3xl flex-1 space-y-4">
				{#if messages.length === 0}
					<div class="flex h-full items-center justify-center text-gray-500">
						<p>Start a conversation by typing a message below.</p>
					</div>
				{/if}
				{#each messages as message, i (message.id)}
					<div
						in:fly={{
							y: 20,
							duration: 400,
							delay: message.role === 'assistant' ? 100 : 0
						}}
						use:setLastMessageRef={i === messages.length - 1}
						class={`message-group flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
					>
						<!-- Message Bubble -->
						<div
							class={`message flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
						>
							<div
								class={`message-bubble flex max-w-sm flex-col gap-2 rounded-xl px-4 py-2 lg:max-w-xl ${
									message.role === 'user'
										? 'rounded-br-none bg-emerald-600 text-white'
										: 'rounded-bl-none border border-emerald-500 bg-emerald-50/20 text-gray-800'
								}`}
							>
								{#if shouldRenderAsMarkdown(message.content, message.role)}
									<div class="markdown-content">
										{@html renderMarkdown(message.content)}
									</div>
								{:else}
									<p class="whitespace-pre-wrap">{message.content}</p>
								{/if}
								<p
									class={`mt-1 text-xs ${message.role === 'user' ? 'text-emerald-100' : 'text-gray-500'}`}
								>
									{message.timestamp.toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit'
									})}
								</p>
							</div>
						</div>

						<!-- Tasks Section (only for assistant messages with tasks) -->
						{#if message.role === 'assistant' && message.tasks && message.tasks.length > 0}
							<div class="tasks-container w-full max-w-sm lg:max-w-xl">
								<div class="mb-2 flex items-center gap-2">
									<CheckCircle class="h-4 w-4 text-emerald-500" />
									<span class="text-sm font-medium text-gray-700">Tasks created</span>
								</div>
								<div class="space-y-2">
									{#each message.tasks as task}
										<div
											class="task-item rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-emerald-300"
											in:fly={{ y: 10, duration: 300, delay: 150 }}
										>
											<div class="flex items-start justify-between gap-2">
												<div class="min-w-0 flex-1">
													<h4 class="text-sm leading-tight font-medium text-gray-900">
														{task.title}
													</h4>
													<p class="mt-1 line-clamp-2 text-xs text-gray-600">
														{task.description}
													</p>
												</div>
												<div class="flex flex-shrink-0 items-center gap-2">
													<div class="flex items-center gap-1">
														<Clock class="h-3 w-3 text-gray-400" />
														<span class="text-xs text-gray-500">
															{task.status}
														</span>
													</div>
													{#if task.id}
														<a
															href={getTaskUrl(task.id)}
															class="text-xs font-medium text-emerald-600 underline hover:text-emerald-700"
														>
															View
														</a>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/each}

				{#if isLoading}
					<div
						class="flex justify-start gap-3"
						in:fade={{ duration: 200 }}
						out:fade={{ duration: 200 }}
					>
						<div class="loading-bubble rounded-lg bg-gray-100 px-4 py-3">
							<div class="flex items-center gap-1">
								<div class="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
								<div
									class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
									style="animation-delay: 0.1s"
								></div>
								<div
									class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
									style="animation-delay: 0.2s"
								></div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Message Input -->
	<div class="flex w-full justify-center">
		<div
			id="shared-input"
			class={`relative mx-auto w-full max-w-3xl rounded-lg border-[0.1rem] bg-white transition-all duration-300 ${
				isTransitioning ? 'morph-in' : ''
			}`}
		>
			<textarea
				bind:value={messageInput}
				on:keydown={handleKeyDown}
				disabled={isLoading || isTransitioning}
				placeholder="Type your message here..."
				rows="2"
				class="w-full resize-none border-none bg-transparent p-4 pr-16 text-gray-800 placeholder-gray-500 outline-none focus:border-transparent focus:ring-0 focus:outline-none disabled:opacity-50"
			></textarea>

			<!-- Send Button -->
			<button
				on:click={() => messageInput.trim() && sendChatMessage(messageInput)}
				disabled={!messageInput.trim() || isLoading || isTransitioning}
				class="absolute right-3 bottom-3 rounded-xl bg-emerald-500 p-2 text-white transition-colors duration-200 hover:bg-emerald-600 disabled:bg-gray-300"
			>
				{#if isLoading || isTransitioning}
					<div class="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
				{:else}
					<ArrowUpRight class="h-5 w-5" />
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	@keyframes morphIn {
		from {
			transform: translateY(100px) scale(0.95);
			opacity: 0.5;
		}
		to {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
	}

	.morph-in {
		animation: morphIn 0.4s ease forwards;
	}

	.message-bubble {
		transform-origin: bottom center;
		animation: messageAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	.loading-bubble {
		transform-origin: bottom left;
		animation: loadingPulse 1s ease-in-out infinite alternate;
	}

	@keyframes messageAppear {
		0% {
			opacity: 0;
			transform: translateY(10px) scale(0.95);
		}
		50% {
			opacity: 0.8;
			transform: translateY(-2px) scale(1.02);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes loadingPulse {
		0% {
			transform: scale(1);
			opacity: 0.7;
		}
		100% {
			transform: scale(1.02);
			opacity: 1;
		}
	}

	.message-bubble {
		transition: all 0.2s ease;
	}

	.message-bubble:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.task-item {
		transition: all 0.2s ease;
	}

	.task-item:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.overflow-y-auto {
		scroll-behavior: smooth;
	}

	.line-clamp-2 {
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	/* Markdown content styling */
	.markdown-content {
		line-height: 1.6;
	}

	.markdown-content :global(h1),
	.markdown-content :global(h2),
	.markdown-content :global(h3),
	.markdown-content :global(h4),
	.markdown-content :global(h5),
	.markdown-content :global(h6) {
		margin: 1em 0 0.5em 0;
		font-weight: 600;
	}

	.markdown-content :global(h1) {
		font-size: 1.5em;
	}
	.markdown-content :global(h2) {
		font-size: 1.3em;
	}
	.markdown-content :global(h3) {
		font-size: 1.1em;
	}

	.markdown-content :global(p) {
		margin: 0.5em 0;
	}

	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		margin: 0.5em 0;
		padding-left: 1.5em;
	}

	.markdown-content :global(li) {
		margin: 0.25em 0;
	}

	.markdown-content :global(code) {
		background-color: rgba(0, 0, 0, 0.1);
		padding: 0.2em 0.4em;
		border-radius: 3px;
		font-size: 0.9em;
		font-family: 'Courier New', monospace;
	}

	.markdown-content :global(pre) {
		background-color: rgba(0, 0, 0, 0.05);
		padding: 1em;
		border-radius: 6px;
		overflow-x: auto;
		margin: 0.5em 0;
	}

	.markdown-content :global(pre code) {
		background-color: transparent;
		padding: 0;
	}

	.markdown-content :global(blockquote) {
		border-left: 4px solid #d1d5db;
		padding-left: 1em;
		margin: 0.5em 0;
		color: #6b7280;
	}

	.markdown-content :global(a) {
		color: #059669;
		text-decoration: underline;
	}

	.markdown-content :global(a:hover) {
		color: #047857;
	}

	.markdown-content :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.5em 0;
	}

	.markdown-content :global(th),
	.markdown-content :global(td) {
		border: 1px solid #d1d5db;
		padding: 0.5em;
		text-align: left;
	}

	.markdown-content :global(th) {
		background-color: rgba(0, 0, 0, 0.05);
		font-weight: 600;
	}

	.markdown-content :global(strong) {
		font-weight: 600;
	}

	.markdown-content :global(em) {
		font-style: italic;
	}

	.message-bubble.bg-emerald-600 .markdown-content :global(code) {
		background-color: rgba(255, 255, 255, 0.2);
	}

	.message-bubble.bg-emerald-600 .markdown-content :global(pre) {
		background-color: rgba(255, 255, 255, 0.15);
	}

	.message-bubble.bg-emerald-600 .markdown-content :global(blockquote) {
		border-left-color: rgba(255, 255, 255, 0.5);
		color: rgba(255, 255, 255, 0.9);
	}

	.message-bubble.bg-emerald-600 .markdown-content :global(a) {
		color: #a7f3d0;
	}

	.message-bubble.bg-emerald-600 .markdown-content :global(a:hover) {
		color: #d1fae5;
	}
</style>
