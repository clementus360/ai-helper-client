const BASE_API_URL = import.meta.env.VITE_API_URL; // or full URL if calling external service

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    try {
        const res = await fetch(`${BASE_API_URL}${path}`, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error?.error || `API error: ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error(`API fetch failed for ${path}:`, err);
        throw err;
    }
}

export default apiFetch;