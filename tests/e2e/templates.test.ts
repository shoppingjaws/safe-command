import { beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSafeCommand, runCommand } from "./helpers/test-runner";

describe("E2E: Init command with templates", () => {
	// Build the binary once before all tests
	beforeAll(async () => {
		await buildSafeCommand();
	});

	describe("Template initialization", () => {
		test("should initialize with aws-readonly template", async () => {
			const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));
			const configPath = join(tempDir, ".config", "safe-command", "safe-command.yaml");

			try {
				const result = await runCommand(
					["init", "--template", "aws-readonly"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("template: aws-readonly");

				// Verify config was created with correct content
				const content = readFileSync(configPath, "utf-8");
				expect(content).toContain("Template: AWS Read-Only");
				expect(content).toContain("* list-*");
				expect(content).toContain("* get-*");
			} finally {
				rmSync(tempDir, { recursive: true, force: true });
			}
		});

		test("should initialize with kubernetes template", async () => {
			const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));
			const configPath = join(tempDir, ".config", "safe-command", "safe-command.yaml");

			try {
				const result = await runCommand(
					["init", "--template", "kubernetes"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("template: kubernetes");

				// Verify config was created with correct content
				const content = readFileSync(configPath, "utf-8");
				expect(content).toContain("Template: Kubernetes");
				expect(content).toContain("kubectl:");
				expect(content).toContain("get *");
			} finally {
				rmSync(tempDir, { recursive: true, force: true });
			}
		});

		test("should initialize with terraform template", async () => {
			const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));
			const configPath = join(tempDir, ".config", "safe-command", "safe-command.yaml");

			try {
				const result = await runCommand(
					["init", "--template", "terraform"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("template: terraform");

				// Verify config was created with correct content
				const content = readFileSync(configPath, "utf-8");
				expect(content).toContain("Template: Terraform");
				expect(content).toContain("terraform:");
				expect(content).toContain("plan*");
			} finally {
				rmSync(tempDir, { recursive: true, force: true });
			}
		});

		test("should initialize with docker template", async () => {
			const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));
			const configPath = join(tempDir, ".config", "safe-command", "safe-command.yaml");

			try {
				const result = await runCommand(["init", "--template", "docker"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("template: docker");

				// Verify config was created with correct content
				const content = readFileSync(configPath, "utf-8");
				expect(content).toContain("Template: Docker");
				expect(content).toContain("docker:");
				expect(content).toContain("ps*");
			} finally {
				rmSync(tempDir, { recursive: true, force: true });
			}
		});

		test("should initialize with multi-command template", async () => {
			const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));
			const configPath = join(tempDir, ".config", "safe-command", "safe-command.yaml");

			try {
				const result = await runCommand(
					["init", "--template", "multi-command"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("template: multi-command");

				// Verify config was created with correct content
				const content = readFileSync(configPath, "utf-8");
				expect(content).toContain("Template: Multi-Command");
				expect(content).toContain("aws:");
				expect(content).toContain("kubectl:");
				expect(content).toContain("terraform:");
				expect(content).toContain("docker:");
				expect(content).toContain("gh:");
				expect(content).toContain("gcloud:");
			} finally {
				rmSync(tempDir, { recursive: true, force: true });
			}
		});

		test("should reject unknown template", async () => {
			const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));

			try {
				const result = await runCommand(
					["init", "--template", "unknown-template"],
					tempDir,
				);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("Unknown template: unknown-template");
				expect(result.stderr).toContain("Available templates:");
			} finally {
				rmSync(tempDir, { recursive: true, force: true });
			}
		});
	});

	describe("List templates", () => {
		test("should list available templates", async () => {
			const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));

			try {
				const result = await runCommand(["init", "--list-templates"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("Available templates:");
				expect(result.stdout).toContain("aws-readonly");
				expect(result.stdout).toContain("aws-dev");
				expect(result.stdout).toContain("kubernetes");
				expect(result.stdout).toContain("terraform");
				expect(result.stdout).toContain("docker");
				expect(result.stdout).toContain("multi-command");
			} finally {
				rmSync(tempDir, { recursive: true, force: true });
			}
		});
	});

	describe("Template with force flag", () => {
		test("should overwrite existing config with template", async () => {
			const tempDir = mkdtempSync(join(tmpdir(), "safe-command-test-"));
			const configPath = join(tempDir, ".config", "safe-command", "safe-command.yaml");

			try {
				// First init with default template
				await runCommand(["init"], tempDir);

				// Then overwrite with kubernetes template
				const result = await runCommand(
					["init", "--template", "kubernetes", "--force"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("overwritten");
				expect(result.stdout).toContain("template: kubernetes");

				// Verify config was overwritten
				const content = readFileSync(configPath, "utf-8");
				expect(content).toContain("Template: Kubernetes");
			} finally {
				rmSync(tempDir, { recursive: true, force: true });
			}
		});
	});
});
