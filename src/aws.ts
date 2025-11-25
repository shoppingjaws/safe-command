/**
 * AWS CLI specific logic
 *
 * Handles AWS command parsing and processing.
 */

/**
 * Parse AWS command arguments into a pattern-matchable string
 *
 * @param args - Command arguments (e.g., ["s3", "ls", "s3://bucket"])
 * @returns Pattern string (e.g., "s3 ls s3://bucket")
 *
 * @example
 * parseAwsCommand(["s3", "ls"]) => "s3 ls"
 * parseAwsCommand(["ec2", "describe-instances", "--region", "us-east-1"]) => "ec2 describe-instances --region us-east-1"
 */
export function parseAwsCommand(args: string[]): string {
  return args.join(' ');
}
