'use client';

import { usePathname } from 'next/navigation';
import { matchRouteMeta } from '../lib/routeMeta';

export default function Topbar() {
  const pathname = usePathname();
  const meta = matchRouteMeta(pathname);

  return (
    <header className="topbar">
      <div>
        <p className="breadcrumbs">{meta.breadcrumb}</p>
        <h1>{meta.title}</h1>
      </div>
      <div className="top-actions">{meta.actions ?? null}</div>
    </header>
  );
}
