export interface AnalysisInput {
  posts: Array<{
    title: string;
    score: number;
    upvoteRatio: number;
    numComments: number;
    subreddit: string;
    selftext: string;
    isViral: boolean;
    url: string;
    comments: Array<{ body: string; score: number }>;
  }>;
  systemPrompt: string;
}

export interface AnalysisResult {
  summary: string;
  keyInsights: string[];
  sentiment: { overall: string; byTopic: Record<string, string> };
  painPoints: string[];
  trendingPhrases: string[];
  structuredReport: string;
}

export interface AIProvider {
  name: string;
  model: string;
  analyze(input: AnalysisInput): Promise<{ result: AnalysisResult; tokensUsed: number }>;
}
