import { beforeAll, describe, expect, test } from "bun:test";
import { setupFixture } from "./helpers/fixtures";
import { buildSafeCommand, runSafeCommand } from "./helpers/test-runner";

describe("E2E: Wildcard pattern matching", () => {
	// Build the binary once before all tests
	beforeAll(async () => {
		await buildSafeCommand();
	});

	describe("Prefix wildcard patterns", () => {
		test("should match 'hello*' pattern with 'hello'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(["echo", "hello"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toBe("hello");
			} finally {
				cleanup();
			}
		});

		test("should match 'hello*' pattern with 'hello world'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(
					["echo", "hello", "world"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toBe("hello world");
			} finally {
				cleanup();
			}
		});

		test("should match 'hello*' pattern with 'hello123'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(["echo", "hello123"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toBe("hello123");
			} finally {
				cleanup();
			}
		});

		test("should NOT match 'hello*' pattern with 'hi'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(["echo", "hi"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("not allowed");
			} finally {
				cleanup();
			}
		});
	});

	describe("Suffix wildcard patterns", () => {
		test("should match '* world' pattern with 'hello world'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(
					["echo", "hello", "world"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toBe("hello world");
			} finally {
				cleanup();
			}
		});

		test("should match '* world' pattern with 'test world'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(["echo", "test", "world"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toBe("test world");
			} finally {
				cleanup();
			}
		});

		test("should NOT match '* world' pattern with 'hi universe'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(
					["echo", "hi", "universe"],
					tempDir,
				);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("not allowed");
			} finally {
				cleanup();
			}
		});
	});

	describe("Middle wildcard patterns", () => {
		test("should match 'test *' pattern with 'test 123'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(["echo", "test", "123"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toBe("test 123");
			} finally {
				cleanup();
			}
		});

		test("should match 'test *' pattern with 'test abc def'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(
					["echo", "test", "abc", "def"],
					tempDir,
				);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toBe("test abc def");
			} finally {
				cleanup();
			}
		});
	});

	describe("Option pattern matching", () => {
		test("should match '-l*' pattern with '-la'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(["ls", "-la"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("safe-command.yaml");
			} finally {
				cleanup();
			}
		});

		test("should match '-l*' pattern with '-l'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(["ls", "-l"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toContain("safe-command.yaml");
			} finally {
				cleanup();
			}
		});

		test("should NOT match '-l*' pattern with '-a'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(["ls", "-a"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("not allowed");
			} finally {
				cleanup();
			}
		});
	});

	describe("File extension pattern matching", () => {
		test("should match '*.txt' pattern with 'file.txt'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				// Create a test file
				await Bun.write(`${tempDir}/test.txt`, "content");

				const result = await runSafeCommand(["cat", "test.txt"], tempDir);

				expect(result.exitCode).toBe(0);
				expect(result.stdout).toBe("content");
			} finally {
				cleanup();
			}
		});

		test("should NOT match '*.txt' pattern with 'file.md'", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				const result = await runSafeCommand(["cat", "test.md"], tempDir);

				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain("not allowed");
			} finally {
				cleanup();
			}
		});
	});

	describe("Multiple pattern OR logic", () => {
		test("should allow command matching any of multiple patterns", async () => {
			const { tempDir, cleanup } = setupFixture("wildcard-config.yaml");

			try {
				// Test first pattern: "hello*"
				const result1 = await runSafeCommand(["echo", "hello"], tempDir);
				expect(result1.exitCode).toBe(0);

				// Test second pattern: "* world"
				const result2 = await runSafeCommand(
					["echo", "test", "world"],
					tempDir,
				);
				expect(result2.exitCode).toBe(0);

				// Test third pattern: "test *"
				const result3 = await runSafeCommand(["echo", "test", "123"], tempDir);
				expect(result3.exitCode).toBe(0);
			} finally {
				cleanup();
			}
		});
	});
});
