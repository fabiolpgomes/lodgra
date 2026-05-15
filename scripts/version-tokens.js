#!/usr/bin/env node

/**
 * Design Tokens Versioning Script
 *
 * Detects changes in tokens.yaml and manages semantic versioning
 * Usage:
 *   node scripts/version-tokens.js          # Interactive version bump
 *   node scripts/version-tokens.js --check  # Check for changes only
 *   node scripts/version-tokens.js --patch  # Auto-patch version
 *   node scripts/version-tokens.js --minor  # Auto-minor version
 *   node scripts/version-tokens.js --major  # Auto-major version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const VERSION_FILE = '.aios/tokens/version.json';
const CHANGELOG_FILE = '.aios/tokens/CHANGELOG.md';
const TOKENS_FILE = 'tokens.yaml';
const GIT_TAG_PREFIX = 'tokens-';

/**
 * Parse YAML tokens file (simplified - reads key structure)
 */
function parseTokens(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const tokens = {};
  const lines = content.split('\n');

  let currentSection = '';

  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;

    if (!line.startsWith(' ')) {
      currentSection = line.split(':')[0];
      tokens[currentSection] = {};
    } else {
      const match = line.match(/^\s+(\w+):/);
      if (match && currentSection) {
        tokens[currentSection][match[1]] = true;
      }
    }
  }

  return tokens;
}

/**
 * Get current version from version.json
 */
function getCurrentVersion() {
  const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  return versionData.version;
}

/**
 * Parse semantic version
 */
function parseVersion(versionString) {
  const [major, minor, patch] = versionString.split('.').map(Number);
  return { major, minor, patch };
}

/**
 * Format semantic version
 */
function formatVersion(major, minor, patch) {
  return `${major}.${minor}.${patch}`;
}

/**
 * Increment version
 */
function incrementVersion(versionString, bumpType) {
  const { major, minor, patch } = parseVersion(versionString);

  switch (bumpType) {
    case 'major':
      return formatVersion(major + 1, 0, 0);
    case 'minor':
      return formatVersion(major, minor + 1, 0);
    case 'patch':
    default:
      return formatVersion(major, minor, patch + 1);
  }
}

/**
 * Detect changes in tokens (simplified)
 */
function detectChanges() {
  try {
    // Git diff to detect changes
    const gitDiff = execSync(`git diff ${TOKENS_FILE}`, { encoding: 'utf8' });

    if (!gitDiff.trim()) {
      return {
        hasChanges: false,
        additions: 0,
        removals: 0,
        modifications: 0,
        suggestedBump: 'none'
      };
    }

    const additions = (gitDiff.match(/^\+/gm) || []).length;
    const removals = (gitDiff.match(/^\-/gm) || []).length;

    let suggestedBump = 'patch';

    // If removals, suggest major
    if (removals > additions) {
      suggestedBump = 'major';
    }
    // If additions > removals, suggest minor
    else if (additions > removals) {
      suggestedBump = 'minor';
    }

    return {
      hasChanges: true,
      additions: Math.max(0, additions - 1),
      removals: Math.max(0, removals - 1),
      modifications: Math.min(additions, removals),
      suggestedBump
    };
  } catch (error) {
    return {
      hasChanges: false,
      additions: 0,
      removals: 0,
      modifications: 0,
      suggestedBump: 'none'
    };
  }
}

/**
 * Update version.json
 */
function updateVersionFile(newVersion) {
  const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  versionData.version = newVersion;
  versionData.lastUpdated = new Date().toISOString();
  versionData.releaseDate = new Date().toISOString().split('T')[0];

  fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));
}

/**
 * Create changelog entry
 */
function createChangelogEntry(oldVersion, newVersion, changes) {
  const date = new Date().toISOString().split('T')[0];

  let entry = `\n## [${newVersion}] - ${date}\n\n`;

  if (changes.additions > 0) {
    entry += `### Added\n- ${changes.additions} new token(s)\n\n`;
  }

  if (changes.removals > 0) {
    entry += `### Removed\n- ${changes.removals} token(s) (breaking change)\n\n`;
  }

  if (changes.modifications > 0) {
    entry += `### Changed\n- ${changes.modifications} token value(s) updated\n\n`;
  }

  return entry;
}

/**
 * Main CLI
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🎨 Design Tokens Versioning System\n');

  const currentVersion = getCurrentVersion();
  console.log(`📦 Current version: ${currentVersion}`);

  const changes = detectChanges();

  if (!changes.hasChanges) {
    console.log('✅ No changes detected in tokens.yaml');
    process.exit(0);
  }

  console.log(`\n📊 Changes detected:`);
  console.log(`   + Additions: ${changes.additions}`);
  console.log(`   - Removals: ${changes.removals}`);
  console.log(`   ~ Modifications: ${changes.modifications}`);
  console.log(`\n💡 Suggested bump: ${changes.suggestedBump}`);

  // Determine bump type
  let bumpType = changes.suggestedBump;
  if (command === '--check') {
    process.exit(0);
  } else if (command === '--patch') {
    bumpType = 'patch';
  } else if (command === '--minor') {
    bumpType = 'minor';
  } else if (command === '--major') {
    bumpType = 'major';
  }

  const newVersion = incrementVersion(currentVersion, bumpType);

  console.log(`\n✨ Version bump: ${currentVersion} → ${newVersion} (${bumpType})`);

  // Update files
  updateVersionFile(newVersion);

  // Create changelog entry
  const changelogEntry = createChangelogEntry(currentVersion, newVersion, changes);
  const changelogContent = fs.readFileSync(CHANGELOG_FILE, 'utf8');
  const updatedChangelog = changelogContent.replace(
    '---\n\n## [1.0.0]',
    `---\n${changelogEntry}## [1.0.0]`
  );
  fs.writeFileSync(CHANGELOG_FILE, updatedChangelog);

  console.log(`✅ Updated ${VERSION_FILE}`);
  console.log(`✅ Updated ${CHANGELOG_FILE}`);

  // Git operations
  console.log('\n📝 Git operations:');
  try {
    execSync(`git add ${TOKENS_FILE} ${VERSION_FILE} ${CHANGELOG_FILE}`, { stdio: 'inherit' });
    execSync(`git commit -m "chore(tokens): bump to v${newVersion}"`, { stdio: 'inherit' });
    execSync(`git tag -a ${GIT_TAG_PREFIX}${newVersion} -m "Design tokens version ${newVersion}"`, { stdio: 'inherit' });
    console.log(`\n✅ Tagged as: ${GIT_TAG_PREFIX}${newVersion}`);
  } catch (error) {
    console.error('❌ Git operations failed:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 Versioning complete!');
}

main();
