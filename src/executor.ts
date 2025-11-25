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
 * @returns Promise that resolves when the command completes
 *
 * The function will:
 * - Inherit stdout and stderr from the parent process
 * - Exit with the same exit code as the command
 */
export async function executeCommand(
	command: string,
	args: string[],
): Promise<void> {
	const proc = Bun.spawn([command, ...args], {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});

	const exitCode = await proc.exited;
	process.exit(exitCode);
}
