/**
 * Command executor
 *
 * Executes allowed commands and returns their output.
 */

/**
 * Execute a command with the given arguments
 *
 * @param command - Command to execute (e.g., "aws")
 * @param args - Command arguments (e.g., ["s3", "ls"])
 * @param dryRun - If true, show what would be executed without running it
 * @returns Promise that resolves when the command completes
 *
 * The function will:
 * - Inherit stdout and stderr from the parent process
 * - Exit with the same exit code as the command
 * - In dry-run mode, print the command without executing it
 */
export async function executeCommand(
	command: string,
	args: string[],
	dryRun = false,
): Promise<void> {
	if (dryRun) {
		// In dry-run mode, just print what would be executed
		const fullCommand = [command, ...args].join(" ");
		console.log(`[DRY RUN] Would execute: ${fullCommand}`);
		process.exit(0);
	}

	const proc = Bun.spawn([command, ...args], {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});

	const exitCode = await proc.exited;
	process.exit(exitCode);
}
