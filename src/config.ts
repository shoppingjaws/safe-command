/**
 * Configuration file loader
 *
 * Loads and validates safe-command.yaml configuration file.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as yaml from 'js-yaml';

/**
 * Configuration schema
 */
export type SafeCommandConfig = {
  commands: {
    [commandName: string]: {
      patterns: string[];
    };
  };
};

/**
 * Configuration file search paths (in order of priority)
 */
const CONFIG_PATHS = [
  './safe-command.yaml',
  join(homedir(), '.config', 'safe-command', 'safe-command.yaml'),
];

/**
 * Find configuration file
 *
 * @returns Path to the configuration file, or null if not found
 */
function findConfigFile(): string | null {
  for (const path of CONFIG_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Validate configuration structure
 *
 * @param config - Configuration object to validate
 * @throws Error if configuration is invalid
 */
function validateConfig(config: any): asserts config is SafeCommandConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }

  if (!config.commands || typeof config.commands !== 'object') {
    throw new Error('Configuration must have a "commands" object');
  }

  for (const [commandName, commandConfig] of Object.entries(config.commands)) {
    if (!commandConfig || typeof commandConfig !== 'object') {
      throw new Error(`Command "${commandName}" must be an object`);
    }

    const cmd = commandConfig as any;
    if (!Array.isArray(cmd.patterns)) {
      throw new Error(`Command "${commandName}" must have a "patterns" array`);
    }

    if (!cmd.patterns.every((p: any) => typeof p === 'string')) {
      throw new Error(`All patterns in "${commandName}" must be strings`);
    }
  }
}

/**
 * Load configuration from file
 *
 * @returns Parsed and validated configuration
 * @throws Error if configuration file is not found or invalid
 */
export function loadConfig(): SafeCommandConfig {
  const configPath = findConfigFile();

  if (!configPath) {
    throw new Error(
      `Configuration file not found\n` +
      `Searched locations:\n` +
      CONFIG_PATHS.map(p => `  - ${p}`).join('\n') +
      `\n\n` +
      `Please create a configuration file. See examples/ for sample configuration.`
    );
  }

  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read configuration file: ${configPath}\n${error}`);
  }

  let config: any;
  try {
    config = yaml.load(content);
  } catch (error) {
    throw new Error(
      `Failed to parse ${configPath}\n` +
      `${error}\n\n` +
      `Please check your YAML syntax.`
    );
  }

  validateConfig(config);

  return config;
}

/**
 * Get command configuration
 *
 * @param config - Configuration object
 * @param commandName - Command name (e.g., "aws")
 * @returns Command configuration, or null if not found
 */
export function getCommandConfig(
  config: SafeCommandConfig,
  commandName: string
): { patterns: string[] } | null {
  return config.commands[commandName] || null;
}
