# Claim

Timestamp: 2026-05-27T21:12:00+10:00
Worker-id: chatgpt-worker-b
Selected action: 5
Active stage: Phase 15 - Advanced retrieval
Acceptance criterion: query rewriting improves retrieval input before search execution
Intended branch: agent/chatgpt-worker-b/phase15-query-rewrite
PR: replacement for closed PR #74 if reopening fails
Likely files:
- apps/rag-api/src/documents/queryRewrite.ts
- apps/rag-api/src/documents/queryRewrite.test.ts
Evidence used:
- PR #74 is closed and empty after branch reset.
- Phase 15 roadmap lists query rewriting.
- Fresh worker-a rerank claim touches documentRepository/postgres/routing/query trace files, so this worker-b slice is limited to standalone query rewrite helper and tests.
