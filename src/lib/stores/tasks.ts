// src/lib/stores/tasks.ts
import { writable, derived, type Readable } from 'svelte/store';
import { getTasks } from '$lib/api';
import type { Task } from '$lib/api/types';

export const tasks = writable<Task[]>([]);

export const tasksBySession: Readable<(chatId?: string) => Task[]> = derived(
    tasks,
    ($tasks) => (chatId?: string) =>
        chatId ? $tasks.filter((t) => t.session_id === chatId) : $tasks
);

export async function loadTasks(session_id?: string) {
    try {
        const response = await getTasks({session_id});
        if (response.success && response.tasks) {
            tasks.set(response.tasks);
        }
    } catch (err) {
        console.error('Failed to load tasks:', err);
    }
}
