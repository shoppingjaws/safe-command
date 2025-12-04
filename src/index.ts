#!/usr/bin/env bun

/**
 * safe-command
 *
 * A proxy tool to safely restrict commands for AI agents.
 */

import { runApprove } from "./approve";
import { GLOBAL_CONFIG_PATH, getCommandConfig, loadConfig } from "./config";
import { executeCommand } from "./executor";
import { initCommand } from "./init";
import { verifyIntegrity } from "./integrity";
import { matchAnyPattern } from "./matcher";

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
	console.log(`Usage: safe-command [command] [options]

Commands:
  init           Initialize global configuration file
                 Options:
                   --force  Overwrite existing configuration

  approve        Approve configuration file changes
                 Updates integrity records to allow execution with
                 the current configuration files

  exec           Execute a command (proxy mode)
                 Format: safe-command exec [options] -- <command> [args...]
                 This is the ONLY command that should be allowed for AI agents

Options:
  -h, --help     Show this help message
  --dry-run      Show what command would be executed without running it

Examples:
  safe-command init
  safe-command init --force
  safe-command approve
  safe-command exec -- aws s3 ls
  safe-command exec --dry-run -- aws s3 ls
  safe-command exec -- kubectl get pods
  safe-command exec -- docker ps
  safe-command exec -- git status

Configuration:
  Configuration file (safe-command.yaml) should be placed in:
    - ./safe-command.yaml (current directory, higher priority)
    - ~/.config/safe-command/safe-command.yaml (global configuration)

  To create a default global configuration, run:
    safe-command init

Security:
  safe-command tracks configuration file integrity using SHA-256 hashes.
  If configuration files are modified, you must run 'safe-command approve'
  to explicitly approve the changes before commands can be executed.

  ⚠️  IMPORTANT: For AI agents, ONLY allow 'safe-command exec' to prevent
  unauthorized approval of configuration changes. Never allow the bare
  'safe-command' or 'safe-command approve' commands.
`);
}

/**
 * Execute command with integrity check
 */
async function executeWithIntegrityCheck(
	command: string,
	commandArgs: string[],
	dryRun: boolean,
): Promise<void> {
	// Verify configuration file integrity (skip if explicitly disabled for testing)
	const skipIntegrityCheck =
		process.env.SAFE_COMMAND_NO_INTEGRITY_CHECK === "1";
	const integrityResult = skipIntegrityCheck
		? {
				valid: true,
				errors: [],
				changedFiles: [],
				newFiles: [],
				isFirstRun: false,
			}
		: verifyIntegrity();
	if (!integrityResult.valid) {
		console.error("❌ Configuration integrity check failed\n");
		for (const error of integrityResult.errors) {
			console.error(error);
			console.error("");
		}
		console.error("🔒 Security Notice:");
		console.error(
			"   Configuration files have been modified or are not approved.",
		);
		console.error(
			"   This prevents unauthorized command execution by AI agents or",
		);
		console.error("   other automated tools.\n");
		console.error(
			"   Run 'safe-command approve' to review and approve changes.\n",
		);
		process.exit(1);
	}

	// First run - automatically approve and continue
	if (integrityResult.isFirstRun) {
		console.log("ℹ️  First run detected - initializing integrity records...");
		const { updateIntegrityRecords, saveIntegrityRecords } = await import(
			"./integrity"
		);
		const records = updateIntegrityRecords();
		saveIntegrityRecords(records);
		console.log("✅ Integrity records initialized\n");
	}

	// Load configuration
	let config: ReturnType<typeof loadConfig>;
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
		console.error(
			"\nNo configuration found for this command in safe-command.yaml",
		);
		console.error(
			`\nTo allow "${command}" commands, add a configuration like:`,
		);
		console.error(`  commands:`);
		console.error(`    ${command}:`);
		console.error(`      patterns:`);
		console.error(`        - "pattern here"\n`);
		process.exit(1);
	}

	// Parse command arguments
	const commandString = commandArgs.join(" ");

	// Check if command is allowed
	const allowed = matchAnyPattern(commandConfig.patterns, commandString);

	if (!allowed) {
		printError(`Command not allowed: ${command} ${commandString}`);
		console.error("No matching pattern found in safe-command.yaml");
		console.error("\nTo allow this command, add a pattern like:");
		console.error(`  commands:`);
		console.error(`    ${command}:`);
		console.error(`      patterns:`);
		console.error(`        - "${commandString}"`);
		console.error(`        # or use wildcards:`);
		console.error(`        - "${commandArgs[0]} ${commandArgs[1]}*"\n`);
		process.exit(1);
	}

	// Execute command
	await executeCommand(command, commandArgs, dryRun);
}

/**
 * Main entry point
 */
async function main() {
	const args = process.argv.slice(2);

	// Handle help flag
	if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
		printUsage();
		process.exit(0);
	}

	// Handle init command
	if (args[0] === "init") {
		const force = args.includes("--force");
		try {
			initCommand(GLOBAL_CONFIG_PATH, force);
			process.exit(0);
		} catch (error) {
			printError(error instanceof Error ? error.message : String(error));
			process.exit(1);
		}
	}

	// Handle approve command
	if (args[0] === "approve") {
		try {
			await runApprove();
			process.exit(0);
		} catch (error) {
			printError(error instanceof Error ? error.message : String(error));
			process.exit(1);
		}
	}

	// Handle exec command (required for command execution)
	if (args[0] === "exec") {
		// Remove 'exec' from args and process the rest
		const execArgs = args.slice(1);
		const delimiterIndex = execArgs.indexOf("--");
		if (delimiterIndex === -1) {
			printError('Missing "--" delimiter');
			console.error(
				"\nUsage: safe-command exec [options] -- <command> [args...]",
			);
			console.error("Example: safe-command exec -- kubectl get pods\n");
			process.exit(1);
		}

		const options = execArgs.slice(0, delimiterIndex);
		const commandParts = execArgs.slice(delimiterIndex + 1);

		if (commandParts.length === 0) {
			printError('No command specified after "--"');
			console.error(
				"\nUsage: safe-command exec [options] -- <command> [args...]",
			);
			console.error("Example: safe-command exec -- kubectl get pods\n");
			process.exit(1);
		}

		const dryRun = options.includes("--dry-run");
		const [command, ...commandArgs] = commandParts;

		// Execute command with integrity check
		await executeWithIntegrityCheck(command, commandArgs, dryRun);
		return;
	}

	// Unknown command
	printError(`Unknown command: ${args[0]}`);
	console.error("\nAvailable commands: init, approve, exec");
	console.error("\nUsage: safe-command exec [options] -- <command> [args...]");
	console.error("Example: safe-command exec -- kubectl get pods\n");
	process.exit(1);
}

// Run main function
main().catch((error) => {
	printError(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
