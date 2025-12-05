/**
 * Pattern testing command
 *
 * Tests if a command would be allowed without executing it.
 */

import { getCommandConfig, loadConfig } from "./config";
import { matchAnyPattern } from "./matcher";

/**
 * Run pattern test
 *
 * @param command - Command to test (e.g., "aws")
 * @param commandArgs - Command arguments (e.g., ["s3", "ls"])
 * @returns Exit code (0 if allowed, 1 if denied or error)
 */
export function runTest(command: string, commandArgs: string[]): number {
	try {
		// Load configuration
		const config = loadConfig();

		// Get command configuration
		const commandConfig = getCommandConfig(config, command);
		if (!commandConfig) {
			console.log(`❌ DENIED: Command "${command}" is not configured\n`);
			console.log(
				`No configuration found for this command in safe-command.yaml`,
			);
			console.log(
				`\nTo allow "${command}" commands, add a configuration like:`,
			);
			console.log(`  commands:`);
			console.log(`    ${command}:`);
			console.log(`      patterns:`);
			console.log(`        - "pattern here"\n`);
			return 1;
		}

		// Parse command arguments
		const commandString = commandArgs.join(" ");
		const fullCommand = `${command} ${commandString}`;

		// Check if command matches any pattern
		let matchedPattern: string | null = null;
		for (const pattern of commandConfig.patterns) {
			if (matchAnyPattern([pattern], commandString)) {
				matchedPattern = pattern;
				break;
			}
		}

		if (matchedPattern) {
			console.log(`✅ ALLOWED: ${fullCommand}`);
			console.log(`   Matched pattern: "${matchedPattern}"\n`);
			return 0;
		}

		console.log(`❌ DENIED: ${fullCommand}`);
		console.log(`   No matching pattern found\n`);
		console.log(`Available patterns for '${command}':`);
		for (const pattern of commandConfig.patterns) {
			console.log(`  - "${pattern}"`);
		}
		console.log();
		console.log(`To allow this command, add a pattern like:`);
		console.log(`  commands:`);
		console.log(`    ${command}:`);
		console.log(`      patterns:`);
		console.log(`        - "${commandString}"`);
		// Only suggest wildcards if there are at least 2 arguments that form a subcommand structure
		if (commandArgs.length >= 2 && commandArgs[1].length > 0) {
			console.log(`        # or use wildcards:`);
			console.log(`        - "${commandArgs[0]} ${commandArgs[1]}*"`);
		}
		console.log();

		return 1;
	} catch (error) {
		console.error("❌ Error testing command\n");
		console.error(
			"Error:",
			error instanceof Error ? error.message : String(error),
		);
		return 1;
	}
}
