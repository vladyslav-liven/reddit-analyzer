import OpenAI from 'openai';
import { AIProvider, AnalysisInput, AnalysisResult } from '../ai-provider.interface';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  model = 'gpt-4o';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyze(input: AnalysisInput): Promise<{ result: AnalysisResult; tokensUsed: number }> {
    const postsContext = input.posts.slice(0, 50).map((p, i) => {
      const comments = p.comments.slice(0, 5).map(c => `  [${c.score}pts] ${c.body.substring(0, 200)}`).join('\n');
      return `### Post ${i + 1}${p.isViral ? ' 🔥VIRAL' : ''}\nSubreddit: r/${p.subreddit}\nScore: ${p.score}\nTitle: ${p.title}\n${p.selftext ? `Content: ${p.selftext.substring(0, 300)}` : ''}\nTop comments:\n${comments}`;
    }).join('\n\n');

    const systemPrompt = input.systemPrompt || 'You are a marketing analyst. Analyze Reddit data and extract actionable marketing insights.';

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this Reddit data and respond ONLY with valid JSON:\n\n${postsContext}\n\nJSON structure: { "summary": "", "keyInsights": [], "sentiment": { "overall": "", "byTopic": {} }, "painPoints": [], "trendingPhrases": [], "structuredReport": "" }` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    });

    const text = response.choices[0].message.content || '{}';
    const result: AnalysisResult = JSON.parse(text);
    return { result, tokensUsed: response.usage?.total_tokens || 0 };
  }
}
