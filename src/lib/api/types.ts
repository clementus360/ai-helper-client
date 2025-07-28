// Base entity types matching Go structs exactly
export interface Message {
    id?: string;                 // omitempty in Go
    user_id: string;
    sender: string;
    content: string;
    created_at?: string;         // omitempty in Go, time.Time -> string in JSON
    session_id: string;
    user_message_id?: string
}

export interface Task {
    id?: string;                 // omitempty in Go
    user_id: string;
    goal_id?: string | null;     // nullable pointer in Go
    message_id?: string | null; // nullable pointer in Go
    title: string;
    description: string;
    status: string;
    due_date?: string | null;    // nullable time.Time -> string in JSON
    ai_suggested: boolean;
    created_at: string;          // time.Time -> string in JSON
    session_id?: string | null;  // nullable pointer in Go
    decision?: string;           // omitempty in Go
    follow_up_due_at?: string;   // omitempty in Go, time.Time -> string in JSON
    followed_up?: boolean;       // omitempty in Go
}

export interface Session {
    id?: string;                 // omitempty in Go
    user_id: string;
    title: string;
    created_at?: string | null;  // nullable pointer time.Time -> string in JSON
}

export interface SessionContext {
    summary: string;
    recent_messages: Message[];
}

export interface SessionSummary {
    session_id: string;
    summary: string;
    last_updated?: string;       // omitempty in Go, time.Time -> string in JSON
}

// Request types
export interface ChatRequest {
    message: string;
    session_id?: string;         // omitempty in Go
    force_new: boolean
}

// API Response types matching Go structs exactly
export interface ChatResponse {
    success: boolean;
    user_message: string;
    ai_response?: string;        // omitempty in Go
    action_items?: Task[];       // omitempty in Go
    error?: string;              // omitempty in Go (ErrorMessage field)
    session_id: string;
}

export interface GetMessagesResponse {
    success: boolean;
    messages: Message[];
}

export interface GetTasksResponse {
    success: boolean;
    tasks?: Task[];              // omitempty in Go
    total?: number;              // omitempty in Go (int)
    limit?: number;              // omitempty in Go (int)
    offset?: number;             // omitempty in Go (int)
    error?: string;              // omitempty in Go (ErrorMessage field)
}

export type GetTasksOptions = {
	session_id?: string;
	status?: string;
	limit?: number;
	offset?: number;
	search?: string;
	sort_by?: string;
	sort_order?: 'asc' | 'desc';
};

export interface GetSingleTaskResponse {
    success: boolean;
    task?: Task[];              // omitempty in Go
    error?: string;              // omitempty in Go (ErrorMessage field)
}

export interface TaskResponse {
    success: boolean;
    task?: Task;                 // omitempty in Go
    error?: string;              // omitempty in Go (ErrorMessage field)
}

export interface DeleteTaskResponse {
    success: boolean;
    error?: string;              // omitempty in Go (ErrorMessage field)
    message?: string;            // omitempty in Go
}

export interface GetSessionsResponse {
    success: boolean;
    sessions: Session[];
}

export interface SessionResponse {
    success: boolean;
    session: Session;
}

export interface SupabaseGetTasksResponse {
    data: Task[];
    count: number;               // int64 in Go
}