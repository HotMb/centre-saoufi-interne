// Client API avec credentials pour partager la session express-session
async function request(url: string, options: RequestInit = {}) {
  // Configurer les options par défaut pour envoyer les cookies
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, options);

  // Si la réponse n'est pas un JSON, on la renvoie textuelle
  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new Error(data?.error || data || 'Une erreur est survenue lors de la requête.');
  }

  return data;
}

export const api = {
  get: (url: string, options?: RequestInit) => request(url, { ...options, method: 'GET' }),
  post: (url: string, body?: any, options?: RequestInit) => request(url, { ...options, method: 'POST', body }),
  patch: (url: string, body?: any, options?: RequestInit) => request(url, { ...options, method: 'PATCH', body }),
  delete: (url: string, options?: RequestInit) => request(url, { ...options, method: 'DELETE' }),
};
