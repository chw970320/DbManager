import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

import { handleRemoteMcpRequest, handleUnsupportedRemoteMcpMethod } from '../../mcp/remote-http.js';

export const prerender = false;

export const POST: RequestHandler = ({ request }) => handleRemoteMcpRequest(request, { env });
export const GET: RequestHandler = ({ request }) =>
	handleUnsupportedRemoteMcpMethod(request, { env });
export const DELETE: RequestHandler = ({ request }) =>
	handleUnsupportedRemoteMcpMethod(request, { env });
