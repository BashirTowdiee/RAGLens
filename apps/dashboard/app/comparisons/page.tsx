import Link from 'next/link';

export default function ComparisonsPage() {
  return (
    <section className="card empty-state">
      <div className="card-header">
        <h2>Comparisons</h2>
      </div>
      <div className="card-body">
        <p>
          Comparisons are created from the eval runs page by selecting a baseline run and a candidate run from the
          same dataset.
        </p>
        <div className="button-row">
          <Link href="/eval-runs" className="button">
            Go to eval runs
          </Link>
          <Link href="/comparisons/new" className="button-secondary">
            Open comparison wizard
          </Link>
        </div>
      </div>
    </section>
  );
}
