/**
 * Author contribution visualization — bar chart + summary stats.
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Users, GitCommit, TrendingUp } from 'lucide-react';
import type { Author } from '@gitlens/engine';
import { useT } from '../../hooks/useLanguage';

interface ContributionGraphProps {
  authors: Author[];
  totalCommits: number;
}

export default function ContributionGraph({
  authors,
  totalCommits,
}: ContributionGraphProps) {
  const t = useT();
  const chartData = useMemo(() => {
    return authors
      .slice(0, 10)
      .map((a) => ({
        name: a.name,
        commits: a.commits,
        percentage: ((a.commits / totalCommits) * 100).toFixed(1),
        additions: a.additions,
        deletions: a.deletions,
      }));
  }, [authors, totalCommits]);

  const colors = [
    '#818cf8', '#6366f1', '#4f46e5', '#a78bfa',
    '#7c3aed', '#c084fc', '#8b5cf6', '#6d28d9',
    '#9333ea', '#a855f7',
  ];

  if (authors.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-gray-500">
        {t('heatmap.noData')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            {t('authors.contributors')}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-200">
            {authors.length}
          </div>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <GitCommit className="w-3.5 h-3.5" />
            {t('authors.totalCommits')}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-200">
            {totalCommits}
          </div>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {t('authors.topContributor')}
          </div>
          <div className="text-2xl font-bold text-brand-400">
            {authors[0]?.name || '—'}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="glass-panel p-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
          {t('authors.commitsPerAuthor')}
        </h4>
        <ResponsiveContainer width="100%" height={Math.max(chartData.length * 36, 200)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 10, right: 20, top: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#e5e7eb',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'commits') return [`${value}${t('authors.commitsUnit')}`, 'Commits'];
                return [value, name];
              }}
            />
            <Bar dataKey="commits" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Author table */}
      <div className="glass-panel p-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          {t('authors.allContributors')}
        </h4>
        <div className="space-y-1">
          {authors.map((author, i) => (
            <div
              key={author.email || author.name}
              className="flex items-center justify-between py-2 px-3 rounded-lg
                         hover:bg-gray-900/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-gray-600 w-5 text-right">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-gray-300 truncate">
                    {author.name}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {author.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs shrink-0">
                <span className="text-gray-400">
                  {author.commits} commits
                </span>
                <span className="text-green-400">
                  +{author.additions}
                </span>
                <span className="text-red-400">
                  -{author.deletions}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
