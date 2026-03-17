import client from './client'

export const aiApi = {
  analyze: (sessionId: string, provider: string) =>
    client.post(`/sessions/${sessionId}/analyze`, { provider }).then(r => r.data),
  getAnalyses: (sessionId: string) =>
    client.get(`/sessions/${sessionId}/analyses`).then(r => r.data),
  getAnalysis: (sessionId: string, analysisId: string) =>
    client.get(`/sessions/${sessionId}/analyses/${analysisId}`).then(r => r.data),
}
