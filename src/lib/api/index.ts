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

// DELETE /sessions (soft delete)
export async function deleteSession(sessionId: string): Promise<BaseResponse> {
  const headers = await getAuthHeaders();
  return handleApiResponse(() =>
    apiFetch<BaseResponse>(`/sessions?id=${sessionId}`, {
      method: 'DELETE',
      headers,
    })
  );
}

// POST /sessions/restore
export async function restoreSession(sessionId: string): Promise<BaseResponse> {
  const headers = await getAuthHeaders();
  return handleApiResponse(() =>
    apiFetch<BaseResponse>(`/sessions/restore?id=${sessionId}`, {
      method: 'POST',
      headers,
    })
  );
}

// GET /sessions/deleted
export async function getDeletedSessions(): Promise<GetSessionsResponse> {
  const headers = await getAuthHeaders();
  return handleApiResponse(() =>
    apiFetch<GetSessionsResponse>('/sessions/deleted', {
      headers,
    })
  );
}

// DELETE /sessions/permanent (hard delete)
export async function hardDeleteSession(sessionId: string): Promise<BaseResponse> {
  const headers = await getAuthHeaders();
  return handleApiResponse(() =>
    apiFetch<BaseResponse>(`/sessions/permanent?id=${sessionId}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ confirm: true }),
    })
  );
}

// Bulk operations for sessions
export async function bulkDeleteSessions(sessionIds: string[]): Promise<BulkOperationResponse> {
  const headers = await getAuthHeaders();
  return handleApiResponse(() =>
    apiFetch<BulkOperationResponse>('/sessions/bulk-delete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_ids: sessionIds }),
    })
  );
}

export async function bulkRestoreSessions(sessionIds: string[]): Promise<BulkOperationResponse> {
  const headers = await getAuthHeaders();
  return handleApiResponse(() =>
    apiFetch<BulkOperationResponse>('/sessions/bulk-restore', {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_ids: sessionIds }),
    })
  );
}

// Helper function for session operations with confirmation
export async function deleteSessionWithConfirmation(sessionId: string, permanent: boolean = false): Promise<BaseResponse> {
  if (permanent) {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this session? This action cannot be undone.'
    );
    if (!confirmed) {
      throw new Error('Operation cancelled by user');
    }
    return hardDeleteSession(sessionId);
  } else {
    return deleteSession(sessionId);
  }
}

// Type definitions for the responses
export interface BaseResponse {
  success: boolean;
  message?: string;
}

export interface DeleteSessionResponse {
  success: boolean;
  session_id: string;
  message?: string;
  deleted_at?: string;
}

export interface BulkOperationResponse {
  success: boolean;
  processed_ids: string[];
  failed_ids?: string[];
  total_count: number;
  success_count: number;
  failure_count: number;
  message?: string;
}

// Enhanced error handling for session operations
export class SessionError extends Error {
  constructor(
    message: string,
    public sessionId?: string,
    public operation?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

// Utility function for handling session-specific errors
export function handleSessionError(error: any, sessionId?: string, operation?: string): never {
  if (error instanceof SessionError) {
    throw error;
  }
  
  const message = error.message || 'An unknown error occurred';
  throw new SessionError(message, sessionId, operation, error);
}