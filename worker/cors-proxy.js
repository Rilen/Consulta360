// Cloudflare Worker — Proxy CORS gratuito (100k requests/dia no plano Free)
// Deploy: npx wrangler deploy
// URL final: https://consulta360-proxy.SEU_USUARIO.workers.dev/?url=...
//
// Uso: GET https://consulta360-proxy.USER.workers.dev/?url=https://webapp1-riodasostras.cidade360.cloud/dadosabertos/FolhaPagamento?dataInicial=01/05/2026&dataFinal=31/05/2026&nomeBase=...

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    // OPTIONS — preflight CORS
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
      return new Response('Missing ?url= parameter. Usage: GET /?url=https://api.example.com/data', {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    try {
      const apiResponse = await fetch(target, {
        method: 'GET',
        headers: {
          'Accept': request.headers.get('Accept') || 'application/json, text/plain, */*',
          'User-Agent': 'Consulta360-CORS-Proxy/1.0',
        },
        redirect: 'follow',
      });

      // Constrói resposta com CORS headers
      const response = new Response(apiResponse.body, {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: apiResponse.headers,
      });

      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
      response.headers.set('Access-Control-Expose-Headers', '*');

      return response;
    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  },
};
