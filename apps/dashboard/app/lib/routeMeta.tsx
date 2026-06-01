import Link from 'next/link';
import type { ReactNode } from 'react';

export type RouteMeta = {
  pattern: RegExp;
  title: string;
  breadcrumb: string;
  actions?: ReactNode;
};

export const routeMeta: RouteMeta[] = [
  { pattern: /^\/$/, title: 'Overview', breadcrumb: 'RAGLens' },
  { pattern: /^\/documents$/, title: 'Documents', breadcrumb: 'Corpus / Documents' },
  { pattern: /^\/documents\/upload$/, title: 'Upload document', breadcrumb: 'Corpus / Upload' },
  { pattern: /^\/documents\/[^/]+$/, title: 'Document detail', breadcrumb: 'Corpus / Document detail' },
  { pattern: /^\/retrieval$/, title: 'Retrieval inspector', breadcrumb: 'Corpus / Retrieval' },
  { pattern: /^\/retrieval\/traces\/[^/]+$/, title: 'Query trace detail', breadcrumb: 'Corpus / Query traces' },
  { pattern: /^\/queries$/, title: 'Query traces', breadcrumb: 'Corpus / Query traces' },
  {
    pattern: /^\/datasets$/,
    title: 'Datasets',
    breadcrumb: 'Evaluation / Datasets',
    actions: <Link href="/datasets#create-dataset" className="button">Create dataset</Link>
  },
  { pattern: /^\/datasets\/[^/]+$/, title: 'Dataset detail', breadcrumb: 'Evaluation / Dataset detail' },
  {
    pattern: /^\/eval-runs$/,
    title: 'Eval runs',
    breadcrumb: 'Evaluation / Eval runs',
    actions: <Link href="/eval-runs/new" className="button">Create eval run</Link>
  },
  { pattern: /^\/eval-runs\/new$/, title: 'Create eval run', breadcrumb: 'Evaluation / Create eval run' },
  { pattern: /^\/eval-runs\/[^/]+$/, title: 'Eval run detail', breadcrumb: 'Evaluation / Eval run detail' },
  { pattern: /^\/eval-runs\/[^/]+\/results\/[^/]+$/, title: 'Case result', breadcrumb: 'Evaluation / Case result' },
  { pattern: /^\/comparisons$/, title: 'Comparisons', breadcrumb: 'Evaluation / Comparisons' },
  { pattern: /^\/comparisons\/new$/, title: 'Comparison wizard', breadcrumb: 'Evaluation / Comparison wizard' },
  { pattern: /^\/comparisons\/[^/]+$/, title: 'Comparison detail', breadcrumb: 'Evaluation / Comparison detail' },
  { pattern: /^\/devtools$/, title: 'Developer tools', breadcrumb: 'Operations / Devtools' },
  { pattern: /^\/settings$/, title: 'Settings', breadcrumb: 'Operations / Settings' }
];

export function matchRouteMeta(pathname: string): Omit<RouteMeta, 'pattern'> {
  const found = routeMeta.find((entry) => entry.pattern.test(pathname));
  if (found) {
    const { title, breadcrumb, actions } = found;
    return { title, breadcrumb, actions };
  }

  return {
    title: 'Dashboard',
    breadcrumb: 'RAGLens'
  };
}
