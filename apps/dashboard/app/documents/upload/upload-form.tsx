'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';

const MAX_FILE_BYTES = 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['md', 'markdown', 'txt']);

function getFileExtension(filename: string): string {
  const segments = filename.toLowerCase().split('.');
  return segments.length > 1 ? segments[segments.length - 1] ?? '' : '';
}

function inferDocumentTitle(filename: string): string {
  const baseName = filename.replace(/\.[^.]+$/, '').trim();
  return baseName || 'Untitled Document';
}

function inferSourceId(filename: string): string {
  const baseName = filename.replace(/\.[^.]+$/, '').trim().toLowerCase();
  const slug = baseName
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return slug || `document-${Date.now()}`;
}

function validateFile(file: File): string | null {
  const extension = getFileExtension(file.name);

  if (!ALLOWED_EXTENSIONS.has(extension)) return 'Only .md, .markdown, and .txt files are supported.';
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > MAX_FILE_BYTES) return 'The selected file is too large. Maximum size is 1 MB.';
  return null;
}

export default function UploadDocumentForm() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [sourceUri, setSourceUri] = useState('');
  const [contentPreview, setContentPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewStats = useMemo(() => {
    const lineCount = contentPreview ? contentPreview.split(/\r?\n/).length : 0;
    return { chars: contentPreview.length, lines: lineCount };
  }, [contentPreview]);

  async function handleFileSelection(file: File | null) {
    setError(null);
    setSelectedFile(file);
    setContentPreview('');

    if (!file) return;

    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    const text = await file.text();
    if (!text.trim()) {
      setError('The selected file is empty.');
      return;
    }

    setContentPreview(text);
    if (!title.trim()) setTitle(inferDocumentTitle(file.name));
    if (!sourceId.trim()) setSourceId(inferSourceId(file.name));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Choose a .md, .markdown, or .txt file before uploading.');
      return;
    }

    const fileError = validateFile(selectedFile);
    if (fileError) {
      setError(fileError);
      return;
    }

    if (!contentPreview.trim()) {
      setError('The selected file is empty.');
      return;
    }

    const resolvedTitle = title.trim() || inferDocumentTitle(selectedFile.name);
    const resolvedSourceId = sourceId.trim() || inferSourceId(selectedFile.name);

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/documents/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceId: resolvedSourceId,
          title: resolvedTitle,
          sourceType: 'markdown',
          sourceUri: sourceUri.trim() ? sourceUri.trim() : undefined,
          content: contentPreview
        })
      });

      const body = (await response.json().catch(() => null)) as { document?: { id?: string }; message?: string } | null;

      if (!response.ok) {
        setError(body?.message ?? `Upload failed with HTTP ${response.status}.`);
        return;
      }

      const documentId = body?.document?.id;
      if (!documentId) {
        setError('Upload succeeded but the response did not include a document ID.');
        return;
      }

      router.push(`/documents/${documentId}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Upload failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="stack upload-stack">
      <Link href="/documents" className="back-link">← Documents</Link>

      <section className="card">
        <div className="card-header"><h2>Upload document</h2></div>
        <div className="card-body">
          <p className="datasets-note">
            Upload Markdown or plain text files. Supported extensions: <code>.md</code>, <code>.markdown</code>, and <code>.txt</code> (max 1 MB).
          </p>

          <form className="upload-form" onSubmit={handleSubmit}>
            <label>
              File
              <input
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                onChange={(event) => {
                  void handleFileSelection(event.target.files?.[0] ?? null);
                }}
              />
            </label>

            <label>
              Document title (optional)
              <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Remote Work Policy" />
            </label>

            <label>
              Source ID (optional)
              <input type="text" value={sourceId} onChange={(event) => setSourceId(event.target.value)} placeholder="remote-work-policy" />
            </label>

            <label>
              Source path/URI (optional)
              <input
                type="text"
                value={sourceUri}
                onChange={(event) => setSourceUri(event.target.value)}
                placeholder="infra/seed/documents/policies/remote-work-policy-v2.md"
              />
            </label>

            <section>
              <div className="chunk-header upload-preview-header">
                <strong>Preview</strong>
                <span>{previewStats.lines} lines · {previewStats.chars} chars</span>
              </div>
              <pre className="chunk-content upload-preview">
                {contentPreview || 'Select a .md/.markdown/.txt file to preview content before upload.'}
              </pre>
            </section>

            {error ? (
              <section className="panel error-panel upload-error-panel">
                <strong>Upload failed</strong>
                <p>{error}</p>
              </section>
            ) : null}

            <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Uploading…' : 'Upload document'}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
