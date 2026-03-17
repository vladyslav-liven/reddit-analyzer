import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AnalysisInput, AnalysisResult } from '../ai-provider.interface';

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  model = 'gemini-1.5-pro';
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async analyze(input: AnalysisInput): Promise<{ result: AnalysisResult; tokensUsed: number }> {
    const postsContext = input.posts.slice(0, 50).map((p, i) => {
      const comments = p.comments.slice(0, 5).map(c => `  [${c.score}pts] ${c.body.substring(0, 200)}`).join('\n');
      return `### Post ${i + 1}${p.isViral ? ' 🔥VIRAL' : ''}\nSubreddit: r/${p.subreddit}\nScore: ${p.score}\nTitle: ${p.title}\n${p.selftext ? `Content: ${p.selftext.substring(0, 300)}` : ''}\nTop comments:\n${comments}`;
    }).join('\n\n');

    const model = this.client.getGenerativeModel({ model: this.model });
    const systemPrompt = input.systemPrompt || 'You are a marketing analyst. Analyze Reddit data and extract actionable marketing insights.';

    const prompt = `${systemPrompt}\n\nAnalyze this Reddit data and respond ONLY with valid JSON (no markdown):\n\n${postsContext}\n\nJSON structure: { "summary": "", "keyInsights": [], "sentiment": { "overall": "", "byTopic": {} }, "painPoints": [], "trendingPhrases": [], "structuredReport": "" }`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini returned invalid JSON');

    const result: AnalysisResult = JSON.parse(jsonMatch[0]);
    return { result, tokensUsed: 0 };
  }
}
