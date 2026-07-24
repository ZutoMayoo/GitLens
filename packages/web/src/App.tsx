/**
 * GitLens App — main application shell with theme & language toggles.
 */

import { useState, useEffect, useCallback } from 'react';
import { GitBranch, Activity, Sun, Moon, Languages } from 'lucide-react';
import RepoInput from './components/RepoInput';
import AnalysisProgress from './components/AnalysisProgress';
import Dashboard from './components/Dashboard';
import { useAnalysis } from './hooks/useAnalysis';
import { useTheme } from './hooks/useTheme';
import { useLanguage, useT } from './hooks/useLanguage';
import { connectWebSocket } from './lib/ws';
import { getServerConfig, type ServerConfig } from './lib/api';

export default function App() {
  const { status, progress, result, error, startAnalysis, reset } = useAnalysis();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLanguage();
  const t = useT();
  const [repoPath, setRepoPath] = useState('');
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    llmAvailable: false,
    llmProvider: null,
  });

  useEffect(() => {
    connectWebSocket();
    getServerConfig()
      .then(setServerConfig)
      .catch(() => setServerConfig({ llmAvailable: false, llmProvider: null }));
  }, []);

  const handleAnalyze = useCallback(
    async (path: string, useLLM: boolean) => {
      setRepoPath(path);
      await startAnalysis({
        repoPath: path,
        maxCommits: 200,
        useLLM,
      });
    },
    [startAnalysis]
  );

  const showDashboard = status === 'done' && result;
  const showIdle = status === 'idle';
  const isRunning = status === 'running';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800/60 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{t('app.title')}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-600">{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* New Analysis button */}
            {!showIdle && (
              <button
                onClick={reset}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300
                           transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t('app.newAnalysis')}
              </button>
            )}

            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={t('lang.switch')}
            >
              <Languages className="w-4 h-4" />
              <span className="ml-1 text-xs font-medium">{lang === 'zh' ? '中' : 'EN'}</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* GitHub link */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors ml-1"
            >
              {t('app.github')}
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Hero / Input area */}
        {showIdle && (
          <div className="text-center py-16 space-y-6 animate-in fade-in zoom-in-95">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm text-brand-400">
              <Activity className="w-4 h-4" />
              {t('hero.badge')}
            </div>
            <h2 className="text-3xl font-bold max-w-lg mx-auto leading-tight">
              {t('hero.title')}{' '}
              <span className="bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">
                {t('hero.titleHighlight')}
              </span>
            </h2>
            <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto">
              {t('hero.desc')}
            </p>
            <div className="max-w-xl mx-auto">
              <RepoInput
                onAnalyze={handleAnalyze}
                isRunning={isRunning}
                llmAvailable={serverConfig.llmAvailable}
                llmProvider={serverConfig.llmProvider}
              />
            </div>
            <p className="text-xs text-gray-400 space-x-3">
              <span>{t('hero.hint')}{' '}
                <code className="font-mono text-gray-500 bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">
                  /path/to/your/repo
                </code>
              </span>
              <span>or{' '}
                <code className="font-mono text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded">
                  {t('hero.placeholderUrl')}
                </code>
              </span>
            </p>
          </div>
        )}

        {status !== 'idle' && (
          <AnalysisProgress
            state={{ status, progress, result, error, analysisId: null }}
          />
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <button
              onClick={reset}
              className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              ← Try another repository
            </button>
          </div>
        )}

        {showDashboard && result && <Dashboard result={result} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800/60 mt-16 py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-gray-400 dark:text-gray-700">
          GitLens — A tool for understanding how codebases evolve
        </div>
      </footer>
    </div>
  );
}
