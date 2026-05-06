#!/usr/bin/env node
/**
 * Custom quality gate rules for financial application
 * - Validates ticker whitelist
 * - Checks for hardcoded secrets
 * - Validates API endpoints
 */

const fs = require('fs');
const path = require('path');

// Allowed values
const ALLOWED_TICKERS = ['petr3', 'itub3', 'vale3'];
const ALLOWED_FOREX_PAIRS = ['brl', 'usdbrl', 'usd/brl'];

// Disallowed patterns (potential secrets)
const SECRET_PATTERNS = [
  { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key ID' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'Stripe Secret Key' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Access Token' },
  { pattern: /password\s*[:=]\s*['"][^'"]+['"]/i, name: 'Hardcoded password' },
  {
    pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
    name: 'Hardcoded API key',
  },
  { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/i, name: 'Hardcoded secret' },
];

// Valid API domains
const VALID_DOMAINS = [
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'localhost',
  '127.0.0.1',
  '192.168.',
];

const RESULTS = {
  files: [],
  errors: [],
  warnings: [],
};

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const fileResults = { file: relativePath, errors: [], warnings: [] };

  // Check for allowed tickers
  const tickerMatches = content.match(/[a-zA-Z]{3,5}3|4\b/gi) || [];
  tickerMatches.forEach((ticker) => {
    const lowerTicker = ticker.toLowerCase();
    if (
      !ALLOWED_TICKERS.includes(lowerTicker) &&
      !ALLOWED_FOREX_PAIRS.includes(lowerTicker)
    ) {
      // Ignore common non-ticker matches
      const isTickerLike = /^[A-Z]{3,5}[34]$/.test(ticker.toUpperCase());
      if (isTickerLike) {
        fileResults.errors.push(
          `Disallowed ticker "${ticker}". Allowed: ${ALLOWED_TICKERS.join(', ')}`,
        );
      }
    }
  });

  // Check for hardcoded secrets
  SECRET_PATTERNS.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match, idx) => {
        fileResults.errors.push(
          `Potential ${name} found: "${match.substring(0, 20)}..."`,
        );
      });
    }
  });

  // Check API domains
  const apiPattern = /https?:\/\/[^\s"'\/]+/g;
  const apiMatches = content.match(apiPattern) || [];

  apiMatches.forEach((apiUrl) => {
    const domainMatch = apiUrl.match(/https?:\/\/([^\/]+)/i);
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase();
      const isAllowed = VALID_DOMAINS.some(
        (valid) => domain === valid || domain.endsWith('.' + valid),
      );
      if (!isAllowed && !domain.startsWith('file://')) {
        fileResults.warnings.push(
          `Non-standard domain in API URL: "${domain}"`,
        );
      }
    }
  });

  if (fileResults.errors.length > 0 || fileResults.warnings.length > 0) {
    RESULTS.files.push(fileResults);
  }

  return fileResults;
}

function runCheck() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // If no files specified, check all JS and HTML files in the project
    const projectRoot = path.join(__dirname, '..');
    const jsFiles = [];
    const htmlFiles = [];

    // Recursively find JS and HTML files (excluding node_modules and data)
    function walkDir(dir) {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.git') {
            walkDir(filePath);
          }
        } else if (file.endsWith('.js') || file.endsWith('.html')) {
          jsFiles.push(filePath);
        }
      });
    }

    walkDir(projectRoot);
    args.push(...jsFiles);
  }

  console.log('Checking custom financial rules...');
  console.log(`Files to check: ${args.length}`);

  let hasErrors = false;

  args.forEach((filePath) => {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    const result = checkFile(absolutePath);
    if (result) {
      if (result.errors.length > 0) {
        hasErrors = true;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`FILE: ${result.file}`);
        console.log('='.repeat(60));
        result.errors.forEach((err) => console.log(`  ✗ ${err}`));
      }
      if (result.warnings.length > 0) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`FILE: ${result.file}`);
        console.log('='.repeat(60));
        result.warnings.forEach((warn) => console.log(`  ⚠ ${warn}`));
      }
    }
  });

  // Add to results summary
  if (hasErrors) {
    RESULTS.errors.push('Custom rules validation failed');
  }

  return hasErrors;
}

const hasErrors = runCheck();

if (hasErrors) {
  console.log('\n'.padEnd(60, '='));
  console.log('CUSTOM RULES CHECK: FAILED');
  console.log('Please fix the errors above before committing.');
  process.exit(1);
} else {
  console.log(`\n${'='.repeat(60)}`);
  console.log('CUSTOM RULES CHECK: PASSED');
  console.log('='.repeat(60));
  process.exit(0);
}
