#!/usr/bin/env bun

/**
 * safe-command
 *
 * A proxy tool to safely restrict commands for AI agents.
 */

import { loadConfig, getCommandConfig } from './config';
import { matchAnyPattern } from './matcher';
import { executeCommand } from './executor';
import { parseAwsCommand } from './aws';

/**
 * Print error message to stderr
 */
function printError(message: string): void {
  console.error(`Error: ${message}`);
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`Usage: safe-command [options] -- <command> [args...]

Options:
  -h, --help     Show this help message

Examples:
  safe-command -- aws s3 ls
  safe-command -- aws ec2 describe-instances
  safe-command -- aws sts get-caller-identity

Configuration:
  Configuration file (safe-command.yaml) should be placed in:
    - ./safe-command.yaml (current directory)
    - ~/.config/safe-command/safe-command.yaml (home directory)

  See examples/safe-command.yaml for a sample configuration.
`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Handle help flag
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  // Find "--" delimiter
  const delimiterIndex = args.indexOf('--');
  if (delimiterIndex === -1) {
    printError('Missing "--" delimiter');
    console.error('\nUsage: safe-command [options] -- <command> [args...]');
    console.error('Example: safe-command -- aws s3 ls\n');
    process.exit(1);
  }

  // Parse options and command
  const options = args.slice(0, delimiterIndex);
  const commandParts = args.slice(delimiterIndex + 1);

  if (commandParts.length === 0) {
    printError('No command specified after "--"');
    console.error('\nUsage: safe-command [options] -- <command> [args...]');
    console.error('Example: safe-command -- aws s3 ls\n');
    process.exit(1);
  }

  const [command, ...commandArgs] = commandParts;

  // Load configuration
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Get command configuration
  const commandConfig = getCommandConfig(config, command);
  if (!commandConfig) {
    printError(`Command "${command}" is not configured`);
    console.error('\nNo configuration found for this command in safe-command.yaml');
    console.error(`\nTo allow "${command}" commands, add a configuration like:`);
    console.error(`  commands:`);
    console.error(`    ${command}:`);
    console.error(`      patterns:`);
    console.error(`        - "pattern here"\n`);
    process.exit(1);
  }

  // Parse command based on type
  let commandString: string;
  if (command === 'aws') {
    commandString = parseAwsCommand(commandArgs);
  } else {
    // Generic: just join arguments
    commandString = commandArgs.join(' ');
  }

  // Check if command is allowed
  const allowed = matchAnyPattern(commandConfig.patterns, commandString);

  if (!allowed) {
    printError(`Command not allowed: ${command} ${commandString}`);
    console.error('No matching pattern found in safe-command.yaml');
    console.error('\nTo allow this command, add a pattern like:');
    console.error(`  commands:`);
    console.error(`    ${command}:`);
    console.error(`      patterns:`);
    console.error(`        - "${commandString}"`);
    console.error(`        # or use wildcards:`);
    console.error(`        - "${commandArgs[0]} ${commandArgs[1]}*"\n`);
    process.exit(1);
  }

  // Execute command
  await executeCommand(command, commandArgs);
}

// Run main function
main().catch((error) => {
  printError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
