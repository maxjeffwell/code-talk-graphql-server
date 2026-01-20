// Cloudflare cache purge utility

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

export async function purgeCache(urls) {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
    console.log('Cloudflare credentials not configured, skipping cache purge');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: Array.isArray(urls) ? urls : [urls],
        }),
      }
    );

    const result = await response.json();

    if (result.success) {
      console.log('Cloudflare cache purged:', urls);
      return { success: true };
    } else {
      console.error('Cloudflare cache purge failed:', result.errors);
      return { success: false, errors: result.errors };
    }
  } catch (error) {
    console.error('Cloudflare cache purge error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function purgeCodeTalkCache() {
  const baseUrl = process.env.PUBLIC_URL || 'https://code-talk-k8s.el-jefe.me';
  return purgeCache([
    `${baseUrl}/graphql`,
  ]);
}
