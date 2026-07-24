/**
 * Cluster detail card — shown when a timeline node is clicked.
 * Displays commits in the group with metadata.
 */

import { X, GitCommit, Calendar, Tag } from 'lucide-react';
import type { CommitGroup, Commit } from '@gitlens/engine';
import { useT } from '../../hooks/useLanguage';

interface ClusterCardProps {
  group: CommitGroup;
  commits: Commit[];
  onClose: () => void;
}

export default function ClusterCard({ group, commits, onClose }: ClusterCardProps) {
  const t = useT();
  const groupCommits = group.commitHashes
    .map((hash) => commits.find((c) => c.hash === hash))
    .filter(Boolean) as Commit[];

  return (
    <div className="glass-panel mt-4 p-5 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {group.label}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {group.startDate.toLocaleDateString()} → {group.endDate.toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <GitCommit className="w-3 h-3" />
              {group.commitHashes.length}{t('cluster.commits')}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Keywords */}
      {group.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {group.keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                         bg-brand-500/10 text-brand-400 text-xs border border-brand-500/20"
            >
              <Tag className="w-3 h-3" />
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Affected files */}
      {group.fileSet.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {t('cluster.affectedFiles')} ({group.fileSet.length})
          </h4>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {group.fileSet.slice(0, 15).map((file) => (
              <div
                key={file}
                className="text-xs font-mono text-gray-500 dark:text-gray-400 py-0.5 truncate"
              >
                {file}
              </div>
            ))}
            {group.fileSet.length > 15 && (
              <div className="text-xs text-gray-400">
                {t('cluster.andMore')}{group.fileSet.length - 15} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commit list */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          {t('cluster.commitsList')}
        </h4>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {groupCommits.map((commit) => (
            <div
              key={commit.hash}
              className="flex items-start gap-3 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/40
                         hover:bg-gray-100 dark:hover:bg-gray-900/60 transition-colors"
            >
              <div className="w-16 shrink-0">
                <span className="text-xs font-mono text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-1.5 py-0.5 rounded">
                  {commit.shortHash}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                  {commit.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{commit.author}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-600">
                    {commit.date.toLocaleDateString()}
                  </span>
                  {commit.files.length > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-600">
                      {commit.files.length}{t('cluster.file')}{commit.files.length > 1 ? 's' : ''}
                      {' · '}+{commit.files.reduce((s, f) => s + f.additions, 0)}
                      {' / -'}
                      {commit.files.reduce((s, f) => s + f.deletions, 0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
