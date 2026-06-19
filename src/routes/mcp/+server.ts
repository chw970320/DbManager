import type { RequestHandler } from './$types';

import { handleRemoteMcpRequest, handleUnsupportedRemoteMcpMethod } from '../../mcp/remote-http.js';

export const prerender = false;

export const POST: RequestHandler = ({ request }) => handleRemoteMcpRequest(request);
export const GET: RequestHandler = ({ request }) => handleUnsupportedRemoteMcpMethod(request);
export const DELETE: RequestHandler = ({ request }) => handleUnsupportedRemoteMcpMethod(request);
