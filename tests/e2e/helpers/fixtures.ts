import { mkdtempSync, rmSync, copyFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Creates a temporary directory with a test fixture configuration
 * @param fixtureName Name of the fixture file (e.g., 'basic-config.yaml')
 * @returns Object with temp directory path and cleanup function
 */
export function setupFixture(fixtureName: string): {
  tempDir: string;
  configPath: string;
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

  // Return temp directory path and cleanup function
  return {
    tempDir,
    configPath,
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
 * @returns Object with temp directory path and cleanup function
 */
export function setupCustomFixture(configContent: string): {
  tempDir: string;
  configPath: string;
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

  return {
    tempDir,
    configPath,
    cleanup: () => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
      }
    },
  };
}
