import OpenAI from 'openai';
import { AnalysisInput, AnalysisResult } from '../ai-provider.interface';

export class OpenRouterProvider {
  readonly name = 'openrouter';
  private client: OpenAI;

  constructor(apiKey: string, readonly model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/vladyslav-liven/reddit-analyzer',
        'X-Title': 'Reddit Analyzer',
      },
    });
  }

  private static readonly PRICES: Record<string, { input: number; output: number }> = {
    'anthropic/claude-sonnet-4-5':           { input: 3.00,  output: 15.00 },
    'anthropic/claude-haiku-4-5':            { input: 0.80,  output: 4.00  },
    'openai/gpt-4o':                         { input: 2.50,  output: 10.00 },
    'openai/gpt-4o-mini':                    { input: 0.15,  output: 0.60  },
    'google/gemini-pro-1.5':                 { input: 1.25,  output: 5.00  },
    'google/gemini-flash-1.5':               { input: 0.075, output: 0.30  },
    'meta-llama/llama-3.3-70b-instruct':     { input: 0.00,  output: 0.00  },
  };

  private calcCost(inputTokens: number, outputTokens: number): number {
    const price = OpenRouterProvider.PRICES[this.model];
    if (!price) return 0;
    return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
  }

  async analyze(input: AnalysisInput): Promise<{ result: AnalysisResult; tokensUsed: number; inputTokens: number; outputTokens: number; costUsd: number }> {
    const postsContext = input.posts.slice(0, 60).map((p, i) => {
      const comments = p.comments
        .slice(0, 5)
        .map(c => `  [${c.score}pts] ${c.body.substring(0, 200)}`)
        .join('\n');
      return [
        `### Post ${i + 1}${p.isViral ? ' 🔥VIRAL' : ''}`,
        `Subreddit: r/${p.subreddit} | Score: ${p.score} (${Math.round(p.upvoteRatio * 100)}% upvoted) | Comments: ${p.numComments}`,
        `Title: ${p.title}`,
        p.selftext ? `Content: ${p.selftext.substring(0, 300)}` : '',
        comments ? `Top comments:\n${comments}` : '',
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const systemPrompt = input.systemPrompt ||
      `You are a senior marketing analyst specializing in consumer insights from social media.
Analyze Reddit data and extract actionable marketing insights. Focus on pain points, trends, language people use, and opportunities.`;

    const userPrompt = `Analyze the following Reddit data. Respond ONLY with a valid JSON object — no markdown fences, no explanation outside JSON.

${postsContext}

Required JSON structure:
{
  "summary": "2-3 paragraph executive summary of the main findings",
  "keyInsights": [
    {
      "insight": "Clear, actionable insight statement",
      "evidence": {
        "posts": ["Exact post title or short quote that supports this insight"],
        "comments": ["Exact comment quote (max 100 chars) that supports this insight"],
        "phrases": ["specific phrase or word from the data"]
      }
    }
  ],
  "sentiment": {
    "overall": "positive|negative|neutral|mixed",
    "byTopic": { "topic1": "positive|negative|neutral", "topic2": "..." }
  },
  "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "trendingPhrases": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  "structuredReport": "Full markdown report with sections: ## Executive Summary\\n## Key Insights\\n## Sentiment Analysis\\n## Pain Points\\n## Trending Topics\\n## Marketing Recommendations"
}

Provide 5 keyInsights. Each must have 1-3 real examples in evidence from the actual data above.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`Model ${this.model} returned invalid JSON: ${text.substring(0, 200)}`);

    const result: AnalysisResult = JSON.parse(jsonMatch[0]);
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    return {
      result,
      tokensUsed: response.usage?.total_tokens || 0,
      inputTokens,
      outputTokens,
      costUsd: this.calcCost(inputTokens, outputTokens),
    };
  }
}
