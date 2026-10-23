/**
 * Explain command — sends top errors to LLM for root cause analysis
 */

const https = require('https');
const { computeSummary } = require('./summary');

/**
 * Call LLM endpoint with error messages
 * @param {string} endpoint - LLM API endpoint URL
 * @param {Array} topErrors - array of { message, count } objects
 * @param {string} apiKey - API key (optional)
 * @returns {Promise<string>} LLM response
 */
async function callLLM(endpoint, topErrors, apiKey = null) {
  const prompt = `You are a log analysis expert. Analyze the following top error messages from an application log and provide a probable root-cause summary.

Top Errors:
${topErrors.map((e, i) => `${i + 1}. (${e.count} occurrences) "${e.message}"`).join('\n')}

Provide a concise analysis of what might be causing these errors and suggest the most likely root cause.`;

  const body = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500
  });

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
        'Authorization': apiKey ? `Bearer ${apiKey}` : undefined
      }
    };

    if (!apiKey) {
      delete options.headers.Authorization;
    }

    const req = (url.protocol === 'https:' ? https : require('http')).request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`LLM error: ${json.error.message || JSON.stringify(json.error)}`));
          } else if (json.choices && json.choices[0] && json.choices[0].message) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error('Unexpected LLM response format'));
          }
        } catch (err) {
          reject(new Error(`Failed to parse LLM response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Analyze log and explain top errors via LLM
 * @param {string} filePath
 * @param {string} llmEndpoint - LLM API endpoint (from env or parameter)
 * @param {string} apiKey - API key (optional)
 * @returns {Promise<string>} explanation
 */
async function explainLog(filePath, llmEndpoint = null, apiKey = null) {
  // Get endpoint from environment if not provided
  const endpoint = llmEndpoint || process.env.LOGSCOPE_LLM_ENDPOINT;
  if (!endpoint) {
    throw new Error('LLM endpoint not set. Provide via --endpoint or set LOGSCOPE_LLM_ENDPOINT env var');
  }

  // Get API key from environment if not provided
  const key = apiKey || process.env.LOGSCOPE_LLM_KEY;

  // Compute summary to get top errors
  const summary = await computeSummary(filePath);

  if (summary.top_errors.length === 0) {
    return 'No errors found in log file.';
  }

  // Call LLM
  const explanation = await callLLM(endpoint, summary.top_errors, key);
  return explanation;
}

module.exports = { explainLog, callLLM };
