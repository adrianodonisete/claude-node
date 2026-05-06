#!/usr/bin/env node
/**
 * Quality Gate Pre-Commit Runner
 * Orchestrates all quality checks and blocks commits on failure
 */

const { execSync } = require('child_process');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let allPassed = true;
const startTime = Date.now();

function log(message, color = Colors.reset) {
  console.log(`${color}${message}${Colors.reset}`);
}

function sectionHeader(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${Colors.cyan}${title}${Colors.reset}`);
  console.log('='.repeat(60));
}

function runCommand(cmd, description, options = {}) {
  const { failOnError = true } = options;

  try {
    const output = execSync(cmd, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'inherit'],
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    if (output && description) {
      console.log(
        `\n[${new Date().toLocaleTimeString()}] ${description} - PASSED`,
      );
    }
    return true;
  } catch (error) {
    if (failOnError) {
      allPassed = false;
      console.error(
        `\n[${new Date().toLocaleTimeString()}] ${description || cmd} - FAILED`,
      );
      return false;
    }
    return false;
  }
}

function main() {
  console.log('\n' + Colors.blue);
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║          QUALITY GATE - PRE-COMMIT CHECKS                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(Colors.reset);

  sectionHeader('Quality Gate Starting');

  // Check 1: ESLint
  sectionHeader('Check 1: ESLint Code Analysis');
  log('Running ESLint with security, complexity, and style rules...\n');

  runCommand('npx eslint **/*.js', 'ESLint Code Analysis');

  // Check 2: Custom Rules
  sectionHeader('Check 2: Custom Financial Rules');
  log('Checking ticker whitelist, API domains, and secret patterns...\n');

  runCommand(
    'node scripts/check-custom-rules.js **/*.js',
    'Custom Financial Rules',
    { failOnError: true },
  );

  // Check 3: Prettier format check
  sectionHeader('Check 3: Code Formatting');
  log('Verifying code formatting with Prettier...\n');

  runCommand(
    'npx --yes prettier --check **/*.js **/*.html',
    'Prettier Format Check',
    { failOnError: false },
  );

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  sectionHeader('Quality Gate Summary');

  if (allPassed) {
    log(
      `\n${Colors.green}✓ All quality checks passed!${Colors.reset}`,
      Colors.green,
    );
    log(`\nDuration: ${duration}s`, Colors.green);
    log('\nCommit proceeding...\n', Colors.green);
    process.exit(0);
  } else {
    log(`\n${Colors.red}✗ Quality gate failed!${Colors.reset}`, Colors.red);
    log(`\nDuration: ${duration}s`, Colors.red);
    log('\nPlease fix the errors above and try again.\n', Colors.red);
    process.exit(1);
  }
}

// Alias Colors to COLORS to fix undefined reference
const Colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

main();
