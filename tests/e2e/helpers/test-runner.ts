import { join } from "node:path";
import { spawn } from "bun";

export interface CommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

/**
 * Execute safe-command with the given arguments
 * @param args Command arguments to pass after '--'
 * @param tempDir Temporary directory containing safe-command.yaml (optional)
 * @param env Environment variables (optional)
 * @param useLegacyFormat Use legacy 'safe-command -- <cmd>' format instead of 'safe-command exec -- <cmd>' (default: false)
 * @returns Result containing exit code, stdout, and stderr
 */
export async function runSafeCommand(
	args: string[],
	tempDir?: string,
	env?: Record<string, string>,
	useLegacyFormat = false,
): Promise<CommandResult> {
	const binaryPath = join(process.cwd(), "safe-command");

	// Build command arguments: safe-command exec -- <actual command>
	// or legacy format: safe-command -- <actual command>
	const fullArgs = useLegacyFormat ? ["--", ...args] : ["exec", "--", ...args];

	try {
		// By default, disable integrity check for tests unless explicitly enabled
		const defaultEnv = { SAFE_COMMAND_NO_INTEGRITY_CHECK: "1" };
		const finalEnv = env
			? { ...process.env, ...defaultEnv, ...env }
			: { ...process.env, ...defaultEnv };

		const proc = spawn({
			cmd: [binaryPath, ...fullArgs],
			cwd: tempDir || process.cwd(),
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
			env: finalEnv,
		});

		const stdout = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();
		const exitCode = await proc.exited;

		return {
			exitCode,
			stdout: stdout.trim(),
			stderr: stderr.trim(),
		};
	} catch (error) {
		// If the binary doesn't exist or can't be executed
		throw new Error(`Failed to execute safe-command: ${error}`);
	}
}

/**
 * Execute safe-command with direct arguments (for subcommands like 'init')
 * @param args Command arguments (e.g., ['init', '--force'])
 * @param tempDir Temporary directory (optional)
 * @param env Environment variables (optional)
 * @returns Result containing exit code, stdout, and stderr
 */
export async function runSafeCommandDirect(
	args: string[],
	tempDir?: string,
	env?: Record<string, string>,
): Promise<CommandResult> {
	const binaryPath = join(process.cwd(), "safe-command");

	try {
		const proc = spawn({
			cmd: [binaryPath, ...args],
			cwd: tempDir || process.cwd(),
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
			env: { ...process.env, ...env },
		});

		const stdout = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();
		const exitCode = await proc.exited;

		return {
			exitCode,
			stdout: stdout.trim(),
			stderr: stderr.trim(),
		};
	} catch (error) {
		// If the binary doesn't exist or can't be executed
		throw new Error(`Failed to execute safe-command: ${error}`);
	}
}

/**
 * Build the safe-command binary before running tests
 * Should be called once before all tests
 */
export async function buildSafeCommand(): Promise<void> {
	const proc = spawn({
		cmd: [
			"bun",
			"build",
			"src/index.ts",
			"--compile",
			"--outfile",
			"safe-command",
		],
		cwd: process.cwd(),
		stdout: "pipe",
		stderr: "pipe",
	});

	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		const stderr = await new Response(proc.stderr).text();
		throw new Error(`Failed to build safe-command: ${stderr}`);
	}
}
