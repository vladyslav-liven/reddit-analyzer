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

export interface InsightEvidence {
  posts: string[];
  comments: string[];
  phrases: string[];
}

export interface KeyInsight {
  insight: string;
  evidence: InsightEvidence;
}

export interface AnalysisResult {
  summary: string;
  keyInsights: KeyInsight[];
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
