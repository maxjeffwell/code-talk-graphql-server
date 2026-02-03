// Cloudflare cache purge utility

import { cloudflare } from '../config/index.js';
import logger from './logger.js';

export async function purgeCache(urls) {
  if (!cloudflare.enabled) {
    logger.debug('Cloudflare credentials not configured, skipping cache purge');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cloudflare.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflare.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: Array.isArray(urls) ? urls : [urls],
        }),
      }
    );

    const result = await response.json();

    if (result.success) {
      logger.info('Cloudflare cache purged', { urls });
      return { success: true };
    } else {
      logger.error('Cloudflare cache purge failed', { errors: result.errors });
      return { success: false, errors: result.errors };
    }
  } catch (error) {
    logger.error('Cloudflare cache purge error', { error: error.message });
    return { success: false, error: error.message };
  }
}

export async function purgeCodeTalkCache() {
  return purgeCache([
    `${cloudflare.publicUrl}/graphql`,
  ]);
}
