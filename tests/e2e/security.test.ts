import { describe, test, expect, beforeAll } from "bun:test";
import { runSafeCommand, buildSafeCommand } from "./helpers/test-runner";
import { setupFixture, setupCustomFixture } from "./helpers/fixtures";

describe("E2E: Security - Malicious Attack Patterns", () => {
  beforeAll(async () => {
    await buildSafeCommand();
  });

  describe("Command Injection Attacks", () => {
    test("should safely handle semicolon in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        // Shell metacharacters are treated as literal strings, not executed
        const result = await runSafeCommand(
          ["echo", "safe; rm -rf /"],
          tempDir,
        );

        // This matches "safe*" pattern and is SAFE because the entire string
        // is a single argument - no shell interpretation occurs
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("safe; rm -rf /");
      } finally {
        cleanup();
      }
    });

    test("should safely handle pipe in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe | cat /etc/passwd"],
          tempDir,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("safe | cat /etc/passwd");
      } finally {
        cleanup();
      }
    });

    test("should safely handle double ampersand in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe && rm -rf /"],
          tempDir,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("safe && rm -rf /");
      } finally {
        cleanup();
      }
    });

    test("should safely handle double pipe in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe || whoami"],
          tempDir,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("safe || whoami");
      } finally {
        cleanup();
      }
    });

    test("should safely handle backticks in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe`whoami`"],
          tempDir,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("safe`whoami`");
      } finally {
        cleanup();
      }
    });

    test("should safely handle $() substitution in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe$(whoami)"],
          tempDir,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("safe$(whoami)");
      } finally {
        cleanup();
      }
    });

    test("should safely handle output redirection in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe > /tmp/malicious"],
          tempDir,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("safe > /tmp/malicious");
      } finally {
        cleanup();
      }
    });

    test("should safely handle append redirection in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe >> /tmp/malicious"],
          tempDir,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("safe >> /tmp/malicious");
      } finally {
        cleanup();
      }
    });

    test("should block command injection with input redirection", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["cat", "< /etc/passwd"],
          tempDir,
        );

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });
  });

  describe("Path Traversal Attacks", () => {
    test("should block path traversal with ../", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["cat", "../../../../etc/passwd"],
          tempDir,
        );

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });

    test("should block path traversal in middle of path", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["cat", "safe/../../../etc/passwd"],
          tempDir,
        );

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });

    test("should block absolute path access", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["cat", "/etc/passwd"],
          tempDir,
        );

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });
  });

  describe("Special Character Attacks", () => {
    test("should handle newline character in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe\nmalicious"],
          tempDir,
        );

        // Newline should be treated as part of the argument
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });

    test("should handle tab character in arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe\tmalicious"],
          tempDir,
        );

        // Tab is part of the argument and matches "safe*" pattern
        expect(result.exitCode).toBe(0);
      } finally {
        cleanup();
      }
    });

    test("should handle null byte injection", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe\x00malicious"],
          tempDir,
        );

        // Null byte is part of the argument and matches "safe*" pattern
        expect(result.exitCode).toBe(0);
      } finally {
        cleanup();
      }
    });

    test("should handle carriage return character", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe\rmalicious"],
          tempDir,
        );

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });
  });

  describe("Regex Pattern Exploitation", () => {
    test("should correctly handle wildcard with dot character", async () => {
      const configContent = `commands:
  echo:
    patterns:
      - "test.*"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        // "test.*" means "test" + "." + "*" (any string)
        // So "test.abc" should match
        const result1 = await runSafeCommand(
          ["echo", "test.anything"],
          tempDir,
        );
        expect(result1.exitCode).toBe(0);

        // "testXmalicious" does NOT match (missing the dot)
        const result2 = await runSafeCommand(
          ["echo", "testXmalicious"],
          tempDir,
        );
        expect(result2.exitCode).toBe(1);
      } finally {
        cleanup();
      }
    });

    test("should properly escape regex special characters in patterns", async () => {
      const configContent = `commands:
  echo:
    patterns:
      - "test[123]"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        // "test[123]" should match literally, not as character class
        const result1 = await runSafeCommand(
          ["echo", "test[123]"],
          tempDir,
        );
        expect(result1.exitCode).toBe(0);

        // Should NOT match "test1", "test2", or "test3"
        const result2 = await runSafeCommand(["echo", "test1"], tempDir);
        expect(result2.exitCode).toBe(1);
        expect(result2.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });

    test("should handle dollar sign in patterns", async () => {
      const configContent = `commands:
  echo:
    patterns:
      - "price$100"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        const result = await runSafeCommand(
          ["echo", "price$100"],
          tempDir,
        );
        expect(result.exitCode).toBe(0);
      } finally {
        cleanup();
      }
    });

    test("should handle parentheses in patterns", async () => {
      const configContent = `commands:
  echo:
    patterns:
      - "func(args)"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        const result = await runSafeCommand(
          ["echo", "func(args)"],
          tempDir,
        );
        expect(result.exitCode).toBe(0);
      } finally {
        cleanup();
      }
    });

    test("should handle plus sign in patterns", async () => {
      const configContent = `commands:
  echo:
    patterns:
      - "a+b"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        const result = await runSafeCommand(["echo", "a+b"], tempDir);
        expect(result.exitCode).toBe(0);
      } finally {
        cleanup();
      }
    });

    test("should handle question mark in patterns", async () => {
      const configContent = `commands:
  echo:
    patterns:
      - "hello?"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        // Should match exactly "hello?"
        const result1 = await runSafeCommand(["echo", "hello?"], tempDir);
        expect(result1.exitCode).toBe(0);

        // Should NOT match "hello" or "helloX"
        const result2 = await runSafeCommand(["echo", "hello"], tempDir);
        expect(result2.exitCode).toBe(1);
      } finally {
        cleanup();
      }
    });
  });

  describe("Boundary and Edge Cases", () => {
    test("should handle very long arguments", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        // Create a very long string (10000 characters)
        const longString = "safe" + "A".repeat(10000);
        const result = await runSafeCommand(["echo", longString], tempDir);

        // Should match pattern "safe*"
        expect(result.exitCode).toBe(0);
      } finally {
        cleanup();
      }
    });

    test("should handle empty arguments", async () => {
      const configContent = `commands:
  echo:
    patterns:
      - ""
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        const result = await runSafeCommand(["echo"], tempDir);
        // echo with no arguments should match empty pattern
        expect(result.exitCode).toBe(0);
      } finally {
        cleanup();
      }
    });

    test("should reject command with only spaces", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(["echo", "   "], tempDir);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });

    test("should handle Unicode characters", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe🚀日本語"],
          tempDir,
        );
        expect(result.exitCode).toBe(0);
      } finally {
        cleanup();
      }
    });

    test("should handle mixed special characters", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        const result = await runSafeCommand(
          ["echo", "safe!@#$%^&*()"],
          tempDir,
        );
        expect(result.exitCode).toBe(0);
      } finally {
        cleanup();
      }
    });
  });

  describe("Wildcard Pattern Abuse", () => {
    test("should demonstrate wildcard pattern matches path traversal", async () => {
      const configContent = `commands:
  echo:
    patterns:
      - "*.tmp"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        // WARNING: "*.tmp" DOES match "../../important.tmp"
        // This demonstrates that wildcard patterns need careful consideration
        // Overly permissive patterns can be dangerous
        const result = await runSafeCommand(
          ["echo", "../../important.tmp"],
          tempDir,
        );

        // This matches the pattern and is allowed by safe-command
        // Users should be careful with wildcard patterns
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("../../important.tmp");
      } finally {
        cleanup();
      }
    });

    test("should match wildcard correctly with multiple asterisks", async () => {
      const configContent = `commands:
  echo:
    patterns:
      - "a*b*c"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        const result1 = await runSafeCommand(["echo", "abc"], tempDir);
        expect(result1.exitCode).toBe(0);

        const result2 = await runSafeCommand(
          ["echo", "aXXXbYYYc"],
          tempDir,
        );
        expect(result2.exitCode).toBe(0);

        const result3 = await runSafeCommand(["echo", "ab"], tempDir);
        expect(result3.exitCode).toBe(1);
      } finally {
        cleanup();
      }
    });
  });

  describe("Configuration Bypass Attempts", () => {
    test("should not allow unconfigured commands", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        // 'rm' is not configured
        const result = await runSafeCommand(["rm", "-rf", "/"], tempDir);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not configured");
      } finally {
        cleanup();
      }
    });

    test("should not allow command name injection", async () => {
      const { tempDir, cleanup } = setupFixture("security-config.yaml");

      try {
        // Try to inject command in the command name itself
        const result = await runSafeCommand(
          ["echo;rm", "-rf", "/"],
          tempDir,
        );
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not configured");
      } finally {
        cleanup();
      }
    });
  });

  describe("AWS-Specific Attack Patterns", () => {
    test("should block dangerous AWS commands", async () => {
      const configContent = `commands:
  aws:
    patterns:
      - "s3 ls*"
      - "* get-*"
      - "* describe-*"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        // Try to use destructive command
        const result = await runSafeCommand(
          ["aws", "s3", "rm", "--recursive", "s3://bucket"],
          tempDir,
        );
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });

    test("should block AWS IAM modifications", async () => {
      const configContent = `commands:
  aws:
    patterns:
      - "* get-*"
      - "* list-*"
      - "* describe-*"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        const result = await runSafeCommand(
          ["aws", "iam", "create-user", "--user-name", "malicious"],
          tempDir,
        );
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("not allowed");
      } finally {
        cleanup();
      }
    });

    test("should allow safe AWS read-only commands", async () => {
      const configContent = `commands:
  aws:
    patterns:
      - "* get-*"
      - "* list-*"
      - "* describe-*"
`;
      const { tempDir, cleanup } = setupCustomFixture(configContent);

      try {
        const result = await runSafeCommand(
          ["aws", "ec2", "describe-instances"],
          tempDir,
        );
        // This should be allowed (assuming aws CLI is installed)
        // If aws is not installed, it will fail with command not found
        // but the safe-command should allow it
        expect(result.exitCode !== 1 || !result.stderr.includes("not allowed")).toBe(true);
      } finally {
        cleanup();
      }
    });
  });
});
