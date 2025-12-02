import { describe, test, expect, beforeAll } from "bun:test";
import { runSafeCommand, buildSafeCommand } from "./helpers/test-runner";
import { setupFixture } from "./helpers/fixtures";

describe("E2E: Basic command execution", () => {
  // Build the binary once before all tests
  beforeAll(async () => {
    await buildSafeCommand();
  });

  describe("Allowed commands", () => {
    test("should execute allowed 'echo' command", async () => {
      const { tempDir, cleanup } = setupFixture("basic-config.yaml");
      
      try {
        const result = await runSafeCommand(["echo", "hello"], tempDir);
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("hello");
        expect(result.stderr).toBe("");
      } finally {
        cleanup();
      }
    });

    test("should execute allowed 'pwd' command", async () => {
      const { tempDir, cleanup } = setupFixture("basic-config.yaml");
      
      try {
        const result = await runSafeCommand(["pwd"], tempDir);
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("/");
        expect(result.stderr).toBe("");
      } finally {
        cleanup();
      }
    });

    test("should execute allowed 'ls' command", async () => {
      const { tempDir, cleanup } = setupFixture("basic-config.yaml");
      
      try {
        const result = await runSafeCommand(["ls"], tempDir);
        
        expect(result.exitCode).toBe(0);
        // Should list the config file
        expect(result.stdout).toContain("config.yaml");
      } finally {
        cleanup();
      }
    });

    test("should execute 'ls -la' with allowed pattern", async () => {
      const { tempDir, cleanup } = setupFixture("basic-config.yaml");
      
      try {
        const result = await runSafeCommand(["ls", "-la"], tempDir);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("config.yaml");
      } finally {
        cleanup();
      }
    });
  });

  describe("Denied commands", () => {
    test("should deny command not in config", async () => {
      const { tempDir, cleanup } = setupFixture("basic-config.yaml");
      
      try {
        const result = await runSafeCommand(["rm", "-rf", "/"], tempDir);
        
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not configured");
      } finally {
        cleanup();
      }
    });

    test("should deny all commands with empty config", async () => {
      const { tempDir, cleanup } = setupFixture("empty-config.yaml");
      
      try {
        const result = await runSafeCommand(["echo", "hello"], tempDir);
        
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not configured");
      } finally {
        cleanup();
      }
    });

    test("should deny command with unmatched pattern", async () => {
      const { tempDir, cleanup } = setupFixture("basic-config.yaml");
      
      try {
        // 'cat' is not in the basic-config.yaml
        const result = await runSafeCommand(["cat", "/etc/passwd"], tempDir);
        
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not configured");
      } finally {
        cleanup();
      }
    });
  });

  describe("Command output preservation", () => {
    test("should preserve stdout from executed command", async () => {
      const { tempDir, cleanup } = setupFixture("basic-config.yaml");
      
      try {
        const result = await runSafeCommand(["echo", "test output"], tempDir);
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("test output");
      } finally {
        cleanup();
      }
    });

    test("should preserve exit code from executed command", async () => {
      const { tempDir, cleanup } = setupFixture("basic-config.yaml");
      
      try {
        // ls with non-existent file should return non-zero exit code
        const result = await runSafeCommand(
          ["ls", "/non-existent-file-12345"],
          tempDir,
        );
        
        // Command should be allowed but fail with non-zero exit code
        expect(result.exitCode).not.toBe(0);
      } finally {
        cleanup();
      }
    });
  });
});
