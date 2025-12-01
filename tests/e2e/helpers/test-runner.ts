import { spawn } from "bun";
import { join } from "path";

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Execute safe-command with the given arguments
 * @param args Command arguments to pass after '--'
 * @param configPath Path to the config file (optional, uses default if not specified)
 * @returns Result containing exit code, stdout, and stderr
 */
export async function runSafeCommand(
  args: string[],
  configPath?: string,
): Promise<CommandResult> {
  const binaryPath = join(process.cwd(), "safe-command");

  // Set up environment variables
  const env = { ...process.env };
  if (configPath) {
    // Set working directory to where config file is located
    env.PWD = configPath.includes("/") ? configPath.substring(0, configPath.lastIndexOf("/")) : process.cwd();
  }

  // Build command arguments: safe-command -- <actual command>
  const fullArgs = ["--", ...args];

  try {
    const proc = spawn({
      cmd: [binaryPath, ...fullArgs],
      env,
      cwd: configPath?.includes("/") ? configPath.substring(0, configPath.lastIndexOf("/")) : process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
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
    cmd: ["bun", "build", "src/index.ts", "--compile", "--outfile", "safe-command"],
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
