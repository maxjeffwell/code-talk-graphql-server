/**
 * Server-Timing utility for Express/Apollo Server
 * Tracks operation durations and generates Server-Timing header values
 */

class ServerTiming {
  constructor() {
    this.timings = [];
    this.startTime = process.hrtime.bigint();
  }

  /**
   * Time an async operation
   * @param {string} name - Metric name (e.g., 'db', 'auth', 'resolver')
   * @param {string} description - Human-readable description
   * @param {Function} fn - Async function to time
   * @returns {Promise<any>} - Result of the function
   */
  async time(name, description, fn) {
    const start = process.hrtime.bigint();
    try {
      const result = await fn();
      const duration = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
      this.timings.push({ name, description, duration, error: false });
      return result;
    } catch (err) {
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      this.timings.push({ name, description, duration, error: true });
      throw err;
    }
  }

  /**
   * Time a sync operation
   * @param {string} name - Metric name
   * @param {string} description - Human-readable description
   * @param {Function} fn - Sync function to time
   * @returns {any} - Result of the function
   */
  timeSync(name, description, fn) {
    const start = process.hrtime.bigint();
    try {
      const result = fn();
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      this.timings.push({ name, description, duration, error: false });
      return result;
    } catch (err) {
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      this.timings.push({ name, description, duration, error: true });
      throw err;
    }
  }

  /**
   * Add a manual timing entry
   * @param {string} name - Metric name
   * @param {string} description - Description
   * @param {number} duration - Duration in ms
   */
  add(name, description, duration) {
    this.timings.push({ name, description, duration, error: false });
  }

  /**
   * Add a cache hit/miss marker
   * @param {string} name - Cache name
   * @param {boolean} hit - Whether cache was hit
   */
  cacheStatus(name, hit) {
    this.timings.push({
      name: `${name}-${hit ? 'hit' : 'miss'}`,
      description: hit ? 'Cache hit' : 'Cache miss',
      duration: 0,
    });
  }

  /**
   * Get total elapsed time since creation
   * @returns {number} - Total time in ms
   */
  total() {
    return Number(process.hrtime.bigint() - this.startTime) / 1e6;
  }

  /**
   * Generate Server-Timing header value
   * @returns {string} - Formatted Server-Timing header
   */
  toString() {
    const parts = this.timings.map(t => {
      if (t.duration === 0) {
        // Status marker without duration
        return `${t.name};desc="${t.description}"`;
      }
      return `${t.name};dur=${t.duration.toFixed(2)};desc="${t.description}"`;
    });

    // Add total time
    parts.push(`total;dur=${this.total().toFixed(2)};desc="Total request time"`);

    return parts.join(', ');
  }

  /**
   * Get timings as an object (for logging/response body)
   * @returns {Object} - Timing data
   */
  toJSON() {
    return {
      timings: this.timings.map(t => ({
        name: t.name,
        description: t.description,
        duration: Math.round(t.duration * 100) / 100,
        ...(t.error && { error: true }),
      })),
      total: Math.round(this.total() * 100) / 100,
    };
  }

  /**
   * Merge timings from another ServerTiming instance
   * @param {ServerTiming} other - Another timing instance
   */
  merge(other) {
    if (other && other.timings) {
      this.timings.push(...other.timings);
    }
  }
}

/**
 * Create a new ServerTiming instance
 * @returns {ServerTiming}
 */
export function createTiming() {
  return new ServerTiming();
}

/**
 * Express middleware to attach timing to request and set header on response
 */
export function serverTimingMiddleware() {
  return (req, res, next) => {
    // Skip for health and metrics endpoints
    if (req.path === '/health' || req.path === '/metrics') {
      return next();
    }

    // Attach timing instance to request
    req.timing = createTiming();

    // Override res.end to inject Server-Timing header before sending
    const originalEnd = res.end.bind(res);
    res.end = function(chunk, encoding) {
      // Set Server-Timing header if timing exists and headers not sent
      if (req.timing && !res.headersSent) {
        res.setHeader('Server-Timing', req.timing.toString());
      }
      return originalEnd(chunk, encoding);
    };

    next();
  };
}

export { ServerTiming };
export default { createTiming, serverTimingMiddleware, ServerTiming };
