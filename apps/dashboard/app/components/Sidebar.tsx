'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type HealthStatus = {
  ragApi: 'healthy' | 'unhealthy' | 'unknown';
  evalApi: 'healthy' | 'unhealthy' | 'unknown';
};

type NavItem = {
  label: string;
  href: string;
  count?: string;
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'RAGLens',
    items: [{ label: 'Overview', href: '/' }]
  },
  {
    title: 'Corpus',
    items: [
      { label: 'Documents', href: '/documents' },
      { label: 'Retrieval', href: '/retrieval' },
      { label: 'Query traces', href: '/queries' }
    ]
  },
  {
    title: 'Evaluation',
    items: [
      { label: 'Datasets', href: '/datasets' },
      { label: 'Eval runs', href: '/eval-runs' },
      { label: 'Comparisons', href: '/comparisons' }
    ]
  },
  {
    title: 'Operations',
    items: [
      { label: 'Devtools', href: '/devtools' },
      { label: 'Settings', href: '/settings' }
    ]
  }
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tone(status: HealthStatus['ragApi']): 'green' | 'red' | 'neutral' {
  if (status === 'healthy') {
    return 'green';
  }
  if (status === 'unhealthy') {
    return 'red';
  }
  return 'neutral';
}

export default function Sidebar({ health }: { health: HealthStatus }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">RL</span>
        <div>
          <strong>RAGLens</strong>
          <p>Evaluation cockpit</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="nav">
        {navGroups.map((group) => (
          <section key={group.title}>
            <p className="nav-section-title">{group.title}</p>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link${active ? ' active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span>{item.label}</span>
                  {item.count ? <span className="nav-count">{item.count}</span> : null}
                </Link>
              );
            })}
          </section>
        ))}
      </nav>

      <footer className="sidebar-footer">
        <p><strong>Environment:</strong> local</p>
        <p><strong>Boundary:</strong> rag-api + eval-api</p>
        <div className="stack">
          <span className={`pill ${tone(health.ragApi)}`}>rag-api: {health.ragApi}</span>
          <span className={`pill ${tone(health.evalApi)}`}>eval-api: {health.evalApi}</span>
        </div>
      </footer>
    </aside>
  );
}
