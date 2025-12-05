import { beforeAll, describe, expect, test } from "bun:test";
import { setupFixture } from "./helpers/fixtures";
import { buildSafeCommand, runCommand } from "./helpers/test-runner";

describe("E2E: Validate command", () => {
	// Build the binary once before all tests
	beforeAll(async () => {
		await buildSafeCommand();
	});

	describe("Valid configurations", () => {
		test("should validate basic config with warnings", async () => {
			const { tempDir, cleanup } = setupFixture("basic-config.yaml");

			try {
				const result = await runCommand(["validate"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("Configuration is valid");
				expect(result.stdout).toContain("Configured commands:");
			} finally {
				cleanup();
			}
		});

		test("should show warnings for permissive patterns", async () => {
			const { tempDir, cleanup, writeConfig } = setupFixture(
				"basic-config.yaml",
			);

			// Create a config with overly permissive patterns
			writeConfig(`commands:
  test:
    patterns:
      - "*"
`);

			try {
				const result = await runCommand(["validate"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("⚠️");
				expect(result.stdout).toContain("overly permissive");
			} finally {
				cleanup();
			}
		});

		test("should warn about dangerous AWS patterns", async () => {
			const { tempDir, cleanup, writeConfig } = setupFixture(
				"basic-config.yaml",
			);

			// Create a config with dangerous AWS patterns
			writeConfig(`commands:
  aws:
    patterns:
      - "* delete-*"
      - "* terminate-*"
`);

			try {
				const result = await runCommand(["validate"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("⚠️");
				expect(result.stdout).toContain("delete operations");
				expect(result.stdout).toContain("terminate operations");
			} finally {
				cleanup();
			}
		});
	});

	describe("Invalid configurations", () => {
		test("should handle empty config with warning", async () => {
			const { tempDir, cleanup } = setupFixture("empty-config.yaml");

			try {
				const result = await runCommand(["validate"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("⚠️");
				expect(result.stdout).toContain("No commands configured");
			} finally {
				cleanup();
			}
		});

		test("should handle missing config file", async () => {
			const { tempDir, cleanup, configPath } = setupFixture("basic-config.yaml");

			// Remove the config file
			await Bun.$`rm ${configPath}`.quiet();

			try {
				const result = await runCommand(["validate"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("Configuration file not found");
			} finally {
				cleanup();
			}
		});
	});

	describe("Information display", () => {
		test("should display pattern count", async () => {
			const { tempDir, cleanup } = setupFixture("basic-config.yaml");

			try {
				const result = await runCommand(["validate"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toMatch(/Found \d+ command\(s\) with \d+ pattern\(s\) total/);
			} finally {
				cleanup();
			}
		});

		test("should list configured commands", async () => {
			const { tempDir, cleanup, writeConfig } = setupFixture(
				"basic-config.yaml",
			);

			writeConfig(`commands:
  echo:
    patterns:
      - "hello*"
  pwd:
    patterns:
      - ""
`);

			try {
				const result = await runCommand(["validate"], tempDir);

				expect(result.stdout).toContain("Configured commands:");
				expect(result.stdout).toContain("echo");
				expect(result.stdout).toContain("pwd");
			} finally {
				cleanup();
			}
		});
	});
});
