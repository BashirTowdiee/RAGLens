from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[3]
    / 'infra'
    / 'migrations'
    / '016_eval_phase14_hardening.sql'
)


def read_migration() -> str:
    return MIGRATION.read_text(encoding='utf-8')


def test_phase14_migration_adds_eval_run_judge_enabled() -> None:
    migration = read_migration()

    assert 'ALTER TABLE eval.eval_runs' in migration
    assert 'ADD COLUMN IF NOT EXISTS judge_enabled boolean NOT NULL DEFAULT true' in migration


def test_phase14_migration_adds_eval_case_result_runtime_fields() -> None:
    migration = read_migration()
    json_default = "jsonb NOT NULL DEFAULT '[]'::jsonb"

    assert 'ALTER TABLE eval.eval_case_results' in migration
    assert 'ADD COLUMN IF NOT EXISTS question text NOT NULL DEFAULT' in migration
    assert 'ADD COLUMN IF NOT EXISTS expected_answer text NOT NULL DEFAULT' in migration
    assert f'ADD COLUMN IF NOT EXISTS expected_sources {json_default}' in migration
    assert f'ADD COLUMN IF NOT EXISTS retrieved_sources {json_default}' in migration
    assert f'ADD COLUMN IF NOT EXISTS retrieved_context {json_default}' in migration
    assert f'ADD COLUMN IF NOT EXISTS citations {json_default}' in migration
    assert 'ADD COLUMN IF NOT EXISTS request_id text NOT NULL DEFAULT' in migration


def test_phase14_migration_adds_comparisons_table_and_marker() -> None:
    migration = read_migration()

    assert 'CREATE TABLE IF NOT EXISTS eval.comparisons' in migration
    assert 'baseline_eval_run_id uuid NOT NULL REFERENCES eval.eval_runs (id)' in migration
    assert 'candidate_eval_run_id uuid NOT NULL REFERENCES eval.eval_runs (id)' in migration
    assert "VALUES ('016_eval_phase14_hardening')" in migration
