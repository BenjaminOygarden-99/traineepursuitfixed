// Lagring. På Netlify brukes Netlify Blobs med sterk konsistens.
// Lokalt (TP_MEMORY_STORE=1) brukes en enkel minnelagring for testing.

let memory;

function memoryStore() {
  const map = new Map();
  return {
    async get(key, opts = {}) {
      if (!map.has(key)) return null;
      const raw = map.get(key);
      return opts.type === 'json' ? JSON.parse(raw) : raw;
    },
    async setJSON(key, value) { map.set(key, JSON.stringify(value)); },
    async delete(key) { map.delete(key); },
    async list({ prefix = '' } = {}) {
      return { blobs: [...map.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
    },
  };
}

export async function getGameStore() {
  if (process.env.TP_MEMORY_STORE) {
    memory ??= memoryStore();
    return memory;
  }
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'trainee-pursuit', consistency: 'strong' });
}
