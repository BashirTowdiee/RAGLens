from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[3]
    / 'infra'
    / 'migrations'
    / '013_eval_judge_persistence.sql'
)


def read_migration() -> str:
    return MIGRATION.read_text(encoding='utf-8')


def test_judge_persistence_migration_adds_evaluator_prompt_table() -> None:
    migration = read_migration()

    assert 'CREATE TABLE IF NOT EXISTS eval.evaluator_prompts' in migration
    assert 'prompt_version text NOT NULL' in migration
    assert 'provider text NOT NULL DEFAULT' in migration
    assert 'model text NOT NULL DEFAULT' in migration
    assert 'system_prompt text NOT NULL' in migration
    assert 'user_prompt_template text NOT NULL' in migration
    assert 'idx_evaluator_prompts_version_provider_model' in migration


def test_judge_persistence_migration_adds_case_result_judge_columns() -> None:
    migration = read_migration()

    assert 'ALTER TABLE eval.eval_case_results' in migration
    assert 'judge_scores jsonb NOT NULL DEFAULT' in migration
    assert 'judge_unsupported_claims jsonb NOT NULL DEFAULT' in migration
    assert 'judge_missing_important_points jsonb NOT NULL DEFAULT' in migration
    assert 'judge_verdict text NOT NULL DEFAULT' in migration
    assert 'judge_rationale text NOT NULL DEFAULT' in migration
    assert 'judge_error text NOT NULL DEFAULT' in migration
    assert 'evaluator_prompt_id uuid REFERENCES eval.evaluator_prompts (id)' in migration


def test_judge_persistence_migration_adds_indexes_and_marker() -> None:
    migration = read_migration()

    assert 'idx_eval_case_results_judge_verdict' in migration
    assert 'idx_eval_case_results_judge_error' in migration
    assert "VALUES ('013_eval_judge_persistence')" in migration
