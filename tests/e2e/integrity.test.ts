import { describe, test, expect, beforeAll } from "bun:test";
import {
	runSafeCommand,
	runSafeCommandDirect,
	buildSafeCommand,
} from "./helpers/test-runner";
import { setupCustomFixture } from "./helpers/fixtures";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

describe("E2E: Configuration integrity checking", () => {
	// Build the binary once before all tests
	beforeAll(async () => {
		await buildSafeCommand();
	});

	describe("First run behavior", () => {
		test("should automatically approve on first run", async () => {
			const { tempDir, configPath, cleanup } = setupCustomFixture(`
commands:
  echo:
    patterns:
      - "hello"
`);

			try {
				// Set HOME to temp directory to isolate integrity.json
				const env = { HOME: tempDir };

				// First run should automatically approve
				const result = await runSafeCommand(["echo", "hello"], tempDir, env);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("hello");
				expect(result.stderr).toContain("First run detected");
				expect(result.stderr).toContain("Integrity records initialized");

				// Verify integrity.json was created
				const integrityPath = join(
					tempDir,
					".config",
					"safe-command",
					"integrity.json",
				);
				expect(existsSync(integrityPath)).toBe(true);
			} finally {
				cleanup();
			}
		});

		test("should create integrity records on first run", async () => {
			const { tempDir, cleanup } = setupCustomFixture(`
commands:
  pwd:
    patterns:
      - ""
`);

			try {
				const env = { HOME: tempDir };

				// First run
				await runSafeCommand(["pwd"], tempDir, env);

				// Verify integrity.json contains the config file hash
				const integrityPath = join(
					tempDir,
					".config",
					"safe-command",
					"integrity.json",
				);
				const content = await Bun.file(integrityPath).text();
				const records = JSON.parse(content);

				expect(Array.isArray(records)).toBe(true);
				expect(records.length).toBeGreaterThan(0);
				expect(records[0]).toHaveProperty("path");
				expect(records[0]).toHaveProperty("hash");
				expect(records[0]).toHaveProperty("lastModified");
			} finally {
				cleanup();
			}
		});
	});

	describe("Configuration tampering detection", () => {
		test("should detect modified configuration file", async () => {
			const { tempDir, configPath, cleanup } = setupCustomFixture(`
commands:
  echo:
    patterns:
      - "hello"
`);

			try {
				const env = { HOME: tempDir };

				// First run to initialize integrity records
				await runSafeCommand(["echo", "hello"], tempDir);

				// Modify the configuration file
				writeFileSync(
					configPath,
					`
commands:
  echo:
    patterns:
      - "*"  # Dangerous wildcard added by AI agent
`,
				);

				// Second run should detect the modification and fail
				const result = await runSafeCommand(["echo", "hello"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("Configuration integrity check failed");
				expect(result.stderr).toContain("has been modified");
				expect(result.stderr).toContain("safe-command approve");
			} finally {
				cleanup();
			}
		});

		test("should prevent execution with tampered config", async () => {
			const { tempDir, configPath, cleanup } = setupCustomFixture(`
commands:
  ls:
    patterns:
      - ""
`);

			try {
				const env = { HOME: tempDir };

				// Initialize
				await runSafeCommand(["ls"], tempDir);

				// AI agent tampering: add dangerous rm command
				writeFileSync(
					configPath,
					`
commands:
  ls:
    patterns:
      - ""
  rm:
    patterns:
      - "*"  # Dangerous!
`,
				);

				// Attempt to execute - should be blocked
				const result = await runSafeCommand(["rm", "-rf", "/test"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("integrity check failed");
			} finally {
				cleanup();
			}
		});

		test("should detect new configuration file", async () => {
			const { tempDir, cleanup } = setupCustomFixture(`
commands:
  echo:
    patterns:
      - "test"
`);

			try {
				const env = { HOME: tempDir };

				// Initialize with local config only
				await runSafeCommand(["echo", "test"], tempDir);

				// Create global config (simulating AI agent adding new config)
				const globalConfigDir = join(tempDir, ".config", "safe-command");
				mkdirSync(globalConfigDir, { recursive: true });
				const globalConfigPath = join(globalConfigDir, "safe-command.yaml");
				writeFileSync(
					globalConfigPath,
					`
commands:
  rm:
    patterns:
      - "*"
`,
				);

				// Should detect new file
				const result = await runSafeCommand(["echo", "test"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("New configuration file detected");
				expect(result.stderr).toContain("safe-command approve");
			} finally {
				cleanup();
			}
		});
	});

	describe("Approve command", () => {
		test("should approve configuration changes", async () => {
			const { tempDir, configPath, cleanup } = setupCustomFixture(`
commands:
  echo:
    patterns:
      - "hello"
`);

			try {
				const env = { HOME: tempDir };

				// Initialize
				await runSafeCommand(["echo", "hello"], tempDir);

				// Modify config
				writeFileSync(
					configPath,
					`
commands:
  echo:
    patterns:
      - "hello"
      - "world"
`,
				);

				// Execution should fail due to modification
				let result = await runSafeCommand(["echo", "world"], tempDir);
				expect(result.exitCode).toBe(1);

				// Note: approve command requires interactive input, so we can't test it fully in E2E
				// Instead, we test the integrity verification logic separately

				// For now, just verify that the approve command exists
				result = await runSafeCommandDirect(["approve"], tempDir, env);
				// Command should run (may exit with 0 or non-0 depending on stdin handling)
				expect(result.stderr).toContain("safe-command approve");
			} finally {
				cleanup();
			}
		});

		test("should show status of configuration files", async () => {
			const { tempDir, cleanup } = setupCustomFixture(`
commands:
  ls:
    patterns:
      - ""
`);

			try {
				const env = { HOME: tempDir };

				// Initialize
				await runSafeCommand(["ls"], tempDir);

				// Run approve to see status
				const result = await runSafeCommandDirect(["approve"], tempDir, env);

				expect(result.stdout).toContain("Configuration Files:");
				expect(result.stdout).toContain("safe-command.yaml");
			} finally {
				cleanup();
			}
		});
	});

	describe("Security guarantees", () => {
		test("should prevent AI agent from bypassing restrictions", async () => {
			const { tempDir, configPath, cleanup } = setupCustomFixture(`
commands:
  aws:
    patterns:
      - "s3 ls"  # Only allow listing
`);

			try {
				const env = { HOME: tempDir };

				// Initialize
				await runSafeCommand(["aws", "s3", "ls"], tempDir);

				// AI agent attempts to modify config to allow deletion
				writeFileSync(
					configPath,
					`
commands:
  aws:
    patterns:
      - "s3 ls"
      - "s3 rm*"  # AI added this
`,
				);

				// Attempt dangerous command - should be blocked by integrity check
				const result = await runSafeCommand(
					["aws", "s3", "rm", "--recursive", "s3://production"],
					tempDir,
				);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("integrity check failed");
				// The dangerous command should never execute
			} finally {
				cleanup();
			}
		});

		test("should block execution after any config modification", async () => {
			const { tempDir, configPath, cleanup } = setupCustomFixture(`
commands:
  kubectl:
    patterns:
      - "get pods"
`);

			try {
				const env = { HOME: tempDir };

				// Initialize
				await runSafeCommand(["kubectl", "get", "pods"], tempDir);

				// Even a benign change should require approval
				writeFileSync(
					configPath,
					`
commands:
  kubectl:
    patterns:
      - "get pods"
      - "get nodes"  # Benign addition
`,
				);

				// Should still require approval
				const result = await runSafeCommand(
					["kubectl", "get", "nodes"],
					tempDir,
				);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("integrity check failed");
			} finally {
				cleanup();
			}
		});
	});
});
