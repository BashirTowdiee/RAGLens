from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[3]
    / 'infra'
    / 'migrations'
    / '014_ci_gate_persistence.sql'
)


def read_migration() -> str:
    return MIGRATION.read_text(encoding='utf-8')


def test_ci_gate_persistence_migration_adds_threshold_table() -> None:
    migration = read_migration()

    assert 'CREATE TABLE IF NOT EXISTS eval.quality_thresholds' in migration
    assert 'id uuid PRIMARY KEY' in migration
    assert 'name text NOT NULL' in migration
    assert 'description text NOT NULL DEFAULT' in migration
    assert 'min_hit_at_5 numeric(5, 4) NOT NULL DEFAULT' in migration
    assert 'min_citation_validity numeric(5, 4) NOT NULL DEFAULT' in migration
    assert 'min_groundedness numeric(5, 4) NOT NULL DEFAULT' in migration
    assert 'min_correctness numeric(5, 4) NOT NULL DEFAULT' in migration
    assert 'max_average_latency_ms integer NOT NULL DEFAULT' in migration
    assert 'idx_quality_thresholds_name' in migration


def test_ci_gate_persistence_migration_adds_gate_result_table() -> None:
    migration = read_migration()

    assert 'CREATE TABLE IF NOT EXISTS eval.ci_gate_results' in migration
    assert 'eval_run_id uuid NOT NULL REFERENCES eval.eval_runs (id) ON DELETE CASCADE' in migration
    assert 'quality_threshold_id uuid REFERENCES eval.quality_thresholds (id)' in migration
    assert 'preset_name text NOT NULL DEFAULT' in migration
    assert 'status text NOT NULL' in migration
    assert 'passed boolean NOT NULL' in migration
    assert "metrics jsonb NOT NULL DEFAULT '{}'::jsonb" in migration
    assert "threshold_results jsonb NOT NULL DEFAULT '[]'::jsonb" in migration
    assert 'summary_markdown text NOT NULL DEFAULT' in migration


def test_ci_gate_persistence_migration_adds_indexes_and_marker() -> None:
    migration = read_migration()

    assert 'idx_ci_gate_results_eval_run_created_at' in migration
    assert 'idx_ci_gate_results_status' in migration
    assert 'idx_ci_gate_results_passed' in migration
    assert "VALUES ('014_ci_gate_persistence')" in migration
