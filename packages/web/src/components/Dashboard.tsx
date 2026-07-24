/**
 * Main dashboard — assembles timeline, heatmap, and contribution views
 * into a unified analysis display. Supports i18n + light/dark theme.
 */

import { useState } from 'react';
import { Clock, Flame, Users, Hash, CalendarDays } from 'lucide-react';
import type { AnalysisResult } from '@gitlens/engine';
import Timeline from './Timeline/Timeline';
import FileHeatMap from './HeatMap/FileHeatMap';
import ContributionGraph from './Authors/ContributionGraph';
import { useT } from '../hooks/useLanguage';

interface DashboardProps {
  result: AnalysisResult;
}

type Tab = 'timeline' | 'heatmap' | 'authors';

/** Extract a human-readable repo name from the path. Handles both local paths and cloned repos. */
function repoDisplayName(repoPath: string): string {
  // Cloned repo pattern: /tmp/gitlens-clones/Owner__Repo
  const cloneMatch = repoPath.match(/gitlens-clones[\\/](.+)$/);
  if (cloneMatch) {
    return cloneMatch[1].replace(/__/g, '/');
  }
  // Regular path: just show the last segment
  return repoPath.split(/[/\\]/).pop() || repoPath;
}

export default function Dashboard({ result }: DashboardProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<Tab>('timeline');

  const tabs: { id: Tab; labelKey: Parameters<typeof t>[0]; icon: React.ReactNode }[] = [
    { id: 'timeline', labelKey: 'dashboard.tabTimeline', icon: <Clock className="w-4 h-4" /> },
    { id: 'heatmap', labelKey: 'dashboard.tabHotFiles', icon: <Flame className="w-4 h-4" /> },
    { id: 'authors', labelKey: 'dashboard.tabAuthors', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Summary bar */}
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4 text-brand-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-200">
            {repoDisplayName(result.repoPath)}
          </h2>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {result.headHash.slice(0, 7)}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <StatCard label={t('dashboard.commits')} value={result.totalCommits.toLocaleString()} icon={<Hash className="w-3.5 h-3.5" />} />
          <StatCard label={t('dashboard.authors')} value={result.authors.length.toString()} icon={<Users className="w-3.5 h-3.5" />} />
          <StatCard label={t('dashboard.groups')} value={result.groups.length.toString()} icon={<Clock className="w-3.5 h-3.5" />} />
          <StatCard label={t('dashboard.timeSpan')} value={daysBetween(result.dateRange.start, result.dateRange.end, t)} icon={<CalendarDays className="w-3.5 h-3.5" />} />
        </div>

        {/* Milestone tags */}
        {result.milestones && result.milestones.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800/60">
            {result.milestones.slice(0, 5).map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                           bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/20"
                title={m.narrative}
              >
                {m.icon} {m.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800/60">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-brand-600/30 text-brand-600 dark:text-brand-400 shadow-sm dark:shadow-lg'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'timeline' && (
          <div className="glass-panel p-5">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              {t('timeline.commitActivity')}
            </h3>
            <Timeline result={result} nowLabel={t('timeline.now')} />
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="glass-panel p-5">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              {t('heatmap.fileChangeFreq')}
            </h3>
            <FileHeatMap entries={result.heatmap} />
          </div>
        )}

        {activeTab === 'authors' && (
          <ContributionGraph
            authors={result.authors}
            totalCommits={result.totalCommits}
          />
        )}
      </div>

      {/* AI Clusters */}
      {result.clusters && result.clusters.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            {t('ai.semanticClusters')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {result.clusters
              .sort((a, b) => b.importance - a.importance)
              .map((cluster) => (
                <div key={cluster.id} className="glass-card">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        cluster.category === 'feature'
                          ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/20'
                          : cluster.category === 'refactor'
                            ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/20'
                            : cluster.category === 'fix'
                              ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-500/20'
                              : cluster.category === 'breaking'
                                ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/20'
                                : 'bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-500/20'
                      }`}
                    >
                      {cluster.category}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-600">
                      <span>{cluster.commitHashes.length}{t('ai.commits')}</span>
                      <span>{Math.round(cluster.importance * 100)}% {t('ai.importance')}</span>
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
                    {cluster.label}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {cluster.description}
                  </p>
                  {cluster.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cluster.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-xs text-gray-600 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card flex items-center gap-3">
      <div className="text-gray-400 dark:text-gray-600">{icon}</div>
      <div>
        <div className="text-lg font-bold text-gray-900 dark:text-gray-200">{value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-600">{label}</div>
      </div>
    </div>
  );
}

function daysBetween(start: Date, end: Date, t: ReturnType<typeof useT>): string {
  const ms = end.getTime() - start.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return t('time.lessThanDay');
  if (days < 30) return `${days}${t('time.days')}`;
  if (days < 365) return `${Math.round(days / 30)}${t('time.months')}`;
  return `${(days / 365).toFixed(1)}${t('time.years')}`;
}
