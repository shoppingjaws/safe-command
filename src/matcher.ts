/**
 * Pattern matching utilities
 *
 * Supports wildcard patterns with '*' matching zero or more characters.
 */

/**
 * Convert a wildcard pattern to a RegExp
 *
 * @param pattern - Pattern string with '*' wildcards
 * @returns RegExp that matches the pattern
 *
 * @example
 * patternToRegex("s3 ls*") => /^s3\ ls.*$/
 * patternToRegex("* describe-*") => /^.*\ describe\-.*$/
 */
function patternToRegex(pattern: string): RegExp {
  // Escape special regex characters except '*'
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`);
}

/**
 * Check if a target string matches a wildcard pattern
 *
 * @param pattern - Pattern string with '*' wildcards
 * @param target - Target string to match
 * @returns true if the target matches the pattern
 *
 * @example
 * matchPattern("s3 ls*", "s3 ls") => true
 * matchPattern("s3 ls*", "s3 ls s3://bucket") => true
 * matchPattern("s3 ls*", "s3 cp") => false
 * matchPattern("* describe-*", "ec2 describe-instances") => true
 */
export function matchPattern(pattern: string, target: string): boolean {
  const regex = patternToRegex(pattern);
  return regex.test(target);
}

/**
 * Check if a target string matches any of the patterns
 *
 * @param patterns - Array of pattern strings
 * @param target - Target string to match
 * @returns true if the target matches any pattern
 *
 * @example
 * matchAnyPattern(["s3 ls*", "ec2 describe-*"], "s3 ls") => true
 * matchAnyPattern(["s3 ls*", "ec2 describe-*"], "s3 cp") => false
 */
export function matchAnyPattern(patterns: string[], target: string): boolean {
  return patterns.some(pattern => matchPattern(pattern, target));
}
