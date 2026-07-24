/**
 * Lightweight i18n — translation dictionaries for zh-CN and en-US.
 * New strings only need to be added here; components use the `t(key)` pattern.
 */

export type Lang = 'zh' | 'en';
export type TranslationKey = keyof typeof zh;

const zh = {
  // App / Header
  'app.title': 'GitLens',
  'app.subtitle': '代码历史的可视化叙事',
  'app.newAnalysis': '← 新建分析',
  'app.github': 'GitHub',

  // Hero
  'hero.badge': '输入仓库路径开始分析',
  'hero.title': '看看你的代码库是',
  'hero.titleHighlight': '如何演变的',
  'hero.desc': '输入本地 Git 仓库路径或 GitHub 链接，即可可视化其提交历史、文件热点和贡献者活动。',
  'hero.placeholder': '输入仓库路径或 GitHub URL...',
  'hero.placeholderUrl': '例如 https://github.com/facebook/react',
  'hero.hint': '试试这个项目：',

  // RepoInput
  'input.analyze': '分析',
  'input.aiEnabled': 'AI 分析已启用 — 点击关闭',
  'input.aiDisabled': '点击启用 AI 语义聚类',
  'input.aiUnavailable': 'AI 不可用 — 请设置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY 环境变量',

  // Progress
  'progress.starting': '正在启动分析...',
  'progress.parsing': '读取 Git 历史',
  'progress.grouping': '正在分组相关提交',
  'progress.clustering': 'AI 语义聚类中',
  'progress.narrating': '生成叙事中',
  'progress.heatmap': '构建热力图',
  'progress.done': '分析完成',
  'progress.complete': '分析完成',
  'progress.failed': '分析失败',

  // Dashboard
  'dashboard.commits': '提交',
  'dashboard.authors': '贡献者',
  'dashboard.groups': '分组',
  'dashboard.timeSpan': '时间跨度',
  'dashboard.tabTimeline': '时间线',
  'dashboard.tabHotFiles': '热点文件',
  'dashboard.tabAuthors': '贡献者',

  // Timeline
  'timeline.commitActivity': '提交活动时间线',
  'timeline.noGroups': '没有可显示的提交分组',
  'timeline.now': '现在',

  // ClusterCard
  'cluster.commits': '个提交',
  'cluster.affectedFiles': '涉及文件',
  'cluster.commitsList': '提交列表',
  'cluster.file': '个文件',
  'cluster.andMore': '...还有',

  // Heatmap
  'heatmap.fileChangeFreq': '文件变更频率',
  'heatmap.noData': '没有文件变更数据',
  'heatmap.changes': '次变更',
  'heatmap.low': '低',
  'heatmap.high': '高',

  // Authors
  'authors.contributors': '贡献者',
  'authors.totalCommits': '总提交数',
  'authors.topContributor': '最多贡献',
  'authors.commitsPerAuthor': '每位贡献者的提交数',
  'authors.allContributors': '所有贡献者',
  'authors.commitsUnit': '次提交',

  // AI Clusters
  'ai.semanticClusters': 'AI 语义聚类',
  'ai.importance': '重要性',
  'ai.commits': '次提交',

  // Time
  'time.lessThanDay': '< 1 天',
  'time.days': ' 天',
  'time.months': ' 个月',
  'time.years': ' 年',

  // Theme & Lang
  'theme.light': '亮色模式',
  'theme.dark': '暗色模式',
  'lang.switch': '切换语言',
} as const;

const en: Record<TranslationKey, string> = {
  'app.title': 'GitLens',
  'app.subtitle': 'Visual narrative of code history',
  'app.newAnalysis': '← New Analysis',
  'app.github': 'GitHub',

  'hero.badge': 'Enter a repository path to get started',
  'hero.title': 'See how your codebase',
  'hero.titleHighlight': 'evolved',
  'hero.desc': 'Paste a local git repo path or a GitHub URL to visualize its commit history, file hotspots, and contributor activity.',
  'hero.placeholder': 'Enter repo path or GitHub URL...',
  'hero.placeholderUrl': 'e.g. https://github.com/facebook/react',
  'hero.hint': 'Try it with this project:',

  'input.analyze': 'Analyze',
  'input.aiEnabled': 'AI analysis enabled — click to disable',
  'input.aiDisabled': 'Click to enable AI semantic clustering',
  'input.aiUnavailable': 'AI unavailable — set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable',

  'progress.starting': 'Starting analysis...',
  'progress.parsing': 'Reading git history',
  'progress.grouping': 'Grouping related commits',
  'progress.clustering': 'AI semantic clustering',
  'progress.narrating': 'Generating narrative',
  'progress.heatmap': 'Building heat map',
  'progress.done': 'Analysis complete',
  'progress.complete': 'Analysis complete',
  'progress.failed': 'Analysis failed',

  'dashboard.commits': 'Commits',
  'dashboard.authors': 'Authors',
  'dashboard.groups': 'Groups',
  'dashboard.timeSpan': 'Time Span',
  'dashboard.tabTimeline': 'Timeline',
  'dashboard.tabHotFiles': 'Hot Files',
  'dashboard.tabAuthors': 'Authors',

  'timeline.commitActivity': 'Commit Activity Timeline',
  'timeline.noGroups': 'No commit groups to display',
  'timeline.now': 'NOW',

  'cluster.commits': ' commits',
  'cluster.affectedFiles': 'Affected Files',
  'cluster.commitsList': 'Commits',
  'cluster.file': ' file',
  'cluster.andMore': '...and ',

  'heatmap.fileChangeFreq': 'File Change Frequency',
  'heatmap.noData': 'No file change data available',
  'heatmap.changes': ' changes',
  'heatmap.low': 'Low',
  'heatmap.high': 'High',

  'authors.contributors': 'Contributors',
  'authors.totalCommits': 'Total Commits',
  'authors.topContributor': 'Top Contributor',
  'authors.commitsPerAuthor': 'Commits per Author',
  'authors.allContributors': 'All Contributors',
  'authors.commitsUnit': ' commits',

  'ai.semanticClusters': 'AI Semantic Clusters',
  'ai.importance': 'importance',
  'ai.commits': ' commits',

  'time.lessThanDay': '< 1 day',
  'time.days': ' days',
  'time.months': ' months',
  'time.years': ' years',

  'theme.light': 'Light mode',
  'theme.dark': 'Dark mode',
  'lang.switch': 'Switch language',
};

export const translations: Record<Lang, Record<TranslationKey, string>> = { zh, en };

/** Get the translation for a key in the current language. */
export function t(key: TranslationKey, lang: Lang): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}
