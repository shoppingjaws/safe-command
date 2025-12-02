import { describe, test, expect, beforeAll, afterEach } from "bun:test";
import {
	runSafeCommandDirect,
	buildSafeCommand,
} from "./helpers/test-runner";
import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("E2E: Init command", () => {
	let testHomeDir: string;
	let testConfigPath: string;

	// Build the binary once before all tests
	beforeAll(async () => {
		await buildSafeCommand();
	});

	// Set up a temporary home directory for each test
	function setupTestHome(): void {
		// Create a unique temporary directory for this test
		testHomeDir = join(tmpdir(), `safe-command-test-${Date.now()}`);
		mkdirSync(testHomeDir, { recursive: true });

		// Calculate config path
		testConfigPath = join(testHomeDir, ".config", "safe-command", "safe-command.yaml");
	}

	// Clean up after each test
	afterEach(() => {
		if (testHomeDir && existsSync(testHomeDir)) {
			rmSync(testHomeDir, { recursive: true, force: true });
		}
	});

	describe("Basic initialization", () => {
		test("should create global configuration file", async () => {
			setupTestHome();

			const result = await runSafeCommandDirect(
				["init"],
				testHomeDir,
				{ HOME: testHomeDir },
			);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("initialized successfully");
			expect(existsSync(testConfigPath)).toBe(true);

			// Verify config content
			const configContent = readFileSync(testConfigPath, "utf-8");
			expect(configContent).toContain("commands:");
			expect(configContent).toContain("aws:");
			expect(configContent).toContain("patterns:");
		});

		test("should create .config/safe-command directory if it doesn't exist", async () => {
			setupTestHome();

			const configDir = join(testHomeDir, ".config", "safe-command");
			expect(existsSync(configDir)).toBe(false);

			const result = await runSafeCommandDirect(
				["init"],
				testHomeDir,
				{ HOME: testHomeDir },
			);

			expect(result.exitCode).toBe(0);
			expect(existsSync(configDir)).toBe(true);
			expect(result.stdout).toContain("Created directory");
		});

		test("should display success message", async () => {
			setupTestHome();

			const result = await runSafeCommandDirect(
				["init"],
				testHomeDir,
				{ HOME: testHomeDir },
			);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("Configuration file created:");
			expect(result.stdout).toContain(".config/safe-command/safe-command.yaml");
		});
	});

	describe("Overwrite protection", () => {
		test("should not overwrite existing config without --force", async () => {
			setupTestHome();

			// Create config first
			const configDir = join(testHomeDir, ".config", "safe-command");
			mkdirSync(configDir, { recursive: true });
			const existingContent = "# Existing config\ncommands: {}";
			require("fs").writeFileSync(testConfigPath, existingContent, "utf-8");

			// Try to init again without --force
			const result = await runSafeCommandDirect(
				["init"],
				testHomeDir,
				{ HOME: testHomeDir },
			);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("already exists");
			expect(result.stderr).toContain("--force");

			// Verify config was not overwritten
			const configContent = readFileSync(testConfigPath, "utf-8");
			expect(configContent).toBe(existingContent);
		});

		test("should overwrite existing config with --force", async () => {
			setupTestHome();

			// Create config first
			const configDir = join(testHomeDir, ".config", "safe-command");
			mkdirSync(configDir, { recursive: true });
			const existingContent = "# Existing config\ncommands: {}";
			require("fs").writeFileSync(testConfigPath, existingContent, "utf-8");

			// Try to init again with --force
			const result = await runSafeCommandDirect(
				["init", "--force"],
				testHomeDir,
				{ HOME: testHomeDir },
			);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("overwritten");

			// Verify config was overwritten with default content
			const configContent = readFileSync(testConfigPath, "utf-8");
			expect(configContent).not.toBe(existingContent);
			expect(configContent).toContain("aws:");
		});
	});

	describe("Configuration content", () => {
		test("should include AWS read-only patterns", async () => {
			setupTestHome();

			await runSafeCommandDirect(
				["init"],
				testHomeDir,
				{ HOME: testHomeDir },
			);

			const configContent = readFileSync(testConfigPath, "utf-8");
			expect(configContent).toContain("* list-*");
			expect(configContent).toContain("* get-*");
			expect(configContent).toContain("* describe-*");
			expect(configContent).toContain("s3 ls*");
			expect(configContent).toContain("sts get-caller-identity");
		});

		test("should have commented-out write operations", async () => {
			setupTestHome();

			await runSafeCommandDirect(
				["init"],
				testHomeDir,
				{ HOME: testHomeDir },
			);

			const configContent = readFileSync(testConfigPath, "utf-8");
			expect(configContent).toContain("# - \"s3 cp*\"");
			expect(configContent).toContain("# - \"ec2 start-instances*\"");
			expect(configContent).toContain("# - \"lambda invoke*\"");
		});

		test("should have commented-out dangerous operations", async () => {
			setupTestHome();

			await runSafeCommandDirect(
				["init"],
				testHomeDir,
				{ HOME: testHomeDir },
			);

			const configContent = readFileSync(testConfigPath, "utf-8");
			expect(configContent).toContain("# - \"* delete-*\"");
			expect(configContent).toContain("# - \"* remove-*\"");
			expect(configContent).toContain("# - \"* terminate-*\"");
		});
	});
});
