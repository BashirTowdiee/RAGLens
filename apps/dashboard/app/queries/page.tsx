import Link from 'next/link';

export default function QueryTracesPage() {
  return (
    <section className="card">
      <div className="card-header">
        <h2>Query traces</h2>
      </div>
      <div className="card-body">
        <p>
          Query traces are generated from retrieval searches. Run a retrieval query, then open the trace detail from
          the retrieval result panel.
        </p>
        <Link href="/retrieval" className="button">
          Open retrieval inspector
        </Link>
      </div>
    </section>
  );
}
