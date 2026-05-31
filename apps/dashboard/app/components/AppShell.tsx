import type { ReactNode } from 'react';
import { getEvalApiBaseUrl } from '../lib/evalApi';
import { getRagApiBaseUrl } from '../lib/ragApi';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

async function checkHealth(url: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
  try {
    const response = await fetch(`${url}/api/v1/health`, { cache: 'no-store' });
    return response.ok ? 'healthy' : 'unhealthy';
  } catch {
    return 'unknown';
  }
}

export default async function AppShell({ children }: { children: ReactNode }) {
  const [ragApi, evalApi] = await Promise.all([
    checkHealth(getRagApiBaseUrl()),
    checkHealth(getEvalApiBaseUrl())
  ]);

  return (
    <div className="app-shell">
      <Sidebar health={{ ragApi, evalApi }} />
      <main className="main">
        <Topbar />
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
