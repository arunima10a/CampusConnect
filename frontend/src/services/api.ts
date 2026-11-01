import type { AdminIdentity, Event, Notice, Registration, RegistrationInput } from '../types';

const base = import.meta.env.VITE_API_URL || 'http://localhost:18080/api';
let csrfToken = '';

export class ApiError extends Error {
  fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) { super(message); this.fields = fields; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({ error: 'Unexpected response from server' }));
  if (!response.ok) throw new ApiError(body.error || `Request failed (${response.status})`, body.fields);
  return body as T;
}
const json = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });
async function fetchCSRF() {
  const result = await request<{ csrfToken: string }>('/admin/csrf');
  csrfToken = result.csrfToken;
  return csrfToken;
}
const csrfHeaders = () => ({ 'X-CSRF-Token': csrfToken });

export const api = {
  events: (params = '') => request<Event[]>(`/events${params}`),
  event: (id: number) => request<Event>(`/events/${id}`),
  notices: () => request<Notice[]>('/notices'),
  registrations: () => request<Registration[]>('/registrations'),
  register: (input: RegistrationInput) => request<Registration>('/registrations', json(input)),
  cancel: (id: number) => request<{ message: string }>(`/registrations/${id}`, { method: 'DELETE' }),
  csrf: fetchCSRF,
  login: async (email: string, password: string) => {
    if (!csrfToken) await fetchCSRF();
    return request<AdminIdentity>('/admin/login', { ...json({ email, password }), headers: csrfHeaders() });
  },
  adminSession: () => request<AdminIdentity>('/admin/session'),
  logout: async () => {
    if (!csrfToken) await fetchCSRF();
    const result = await request<{ authenticated: false }>('/admin/logout', { ...json({}), headers: csrfHeaders() });
    csrfToken = '';
    return result;
  },
  create: (event: Partial<Event>) => request<Event>('/events', { ...json(event), headers: csrfHeaders() }),
  update: (id: number, event: Partial<Event>) => request<Event>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(event), headers: csrfHeaders() }),
  delete: (id: number) => request<{ message: string }>(`/events/${id}`, { method: 'DELETE', headers: csrfHeaders() }),
};
