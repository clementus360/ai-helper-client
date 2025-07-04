// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';

import type { ServerLoadEvent } from '@sveltejs/kit';

export function load({ locals }: ServerLoadEvent) {
	if (locals.user) {
		throw redirect(307, '/dashboard');
	} else {
		throw redirect(307, '/login');
	}
}