import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AnalysisInput, AnalysisResult } from '../ai-provider.interface';

export class ClaudeProvider implements AIProvider {
  name = 'claude';
  model = 'claude-sonnet-4-6';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(input: AnalysisInput): Promise<{ result: AnalysisResult; tokensUsed: number }> {
    const postsContext = input.posts.slice(0, 50).map((p, i) => {
      const comments = p.comments.slice(0, 5).map(c => `  [${c.score}pts] ${c.body.substring(0, 200)}`).join('\n');
      return `### Post ${i + 1}${p.isViral ? ' 🔥VIRAL' : ''}\nSubreddit: r/${p.subreddit}\nScore: ${p.score} (${Math.round(p.upvoteRatio * 100)}% upvoted) | Comments: ${p.numComments}\nTitle: ${p.title}\n${p.selftext ? `Content: ${p.selftext.substring(0, 300)}` : ''}\nTop comments:\n${comments}`;
    }).join('\n\n');

    const systemPrompt = input.systemPrompt || `You are a marketing analyst. Analyze Reddit data and extract actionable marketing insights. Focus on: what people love/hate, pain points, trends, language people use. Be specific and practical.`;

    const userPrompt = `Analyze the following Reddit data and respond ONLY with a valid JSON object (no markdown, no explanation):

${postsContext}

Respond with this exact JSON structure:
{
  "summary": "2-3 paragraph executive summary",
  "keyInsights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"],
  "sentiment": {
    "overall": "positive|negative|neutral|mixed",
    "byTopic": { "topic1": "sentiment", "topic2": "sentiment" }
  },
  "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "trendingPhrases": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  "structuredReport": "Full markdown report with sections: ## Executive Summary, ## Key Insights, ## Sentiment Analysis, ## Pain Points, ## Trending Topics, ## Marketing Recommendations"
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude returned invalid JSON');

    const result: AnalysisResult = JSON.parse(jsonMatch[0]);
    return { result, tokensUsed: response.usage.input_tokens + response.usage.output_tokens };
  }
}
