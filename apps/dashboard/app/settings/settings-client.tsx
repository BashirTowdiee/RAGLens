'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type RuntimeSettingsField = {
  key: string;
  label: string;
  description: string;
  kind: 'text' | 'url' | 'number' | 'select' | 'secret';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  value: string;
  isSet: boolean;
};

type RuntimeSettingsSection = {
  id: string;
  title: string;
  description: string;
  fields: RuntimeSettingsField[];
};

type RuntimeSettingsResponse = {
  ok: boolean;
  configSurface: string;
  sources?: {
    ragApiBaseUrl?: string;
    evalApiBaseUrl?: string;
  };
  persistence?: string;
  sections: RuntimeSettingsSection[];
  message?: string;
  restartRequired?: boolean;
  error?: string;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      configSurface: string;
      sources?: {
        ragApiBaseUrl?: string;
        evalApiBaseUrl?: string;
      };
      persistence?: string;
      sections: RuntimeSettingsSection[];
    };

export function SettingsClient() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [plainValues, setPlainValues] = useState<Record<string, string>>({});
  const [basePlainValues, setBasePlainValues] = useState<Record<string, string>>({});
  const [secretSetValues, setSecretSetValues] = useState<Record<string, string>>({});
  const [clearSecrets, setClearSecrets] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/settings/runtime', { cache: 'no-store' });
        const payload = (await response.json()) as RuntimeSettingsResponse;
        if (!active) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setLoadState({
            status: 'error',
            message: payload.error ?? `settings route returned HTTP ${response.status}`
          });
          return;
        }

        hydrateFromResponse(payload);
      } catch (error) {
        if (!active) {
          return;
        }
        setLoadState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to load runtime settings.'
        });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const hasPendingChanges = useMemo(() => {
    const plainChanged = Object.entries(plainValues).some(
      ([key, value]) => value !== (basePlainValues[key] ?? '')
    );
    const secretChanged = Object.values(secretSetValues).some((value) => value.trim().length > 0);
    const secretCleared = Object.values(clearSecrets).some((isChecked) => isChecked);
    return plainChanged || secretChanged || secretCleared;
  }, [basePlainValues, clearSecrets, plainValues, secretSetValues]);

  if (loadState.status === 'loading') {
    return (
      <section className="card">
        <div className="card-header">
          <h2>Runtime configuration</h2>
        </div>
        <div className="card-body">
          <p className="datasets-note">Loading settings…</p>
        </div>
      </section>
    );
  }

  if (loadState.status === 'error') {
    return (
      <section className="panel error-panel">
        <h2>Unable to load runtime settings</h2>
        <p>{loadState.message}</p>
      </section>
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError('');
    setSaveMessage('');

    const changedPlainValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(plainValues)) {
      if (value !== (basePlainValues[key] ?? '')) {
        changedPlainValues[key] = value;
      }
    }

    const changedSecretValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(secretSetValues)) {
      if (value.trim().length > 0) {
        changedSecretValues[key] = value;
      }
    }

    const keysToClear = Object.entries(clearSecrets)
      .filter(([, isChecked]) => isChecked)
      .map(([key]) => key);

    if (
      Object.keys(changedPlainValues).length === 0 &&
      Object.keys(changedSecretValues).length === 0 &&
      keysToClear.length === 0
    ) {
      setSaveMessage('No changes to save.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/runtime', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plainValues: changedPlainValues,
          secretSetValues: changedSecretValues,
          clearSecrets: keysToClear
        })
      });
      const payload = (await response.json()) as RuntimeSettingsResponse;
      if (!response.ok || !payload.ok) {
        setSaveError(payload.error ?? `settings route returned HTTP ${response.status}`);
        return;
      }

      hydrateFromResponse(payload);
      setSecretSetValues({});
      setClearSecrets({});
      setSaveMessage(
        payload.restartRequired
          ? 'Saved. Restart backend services to apply updates.'
          : payload.message ?? 'Saved.'
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save runtime settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <h2>Runtime configuration</h2>
      </div>
      <div className="card-body settings-stack">
        <p className="datasets-note">
          Configure rag-api and eval-api runtime defaults directly from dashboard through backend configuration APIs.
        </p>
        <p className="datasets-note">
          Request-level `ragConfigId` still controls per-query behavior; this page manages baseline service runtime defaults.
        </p>
        <p className="datasets-note">
          Config surface: <code>{loadState.configSurface}</code>
          {loadState.persistence ? (
            <>
              {' '}
              · persistence: <code>{loadState.persistence}</code>
            </>
          ) : null}
        </p>
        {loadState.sources ? (
          <p className="datasets-note">
            rag-api: <code>{loadState.sources.ragApiBaseUrl ?? 'n/a'}</code> · eval-api:{' '}
            <code>{loadState.sources.evalApiBaseUrl ?? 'n/a'}</code>
          </p>
        ) : null}

        <form className="settings-form" onSubmit={onSubmit}>
          {loadState.sections.map((section) => (
            <section key={section.id} className="settings-section">
              <h3>{section.title}</h3>
              <p>{section.description}</p>
              <div className="settings-field-grid">
                {section.fields.map((field) => {
                  if (field.kind === 'secret') {
                    return (
                      <label key={field.key} className="settings-field settings-secret-field">
                        {field.label}
                        <span className="settings-field-description">{field.description}</span>
                        <span className={field.isSet ? 'pill green' : 'pill neutral'}>
                          {field.isSet ? 'configured' : 'not set'}
                        </span>
                        <input
                          type="password"
                          value={secretSetValues[field.key] ?? ''}
                          placeholder="Enter new value to replace current secret"
                          onChange={(event) =>
                            setSecretSetValues((current) => ({
                              ...current,
                              [field.key]: event.target.value
                            }))
                          }
                        />
                        <span className="settings-clear-secret">
                          <input
                            type="checkbox"
                            checked={clearSecrets[field.key] ?? false}
                            onChange={(event) =>
                              setClearSecrets((current) => ({
                                ...current,
                                [field.key]: event.target.checked
                              }))
                            }
                          />
                          clear existing secret
                        </span>
                      </label>
                    );
                  }

                  const value = plainValues[field.key] ?? '';
                  return (
                    <label key={field.key} className="settings-field">
                      {field.label}
                      <span className="settings-field-description">{field.description}</span>
                      {field.kind === 'select' ? (
                        <select
                          value={value}
                          onChange={(event) =>
                            setPlainValues((current) => ({
                              ...current,
                              [field.key]: event.target.value
                            }))
                          }
                        >
                          {(field.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.kind === 'number' ? 'number' : field.kind === 'url' ? 'url' : 'text'}
                          value={value}
                          placeholder={field.placeholder}
                          onChange={(event) =>
                            setPlainValues((current) => ({
                              ...current,
                              [field.key]: event.target.value
                            }))
                          }
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="settings-actions">
            <button type="submit" disabled={isSaving || !hasPendingChanges}>
              {isSaving ? 'Saving...' : 'Save settings'}
            </button>
            {!hasPendingChanges ? <span className="datasets-note">No unsaved changes.</span> : null}
          </div>
        </form>

        {saveMessage ? <p className="datasets-success-text">{saveMessage}</p> : null}
        {saveError ? <p className="datasets-error">{saveError}</p> : null}
      </div>
    </section>
  );

  function hydrateFromResponse(payload: RuntimeSettingsResponse) {
    const nextPlainValues: Record<string, string> = {};
    for (const section of payload.sections) {
      for (const field of section.fields) {
        if (field.kind === 'secret') {
          continue;
        }
        nextPlainValues[field.key] = field.value;
      }
    }

    setLoadState({
      status: 'ready',
      configSurface: payload.configSurface,
      sources: payload.sources,
      persistence: payload.persistence,
      sections: payload.sections
    });
    setPlainValues(nextPlainValues);
    setBasePlainValues(nextPlainValues);
  }
}
