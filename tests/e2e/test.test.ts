import { beforeAll, describe, expect, test } from "bun:test";
import { setupFixture } from "./helpers/fixtures";
import { buildSafeCommand, runCommand } from "./helpers/test-runner";

describe("E2E: Test command", () => {
	// Build the binary once before all tests
	beforeAll(async () => {
		await buildSafeCommand();
	});

	describe("Allowed patterns", () => {
		test("should report command as allowed when pattern matches", async () => {
			const { tempDir, cleanup } = setupFixture("basic-config.yaml");

			try {
				const result = await runCommand(["test", "--", "echo", "hello"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("✅ ALLOWED");
				expect(result.stdout).toContain("echo hello");
				expect(result.stdout).toContain("Matched pattern:");
			} finally {
				cleanup();
			}
		});

		test("should show which pattern matched", async () => {
			const { tempDir, cleanup, writeConfig } = setupFixture(
				"basic-config.yaml",
			);

			writeConfig(`commands:
  test:
    patterns:
      - "hello*"
      - "world*"
`);

			try {
				const result = await runCommand(
					["test", "--", "test", "hello", "there"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("✅ ALLOWED");
				expect(result.stdout).toContain('Matched pattern: "hello*"');
			} finally {
				cleanup();
			}
		});

		test("should handle wildcard patterns correctly", async () => {
			const { tempDir, cleanup, writeConfig } = setupFixture(
				"basic-config.yaml",
			);

			writeConfig(`commands:
  aws:
    patterns:
      - "* describe-*"
`);

			try {
				const result = await runCommand(
					["test", "--", "aws", "ec2", "describe-instances"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("✅ ALLOWED");
			} finally {
				cleanup();
			}
		});
	});

	describe("Denied patterns", () => {
		test("should report command as denied when no pattern matches", async () => {
			const { tempDir, cleanup, writeConfig } = setupFixture(
				"basic-config.yaml",
			);

			// Create a config with specific patterns that won't match
			writeConfig(`commands:
  echo:
    patterns:
      - "hello*"
`);

			try {
				const result = await runCommand(
					["test", "--", "echo", "not-allowed"],
					tempDir,
				);

				expect(result.exitCode).toBe(1);
				expect(result.stdout).toContain("❌ DENIED");
				expect(result.stdout).toContain("No matching pattern found");
			} finally {
				cleanup();
			}
		});

		test("should show available patterns when denied", async () => {
			const { tempDir, cleanup, writeConfig } = setupFixture(
				"basic-config.yaml",
			);

			writeConfig(`commands:
  test:
    patterns:
      - "hello*"
      - "world*"
`);

			try {
				const result = await runCommand(
					["test", "--", "test", "not-matching"],
					tempDir,
				);

				expect(result.exitCode).toBe(1);
				expect(result.stdout).toContain("❌ DENIED");
				expect(result.stdout).toContain("Available patterns");
				expect(result.stdout).toContain('"hello*"');
				expect(result.stdout).toContain('"world*"');
			} finally {
				cleanup();
			}
		});

		test("should suggest pattern when command is denied", async () => {
			const { tempDir, cleanup, writeConfig } = setupFixture(
				"basic-config.yaml",
			);

			// Create a config with specific patterns that won't match
			writeConfig(`commands:
  echo:
    patterns:
      - "hello*"
`);

			try {
				const result = await runCommand(
					["test", "--", "echo", "test", "pattern"],
					tempDir,
				);

				expect(result.exitCode).toBe(1);
				expect(result.stdout).toContain("To allow this command, add a pattern like:");
				expect(result.stdout).toContain("test pattern");
			} finally {
				cleanup();
			}
		});

		test("should report when command is not configured", async () => {
			const { tempDir, cleanup } = setupFixture("basic-config.yaml");

			try {
				const result = await runCommand(
					["test", "--", "unconfigured-command"],
					tempDir,
				);

				expect(result.exitCode).toBe(1);
				expect(result.stdout).toContain("❌ DENIED");
				expect(result.stdout).toContain("not configured");
			} finally {
				cleanup();
			}
		});
	});

	describe("Error handling", () => {
		test("should require -- delimiter", async () => {
			const { tempDir, cleanup } = setupFixture("basic-config.yaml");

			try {
				const result = await runCommand(["test", "echo", "hello"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain('Missing "--" delimiter');
			} finally {
				cleanup();
			}
		});

		test("should require command after delimiter", async () => {
			const { tempDir, cleanup } = setupFixture("basic-config.yaml");

			try {
				const result = await runCommand(["test", "--"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("No command specified");
			} finally {
				cleanup();
			}
		});

		test("should handle missing config file", async () => {
			const { tempDir, cleanup, configPath } = setupFixture("basic-config.yaml");

			// Remove the config file
			await Bun.$`rm ${configPath}`.quiet();

			try {
				const result = await runCommand(["test", "--", "echo", "hello"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("Configuration file not found");
			} finally {
				cleanup();
			}
		});
	});
});
