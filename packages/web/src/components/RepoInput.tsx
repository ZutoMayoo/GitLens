/**
 * Repository input component — path entry + analysis trigger.
 */

import { useState, type FormEvent } from 'react';
import { FolderGit2, Play, Zap, ZapOff, Globe } from 'lucide-react';
import { useT } from '../hooks/useLanguage';

interface RepoInputProps {
  onAnalyze: (repoPath: string, useLLM: boolean) => void;
  isRunning: boolean;
  llmAvailable: boolean;
  llmProvider: string | null;
}

export default function RepoInput({ onAnalyze, isRunning, llmAvailable, llmProvider }: RepoInputProps) {
  const t = useT();
  const [repoPath, setRepoPath] = useState('');
  const [useLLM, setUseLLM] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (repoPath.trim() && !isRunning) {
      onAnalyze(repoPath.trim(), useLLM && llmAvailable);
    }
  };

  const toggleLLM = () => {
    if (!llmAvailable) return;
    setUseLLM(!useLLM);
  };

  const llmActive = useLLM && llmAvailable;

  const llmTitle = llmAvailable
    ? (llmActive ? t('input.aiEnabled') : t('input.aiDisabled'))
    : t('input.aiUnavailable');

  const isUrl = /^https?:\/\//.test(repoPath.trim());

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="glass-panel p-1 flex items-center gap-1">
        <div className="flex-1 flex items-center gap-3 px-3">
          {isUrl ? (
            <Globe className="w-5 h-5 text-green-400 dark:text-green-500 shrink-0" />
          ) : (
            <FolderGit2 className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
          )}
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder={t('hero.placeholder')}
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 py-3 outline-none text-sm font-mono"
            disabled={isRunning}
          />
          {isUrl && (
            <span className="hidden sm:inline text-[10px] text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-500/20 shrink-0">
              GitHub
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pr-1">
          <button
            type="button"
            onClick={toggleLLM}
            disabled={!llmAvailable}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              llmActive
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : llmAvailable
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 hover:text-gray-700 dark:hover:text-gray-300'
                  : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-700 border border-gray-100 dark:border-gray-800 cursor-not-allowed'
            }`}
            title={llmTitle}
          >
            {llmActive ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
            AI
            {llmAvailable && (
              <span className="text-[10px] opacity-60 ml-0.5">{llmProvider === 'openai' ? 'GPT' : llmProvider === 'anthropic' ? 'Claude' : ''}</span>
            )}
          </button>

          <button
            type="submit"
            disabled={!repoPath.trim() || isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm
                       bg-brand-600 hover:bg-brand-500 text-white
                       disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            <Play className="w-4 h-4" />
            {t('input.analyze')}
          </button>
        </div>
      </div>
    </form>
  );
}
