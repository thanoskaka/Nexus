import type { IncomingMessage, ServerResponse } from 'http';
import { getSetupCapabilities } from '../../src/server/setup/setupStatusService.js';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  if (_req.method && _req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const result = getSetupCapabilities({
    env: process.env as Record<string, string | undefined>,
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result));
}
