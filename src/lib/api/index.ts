import apiFetch from '../client';
import { supabase } from '../supabaseClient';
import type {
    ChatResponse,
    GetMessagesResponse,
    GetTasksResponse,
    TaskResponse,
    DeleteTaskResponse,
    GetSessionsResponse,
    SessionResponse,
    Session,
    ChatRequest,
    Task,
    GetSingleTaskResponse,
    GetTasksOptions,
} from './types';


// Helper function to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new Error('No authentication token available');
    }

    return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
    };
}

// Helper function to handle API responses with proper error checking
async function handleApiResponse<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
        const response = await apiCall();

        // Check if response has success field and it's false
        if (typeof response === 'object' && response !== null && 'success' in response) {
            const successResponse = response as any;
            if (!successResponse.success) {
                throw new Error(successResponse.error || 'API request failed');
            }
        }

        return response;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// POST /chat
export async function sendMessage(data: ChatRequest): Promise<ChatResponse> {
    const headers = await getAuthHeaders();
    return handleApiResponse(() =>
        apiFetch<ChatResponse>('/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        })
    );
}

// GET /chat?session_id=...
export async function getMessages(sessionId: string): Promise<GetMessagesResponse> {
    const headers = await getAuthHeaders();
    return handleApiResponse(() =>
        apiFetch<GetMessagesResponse>(`/chat?session_id=${sessionId}`, {
            headers,
        })
    );
}

// GET /tasks
export async function getTasks(options: GetTasksOptions = {}): Promise<GetTasksResponse> {
    const headers = await getAuthHeaders();

    // Construct query string
    const params = new URLSearchParams();

    if (options.session_id) params.set('session_id', options.session_id);
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.search) params.set('search', options.search);
    if (options.sort_by) params.set('sort_by', options.sort_by);
    if (options.sort_order) params.set('sort_order', options.sort_order);

    const query = params.toString();
    const url = `/tasks${query ? `?${query}` : ''}`;

    return handleApiResponse(() =>
        apiFetch<GetTasksResponse>(url, {
            headers,
        })
    );
}

// GET /tasks/single?id=...
export async function getSingleTask(taskId: string): Promise<GetSingleTaskResponse> {
    const headers = await getAuthHeaders();
    return handleApiResponse(() =>
        apiFetch<GetSingleTaskResponse>(`/task?id=${taskId}`, {
            headers,
        })
    );
}

// POST /tasks/create
export async function createTask(task: { title: string; description: string; session_id?: string }): Promise<TaskResponse> {
    const headers = await getAuthHeaders();
    return handleApiResponse(() =>
        apiFetch<TaskResponse>('/tasks/create', {
            method: 'POST',
            headers,
            body: JSON.stringify(task),
        })
    );
}

// PATCH /tasks/update
export async function updateTask(taskId: string, task: Partial<Task>): Promise<TaskResponse> {
    const headers = await getAuthHeaders();
    return handleApiResponse(() =>
        apiFetch<TaskResponse>(`/tasks/update?id=${taskId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(task),
        })
    );
}

// DELETE /tasks/delete?id=...
export async function deleteTask(taskId: string): Promise<DeleteTaskResponse> {
    const headers = await getAuthHeaders();
    return handleApiResponse(() =>
        apiFetch<DeleteTaskResponse>(`/tasks/delete?id=${taskId}`, {
            method: 'DELETE',
            headers,
        })
    );
}

// GET /sessions
export async function getSessions(): Promise<GetSessionsResponse> {
    const headers = await getAuthHeaders();
    return handleApiResponse(() =>
        apiFetch<GetSessionsResponse>('/sessions', {
            headers,
        })
    );
}

// PATCH /sessions/update
export async function updateSession(sessionId: string, session: Partial<Session>): Promise<SessionResponse> {
    console.log('Updating session:', session);
    const headers = await getAuthHeaders();
    return handleApiResponse(() =>
        apiFetch<SessionResponse>(`/sessions/update?id=${sessionId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(session),
        })
    );
}