import client from './client'

export const redditApi = {
  startParse: (sessionId: string, config: any) =>
    client.post(`/sessions/${sessionId}/parse`, config).then(r => r.data),
  getPosts: (sessionId: string, params?: any) =>
    client.get(`/sessions/${sessionId}/posts`, { params }).then(r => r.data),
  getComments: (sessionId: string, postId: string) =>
    client.get(`/sessions/${sessionId}/posts/${postId}/comments`).then(r => r.data),
}
