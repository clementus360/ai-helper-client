import { getSessions } from '$lib/api';
import type { Session } from '$lib/api/types';
import { writable } from 'svelte/store';

export const chatSessions = writable<Session[]>([]);

export async function loadSessions() {
    try {
        const response = await getSessions();
        if (response.success && response.sessions) {
            chatSessions.set(response.sessions);
        }
    } catch (err) {
        console.error('Failed to load tasks:', err);
    }
}