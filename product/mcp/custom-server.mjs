// ═══════════════════════════════════════════════════════════════
// MCP Custom Server – Blueprint (for your own tools)
// 📦 https://zweibyte.net
// ═══════════════════════════════════════════════════════════════

const http = require('http');

const SERVER_NAME = 'custom-blueprint';
const SERVER_VERSION = '1.0.0';

const tools = {
  hello: {
    name: 'hello',
    description: 'Example tool – says hello',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Your name' },
      },
      required: ['name'],
    },
    handler: async (args) => {
      return { content: [{ type: 'text', text: `Hello, ${args.name}! 👋` }] };
    },
  },

  system_info: {
    name: 'system_info',
    description: 'Get current system information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const os = require('os');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: `${Math.round(os.freemem() / 1024 / 1024)}MB free / ${Math.round(os.totalmem() / 1024 / 1024)}MB total`,
            uptime: `${Math.round(os.uptime() / 3600)}h`,
          }, null, 2),
        }],
      };
    },
  },
};

async function handleRequest(req, res) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { method, params, id } = JSON.parse(body);
        const respond = (data) => res.end(JSON.stringify({ jsonrpc: '2.0', id, ...data }));

        switch (method) {
          case 'initialize':
            respond({
              result: {
                serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
                capabilities: { tools: {} },
              },
            });
            break;

          case 'tools/list':
            respond({
              result: {
                tools: Object.values(tools).map(t => ({
                  name: t.name,
                  description: t.description,
                  inputSchema: t.inputSchema,
                })),
              },
            });
            break;

          case 'tools/call': {
            const tool = tools[params?.name];
            if (!tool) return respond({ error: { code: -32601, message: 'Tool not found' } });
            const result = await tool.handler(params?.arguments || {});
            respond({ result });
            break;
          }

          default:
            respond({ error: { code: -32601, message: `Unknown method: ${method}` } });
        }
      } catch (e) {
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: e.message } }));
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`MCP Server Blueprint: ${SERVER_NAME} v${SERVER_VERSION}\n`);
  }
}

const PORT = process.env.PORT || 7202;
http.createServer(handleRequest).listen(PORT, () => {
  console.log(`🧩 MCP Blueprint Server läuft auf :${PORT}`);
  console.log(`   Beispiel-Tools: hello, system_info`);
  console.log(`   Eigenen Tool-Handler in der "tools" Map hinzufügen!`);
});
