import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approveSafeCommand } from "./test-runner";

/**
 * Creates a temporary directory with a test fixture configuration
 * @param fixtureName Name of the fixture file (e.g., 'basic-config.yaml')
 * @param autoApprove Whether to automatically approve the configuration (default: true)
 * @returns Object with temp directory path and cleanup function
 */
export function setupFixture(
	fixtureName: string,
	autoApprove = true,
): {
	tempDir: string;
	configPath: string;
	writeConfig: (content: string) => void;
	cleanup: () => void;
} {
	// Create a temporary directory
	const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));

	// Copy fixture file to temp directory as 'safe-command.yaml'
	const fixtureSource = join(process.cwd(), "tests", "fixtures", fixtureName);
	const configPath = join(tempDir, "safe-command.yaml");

	try {
		copyFileSync(fixtureSource, configPath);
	} catch (error) {
		// Clean up temp dir if copy fails
		rmSync(tempDir, { recursive: true, force: true });
		throw new Error(`Failed to copy fixture ${fixtureName}: ${error}`);
	}

	// Note: autoApprove is handled automatically on first run by safe-command itself
	// We don't need to explicitly call 'approve' here - the first command execution
	// will automatically initialize integrity records

	// Helper function to write new config content
	const writeConfig = (content: string) => {
		Bun.write(configPath, content);
	};

	// Return temp directory path and cleanup function
	return {
		tempDir,
		configPath,
		writeConfig,
		cleanup: () => {
			try {
				rmSync(tempDir, { recursive: true, force: true });
			} catch (error) {
				// Ignore cleanup errors
				console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
			}
		},
	};
}

/**
 * Sets up a fixture with custom content
 * @param configContent YAML content as string
 * @param autoApprove Whether to automatically approve the configuration (default: true)
 * @returns Object with temp directory path and cleanup function
 */
export function setupCustomFixture(
	configContent: string,
	autoApprove = true,
): {
	tempDir: string;
	configPath: string;
	writeConfig: (content: string) => void;
	cleanup: () => void;
} {
	// Create a temporary directory
	const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));

	// Write config content to temp directory
	const configPath = join(tempDir, "safe-command.yaml");

	try {
		Bun.write(configPath, configContent);
	} catch (error) {
		// Clean up temp dir if write fails
		rmSync(tempDir, { recursive: true, force: true });
		throw new Error(`Failed to write custom fixture: ${error}`);
	}

	// Note: autoApprove is handled automatically on first run by safe-command itself
	// We don't need to explicitly call 'approve' here - the first command execution
	// will automatically initialize integrity records

	// Helper function to write new config content
	const writeConfig = (content: string) => {
		Bun.write(configPath, content);
	};

	return {
		tempDir,
		configPath,
		writeConfig,
		cleanup: () => {
			try {
				rmSync(tempDir, { recursive: true, force: true });
			} catch (error) {
				console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
			}
		},
	};
}
