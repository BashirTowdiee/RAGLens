# Claim

Timestamp: 2026-05-27T21:03:00+10:00
Worker-id: chatgpt-worker-a
Selected action: 5
Active stage: Phase 15
Acceptance criterion: retrieved chunks show original score and rerank score where available.
Intended branch: agent/chatgpt-worker-a/phase15-rerank-scores
PR: none
Likely files:
- apps/rag-api/src/documents/types.ts
- apps/rag-api/src/documents/documentRepository.ts
- apps/rag-api/src/documents/postgresDocumentRepository.ts
- apps/rag-api/src/documents/retrievalTraceRepository.ts
- apps/rag-api/src/documents/postgresRetrievalTraceRepository.ts
- apps/rag-api/src/documents/routes.ts
- apps/rag-api/src/query/queryService.ts
- apps/rag-api/src/query/queryTraceRepository.ts
- apps/rag-api/src/query/routes.ts
- apps/rag-api/src/documents/*rerank*.test.ts or equivalent focused route test
Evidence used:
- PR #74 is closed without merge and no open PRs are surfaced.
- Phase 15 roadmap lists hybrid_reranked and requires retrieved chunks to show original score and rerank score where available.
- Worker-a must avoid worker-b's closed phase15-query-rewrite branch.
