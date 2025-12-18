#!/usr/bin/env node
/**
 * Ops Notes Linter
 * Validates that ops notes contain required sections and follow naming conventions.
 *
 * Usage: node scripts/ci/lint-ops-notes.mjs
 *
 * Environment variables:
 *   DEFAULT_BRANCH          - Base branch for diff (default: main)
 *   OPS_NOTES_STRICT_FILENAMES - Set to 'true' to treat filename violations as errors
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const NOTES_DIR = 'docs/notes';

// Files to always skip (not ops notes)
const EXCLUDED_FILES = ['README.md', 'TEMPLATE-OPS-NOTE.md'];

// Required headings in every ops note
const REQUIRED_HEADINGS = [
  '## Purpose',
  '## When to use this',
  '## Applies to',
  '## Does not apply to',
  '## Constraints',
  '## Follow-ups',
];

// Filename patterns (one must match)
const FILENAME_PATTERNS = [
  /^cc-.*-v\d+\.md$/,  // Claude Code prompt naming: cc-*-vN.md
  /^ops-.*\.md$/,       // General ops note: ops-*.md
];

/**
 * Get list of changed files in the PR (if running in CI)
 */
function getChangedFiles() {
  try {
    const defaultBranch = process.env.DEFAULT_BRANCH || 'main';
    const diffBase = `origin/${defaultBranch}`;
    const output = execSync(`git diff --name-only ${diffBase}...HEAD`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return null; // Fall back to scanning all files
  }
}

/**
 * Get all ops note files to lint (stable sorted)
 */
function getFilesToLint() {
  // Skip if directory doesn't exist
  if (!existsSync(NOTES_DIR)) {
    console.log(`[SKIP] Directory ${NOTES_DIR} does not exist.`);
    return [];
  }

  // Try to get changed files first (for PR-scoped linting)
  const changedFiles = getChangedFiles();

  if (changedFiles) {
    const changedNotes = changedFiles
      .filter(f =>
        f.startsWith(NOTES_DIR + '/') &&
        f.endsWith('.md') &&
        !EXCLUDED_FILES.includes(basename(f))
      )
      .sort(); // Stable sort

    if (changedNotes.length > 0) {
      console.log(`Linting ${changedNotes.length} changed ops note(s)...`);
      return changedNotes;
    }
  }

  // Fall back to scanning all notes
  const allFiles = readdirSync(NOTES_DIR)
    .filter(f => f.endsWith('.md') && !EXCLUDED_FILES.includes(f))
    .sort() // Stable sort
    .map(f => join(NOTES_DIR, f));

  // Skip if no notes exist (only template/README)
  if (allFiles.length === 0) {
    console.log(`[SKIP] No ops notes found in ${NOTES_DIR} (only template/README).`);
    return [];
  }

  console.log(`Linting ${allFiles.length} ops note(s)...`);
  return allFiles;
}

/**
 * Check a file for required headings
 */
function lintHeadings(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const missing = [];

  for (const heading of REQUIRED_HEADINGS) {
    if (!content.includes(heading)) {
      missing.push(heading);
    }
  }

  return missing;
}

/**
 * Check if filename matches allowed patterns
 */
function lintFilename(filePath) {
  const name = basename(filePath);

  // Skip excluded files
  if (EXCLUDED_FILES.includes(name)) {
    return { valid: true };
  }

  // Check against patterns
  const matches = FILENAME_PATTERNS.some(pattern => pattern.test(name));

  return {
    valid: matches,
    suggestion: matches ? null : 'Rename to cc-<slug>-v1.md or ops-<slug>.md',
  };
}

/**
 * Main
 */
function main() {
  console.log('=== Ops Notes Linter ===\n');

  const files = getFilesToLint();

  if (files.length === 0) {
    console.log('\nNo ops notes to lint. Exiting cleanly.');
    process.exit(0);
  }

  const headingErrors = [];
  const filenameWarnings = [];
  const strictFilenames = process.env.OPS_NOTES_STRICT_FILENAMES === 'true';

  for (const file of files) {
    // Check headings (always enforced)
    const missingHeadings = lintHeadings(file);
    if (missingHeadings.length > 0) {
      headingErrors.push({ file, missing: missingHeadings });
    }

    // Check filename (warn by default, error if strict)
    const filenameResult = lintFilename(file);
    if (!filenameResult.valid) {
      filenameWarnings.push({ file, suggestion: filenameResult.suggestion });
    }
  }

  // Report filename warnings/errors
  if (filenameWarnings.length > 0) {
    const level = strictFilenames ? 'ERROR' : 'WARN';
    console.log(`\n[${level}] Filename convention violations:\n`);
    for (const { file, suggestion } of filenameWarnings) {
      console.log(`  ${file}`);
      console.log(`    -> ${suggestion}`);
    }
    if (!strictFilenames) {
      console.log('\n  (Set OPS_NOTES_STRICT_FILENAMES=true to treat as errors)');
    }
  }

  // Report heading errors
  if (headingErrors.length > 0) {
    console.error('\n[ERROR] Missing required headings:\n');
    for (const { file, missing } of headingErrors) {
      console.error(`  ${file}:`);
      for (const heading of missing) {
        console.error(`    - Missing: ${heading}`);
      }
    }
    console.error('\n  How to fix:');
    console.error('    1. Copy docs/notes/TEMPLATE-OPS-NOTE.md');
    console.error('    2. Fill in all required sections');
    console.error('    3. Ensure these headings exist:');
    for (const heading of REQUIRED_HEADINGS) {
      console.error(`       ${heading}`);
    }
  }

  // Determine exit code
  const hasHeadingErrors = headingErrors.length > 0;
  const hasFilenameErrors = strictFilenames && filenameWarnings.length > 0;

  if (hasHeadingErrors || hasFilenameErrors) {
    console.error('\nOps Notes lint FAILED.');
    process.exit(1);
  }

  console.log('\nAll ops notes are valid.');
  process.exit(0);
}

main();
