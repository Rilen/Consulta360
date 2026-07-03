// Cloudflare Worker — Proxy CORS pass-through.
// O browser não pode chamar a API diretamente (CORS).
// Este Worker só encaminha a requisição, adicionando os headers CORS.
// Sem estado, sem cache, sem pré-busca — apenas repassa.
//
// Deploy: npx wrangler deploy
// URL: https://consulta360-proxy.SEU_USUARIO.workers.dev

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (!target) {
      return new Response('Missing ?url= parameter. GET /?url=https://...', {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain' },
      });
    }

    const apiResp = await fetch(target, {
      headers: { Accept: request.headers.get('Accept') || 'application/json' },
      redirect: 'follow',
    });

    const resp = new Response(apiResp.body, {
      status: apiResp.status,
      headers: apiResp.headers,
    });

    resp.headers.set('Access-Control-Allow-Origin', '*');
    return resp;
  },
};
