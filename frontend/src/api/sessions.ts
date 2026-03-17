import client from './client'

export const sessionsApi = {
  getAll: () => client.get('/sessions').then(r => r.data),
  getOne: (id: string) => client.get(`/sessions/${id}`).then(r => r.data),
  create: (name: string) => client.post('/sessions', { name }).then(r => r.data),
  update: (id: string, data: any) => client.patch(`/sessions/${id}`, data).then(r => r.data),
  delete: (id: string) => client.delete(`/sessions/${id}`).then(r => r.data),
}
