export default {
  async scheduled(event, env, ctx) {
    const table = env.SUPABASE_PING_TABLE || "programs";
    const url = `${env.SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`;

    try {
      const res = await fetch(url, {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      });

      const body = await res.text();
      console.log(`[supabase-keepalive] GET ${table} -> ${res.status}`, body.slice(0, 200));

      if (!res.ok) {
        console.error(`[supabase-keepalive] unexpected status ${res.status} for ${url}`);
      }
    } catch (err) {
      console.error(`[supabase-keepalive] fetch failed: ${err.message}`);
      throw err;
    }
  },
};
