<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, tick } from 'svelte';
	import { ArrowUpRight, CheckCircle, Clock, Copy, ArrowClockwise, Trash } from 'phosphor-svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	import Prism from 'prismjs';
	// Import Prism theme and languages you want
	import 'prismjs/themes/prism-tomorrow.css';
	import 'prismjs/components/prism-json';
	import 'prismjs/components/prism-python';
	import 'prismjs/components/prism-javascript'; // Add more as needed
	import 'prismjs/components/prism-csharp';

	import { sendMessage as apiSendMessage, getTasks, sendMessage } from '$lib/api';
	import { getMessages } from '$lib/api'; // adjust if your import path differs

	import { loadTasks } from '$lib/stores/tasks';
	import { fade, fly } from 'svelte/transition';
	import type { GetTasksOptions, Message, Task } from '$lib/api/types';
	import { loadSessions } from '$lib/stores/sessions';

	export let isTransitioning: boolean;

	type MessageWithExtras = Message & {
		role: 'user' | 'assistant';
		timestamp: Date;
		tasks?: Task[];
	};

	let messages: MessageWithExtras[] = [];
	let messageInput = '';
	let chatContainer: HTMLElement;
	let messagesContainer: HTMLElement;
	let isLoading = false;
	let isChatLoading = true;
	let previousChatId: string | null = null;

	let lastMessageEl: HTMLElement | null = null;
	let lastMessageCount = 0;

	$: chatId = $page.params.sessionId;

	const renderer = new marked.Renderer();

	renderer.code = ({ text, lang, escaped }) => {
		const language = lang && Prism.languages[lang] ? lang : 'plaintext';
		const highlighted = Prism.highlight(text, Prism.languages[language], language);
		return `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;
	};

	// Configure marked for better rendering
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	// Function to safely render markdown
	async function renderMarkdown(content: string): Promise<string> {
		try {
			const html = await marked.parse(content, { renderer });
			return DOMPurify.sanitize(html);
		} catch (error) {
			console.error('Markdown rendering failed:', error);
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
			// Load both messages and tasks for this session
			const [messagesResponse, tasksResponse] = await Promise.all([
				getMessages(currentChatId),
				getTasks({ session_id: currentChatId } as GetTasksOptions)
			]);

			if (currentChatId === chatId) {
				// Map messages and associate tasks with assistant messages
				const loadedMessages: MessageWithExtras[] = messagesResponse.messages.map((msg) => ({
					...msg,
					role: msg.sender === 'user' ? 'user' : 'assistant',
					timestamp: new Date(msg.created_at || new Date().toISOString()),
					tasks: [] // placeholder, will fill below
				}));

				// If tasks weren't included in messages, associate them with assistant messages
				// by finding tasks created around the same time as assistant messages
				if (tasksResponse && Array.isArray(tasksResponse.tasks) && tasksResponse.tasks.length > 0) {
					loadedMessages.forEach((message) => {
						if (message.role === 'assistant') {
							const associatedTasks = (tasksResponse.tasks ?? [])
								.filter((task) => task.message_id === message.id)
								.map((task) => ({
									...task,
									session_id: task.session_id ?? ''
								}));
							message.tasks = associatedTasks;
						}
					});
				}

				messages = loadedMessages;
			}
		} catch (error) {
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

		const userMsg: MessageWithExtras = {
			id: crypto.randomUUID(),
			content: messageToSend,
			role: 'user',
			timestamp: new Date(),
			user_id: '', // Set appropriately if you have the user id
			sender: 'user',
			session_id: chatId
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
			const assistantMsg: MessageWithExtras = {
				id: crypto.randomUUID(),
				content: response.ai_response ?? '(no response)',
				role: 'assistant',
				timestamp: new Date(),
				tasks: (response.action_items || []).map((task: any) => ({
					...task,
					session_id: task.session_id ?? ''
				})), // Ensure session_id is always a string
				user_id: '', // Set appropriately if you have the user id
				sender: 'ai',
				session_id: chatId
			};

			messages = [...messages, assistantMsg];
			messageInput = '';

			setTimeout(async () => {
				await loadTasks();
				await loadSessions();
			}, 3000);

			const lastMessage = messages[messages.length - 1];
			if (lastMessage?.role === 'assistant') {
				const sessionTasks = await getTasks({ session_id: chatId });
				const relatedTasks = Array.isArray(sessionTasks.tasks)
					? sessionTasks.tasks.filter((task) => task.message_id === lastMessage.id)
					: [];
				lastMessage.tasks = relatedTasks;
			}
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

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			// You could add a toast notification here
			console.log('Copied to clipboard');
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	}
</script>

<div class="flex h-full w-full flex-col justify-end py-4">
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
			<div bind:this={messagesContainer} class="flex flex-col max-w-3xl flex-1 space-y-4 gap-4">
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
						class="message-group mx-auto mb-6 w-full max-w-4xl"
					>
						<!-- Message Container -->
						<div
							class={`message-container group relative rounded-lg backdrop-blur-xl transition-all duration-200 ${
								message.role === 'user'
									? 'ml-12 bg-emerald-500/10'
									: 'mr-12 bg-white/5'
							}`}
						>
							<!-- Message Content -->
							<div class="px-4 py-4">
								{#if shouldRenderAsMarkdown(message.content, message.role)}
									<div class="markdown-content prose prose-invert prose-emerald max-w-none">
										{#await renderMarkdown(message.content) then html}
											{@html html}
										{:catch error}
											<p class="text-sm text-red-400">Failed to render markdown</p>
										{/await}
									</div>
								{:else}
									<p class="leading-relaxed whitespace-pre-wrap text-white">{message.content}</p>
								{/if}
							</div>

							<!-- Tasks Section (only for assistant messages with tasks) -->
							{#if message.role === 'assistant' && message.tasks && message.tasks.length > 0}
								<div class="mt-3 px-4 pb-4">
									<div class="mb-3 flex items-center gap-2">
										<CheckCircle class="h-4 w-4 text-emerald-400" />
										<span class="text-sm font-medium text-gray-300">Tasks created</span>
									</div>
									<div class="space-y-2">
										{#each message.tasks as task}
											<div
												class="task-item rounded-md border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-all hover:border-emerald-400/30 hover:bg-white/10"
												in:fly={{ y: 10, duration: 300, delay: 150 }}
											>
												<div class="flex items-start justify-between gap-2">
													<div class="min-w-0 flex-1">
														<h4 class="text-sm leading-tight font-medium text-white">
															{task.title}
														</h4>
														<p class="mt-1 line-clamp-2 text-xs text-gray-400">
															{task.description}
														</p>
													</div>
													<div class="flex flex-shrink-0 items-center gap-2">
														<div class="flex items-center gap-1">
															<Clock class="h-3 w-3 text-gray-500" />
															<span class="text-xs text-gray-400">
																{task.status}
															</span>
														</div>
														{#if task.id}
															<a
																href={getTaskUrl(task.id)}
																class="text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
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

							<!-- Hover Actions and Timestamp -->
							<div
								class={`absolute -bottom-6 w-full left-4 flex items-center gap-2 transition-opacity duration-200 ${message.role === 'user' ? 'justify-end px-4':''}`}
							>
								<!-- Timestamp -->
								<span class="text-xs text-gray-500">
									{message.timestamp.toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit'
									})}
								</span>

								<!-- Action Buttons -->
								<div class="flex items-center gap-1">
									<button
										on:click={() => copyToClipboard(message.content)}
										class="rounded-md p-1.5 text-gray-500 transition-colors hover:text-white"
										title="Copy message"
									>
										<Copy class="h-3 w-3" />
									</button>

									<!-- {#if message.role === 'assistant'}
										<button
											on:click={() => regenerateMessage(message.id)}
											class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
											title="Regenerate response"
										>
											<ArrowClockwise class="h-3 w-3" />
										</button>
									{/if}

									<button
										on:click={() => deleteMessage(message.id)}
										class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-red-400"
										title="Delete message"
									>
										<Trash class="h-3 w-3" />
									</button> -->
								</div>
							</div>
						</div>
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
			class={`relative mx-auto w-full max-w-3xl rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:border-white/20 ${
				isTransitioning ? 'morph-in' : ''
			}`}
		>
			<textarea
				bind:value={messageInput}
				on:keydown={handleKeyDown}
				disabled={isLoading || isTransitioning}
				placeholder="Type your message here..."
				rows="2"
				class="w-full resize-none border-none bg-transparent p-4 pr-16 text-white placeholder-gray-400 outline-none focus:border-transparent focus:ring-0 focus:outline-none disabled:opacity-50"
			></textarea>
			<!-- Send Button -->
			<button
				on:click={() => messageInput.trim() && sendChatMessage(messageInput)}
				disabled={!messageInput.trim() || isLoading || isTransitioning}
				class="absolute right-3 bottom-3 rounded-xl bg-emerald-500/90 p-2 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 disabled:bg-gray-600/50 disabled:hover:scale-100"
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
		line-clamp: 2;
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
