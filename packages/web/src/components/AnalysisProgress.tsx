/**
 * Analysis progress display — shows current phase and progress bar.
 */

import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { AnalysisState } from '../hooks/useAnalysis';
import { useT } from '../hooks/useLanguage';

interface AnalysisProgressProps {
  state: AnalysisState;
}

const PHASE_KEYS: Record<string, Parameters<typeof import('../lib/i18n').t>[0]> = {
  starting: 'progress.starting',
  parsing: 'progress.parsing',
  grouping: 'progress.grouping',
  clustering: 'progress.clustering',
  narrating: 'progress.narrating',
  heatmap: 'progress.heatmap',
  done: 'progress.done',
};

export default function AnalysisProgress({ state }: AnalysisProgressProps) {
  const t = useT();

  if (state.status === 'idle') return null;

  const phaseLabel = state.progress
    ? (t(PHASE_KEYS[state.progress.phase] as any) || state.progress.message)
    : '';

  return (
    <div className="glass-panel p-5 space-y-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {state.status === 'running' && (
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          )}
          {state.status === 'done' && (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          )}
          {state.status === 'error' && (
            <XCircle className="w-5 h-5 text-red-400" />
          )}

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {state.status === 'running' && phaseLabel}
            {state.status === 'done' && t('progress.complete')}
            {state.status === 'error' && t('progress.failed')}
          </span>
        </div>

        {state.progress && (
          <span className="text-xs text-gray-500 font-mono">
            {Math.round(state.progress.progress * 100)}%
          </span>
        )}
      </div>

      <div className="relative h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
            state.status === 'error'
              ? 'bg-red-500'
              : state.status === 'done'
                ? 'bg-green-500'
                : 'bg-gradient-to-r from-brand-600 to-brand-400'
          }`}
          style={{ width: `${(state.progress?.progress || 0) * 100}%` }}
        />
      </div>

      {state.progress && (
        <p className="text-xs text-gray-500 font-mono truncate">
          {state.progress.message}
        </p>
      )}

      {state.error && (
        <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-lg p-3">
          {state.error}
        </p>
      )}
    </div>
  );
}
