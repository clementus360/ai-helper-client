import { writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
}

const initialState: AuthState = {
    user: null,
    session: null,
    loading: true
};

export const auth = writable<AuthState>(initialState);

// Initialize auth state
export const initializeAuth = async () => {
    try {
        // Get initial session
        const {
            data: { session },
            error
        } = await supabase.auth.getSession();

        if (error) {
            console.error('Error getting session:', error);
            auth.set({ user: null, session: null, loading: false });
            return;
        }

        let user = session?.user ?? null;

        // Access raw_user_meta_data to extract username
        const rawMeta = (user as any)?.raw_user_meta_data;
        const usernameInMeta = user?.user_metadata?.username;

        if (user && !usernameInMeta && rawMeta?.username) {
            const { data: updatedUserData, error: updateError } = await supabase.auth.updateUser({
                data: {
                    username: rawMeta.username
                }
            });

            if (updateError) {
                console.warn('Failed to update user_metadata with username:', updateError);
            } else {
                user = updatedUserData.user;
            }
        }

        auth.set({
            user,
            session,
            loading: false
        });

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            auth.set({
                user: session?.user ?? null,
                session,
                loading: false
            });
        });

        console.log('Auth initialized:', user);
    } catch (error) {
        console.error('Error initializing auth:', error);
        auth.set({ user: null, session: null, loading: false });
    }
};

// Sign out function
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
    }
};