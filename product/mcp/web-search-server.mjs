// ═══════════════════════════════════════════════════════════════
// MCP Custom Server – Web Search (example)
// 📦 https://zweibyte.net
// ═══════════════════════════════════════════════════════════════

const https = require('https');

const SERVER_NAME = 'web-search';
const SERVER_VERSION = '1.0.0';

// Simple JSON-RPC MCP implementation
async function handleRequest(req, res) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { method, params, id } = JSON.parse(body);

        switch (method) {
          case 'initialize':
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
                capabilities: { tools: {} },
              },
            }));
            break;

          case 'tools/list':
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                tools: [
                  {
                    name: 'web_search',
                    description: 'Search the web for current information',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        query: { type: 'string', description: 'Search query' },
                        count: { type: 'number', description: 'Results count', default: 5 },
                      },
                      required: ['query'],
                    },
                  },
                ],
              },
            }));
            break;

          case 'tools/call':
            if (params?.name === 'web_search') {
              const query = params.arguments?.query || '';
              const results = await performSearch(query);
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id,
                result: { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] },
              }));
            } else {
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id,
                error: { code: -32601, message: 'Tool not found' },
              }));
            }
            break;

          default:
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Method ${method} not found` },
            }));
        }
      } catch (e) {
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: e.message } }));
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`MCP Server: ${SERVER_NAME} v${SERVER_VERSION}\n`);
  }
}

async function performSearch(query) {
  return new Promise((resolve, reject) => {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ query, results: data.substring(0, 5000) + '…' }));
    }).on('error', reject);
  });
}

const PORT = process.env.PORT || 7201;
require('http').createServer(handleRequest).listen(PORT, () => {
  console.log(`🔍 MCP Web Search Server läuft auf :${PORT}`);
});
