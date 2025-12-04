/**
 * Configuration file integrity management
 *
 * Tracks SHA-256 hashes of configuration files to detect unauthorized changes.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { GLOBAL_CONFIG_PATH } from "./config.js";

/**
 * Integrity record for a single configuration file
 */
export type IntegrityRecord = {
	path: string;
	hash: string;
	lastModified: string; // ISO 8601 timestamp
};

/**
 * Integrity records file path
 */
export const INTEGRITY_FILE_PATH = join(
	homedir(),
	".config",
	"safe-command",
	"integrity.json",
);

/**
 * Local project configuration file path
 */
export const LOCAL_CONFIG_PATH = "./safe-command.yaml";

/**
 * Calculate SHA-256 hash of a file
 *
 * @param filePath - Path to the file
 * @returns SHA-256 hash in hexadecimal format
 */
export function calculateHash(filePath: string): string {
	const content = readFileSync(filePath, "utf-8");
	return createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Get all existing configuration files
 *
 * @returns Array of configuration file paths that exist
 */
export function getAllConfigFiles(): string[] {
	const paths: string[] = [];

	if (existsSync(LOCAL_CONFIG_PATH)) {
		paths.push(LOCAL_CONFIG_PATH);
	}

	if (existsSync(GLOBAL_CONFIG_PATH)) {
		paths.push(GLOBAL_CONFIG_PATH);
	}

	return paths;
}

/**
 * Load integrity records from file
 *
 * @returns Map of file path to integrity record, or null if file doesn't exist
 */
export function loadIntegrityRecords(): Map<string, IntegrityRecord> | null {
	if (!existsSync(INTEGRITY_FILE_PATH)) {
		return null;
	}

	try {
		const content = readFileSync(INTEGRITY_FILE_PATH, "utf-8");
		const records = JSON.parse(content) as IntegrityRecord[];

		const map = new Map<string, IntegrityRecord>();
		for (const record of records) {
			map.set(record.path, record);
		}

		return map;
	} catch (error) {
		throw new Error(
			`Failed to load integrity records from ${INTEGRITY_FILE_PATH}\n${error}`,
		);
	}
}

/**
 * Save integrity records to file
 *
 * @param records - Map of file path to integrity record
 */
export function saveIntegrityRecords(
	records: Map<string, IntegrityRecord>,
): void {
	const recordsArray = Array.from(records.values());

	// Ensure directory exists
	const dir = dirname(INTEGRITY_FILE_PATH);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	try {
		const content = JSON.stringify(recordsArray, null, 2);
		writeFileSync(INTEGRITY_FILE_PATH, content, "utf-8");
	} catch (error) {
		throw new Error(
			`Failed to save integrity records to ${INTEGRITY_FILE_PATH}\n${error}`,
		);
	}
}

/**
 * Verification result
 */
export type VerificationResult = {
	valid: boolean;
	errors: string[];
	changedFiles: string[];
	newFiles: string[];
	isFirstRun: boolean;
};

/**
 * Verify integrity of all configuration files
 *
 * @returns Verification result
 */
export function verifyIntegrity(): VerificationResult {
	const records = loadIntegrityRecords();
	const configFiles = getAllConfigFiles();

	// First run - no integrity records exist
	if (!records) {
		return {
			valid: true,
			errors: [],
			changedFiles: [],
			newFiles: configFiles,
			isFirstRun: true,
		};
	}

	const errors: string[] = [];
	const changedFiles: string[] = [];
	const newFiles: string[] = [];

	// Check each existing config file
	for (const filePath of configFiles) {
		const currentHash = calculateHash(filePath);
		const record = records.get(filePath);

		if (!record) {
			// New file detected
			newFiles.push(filePath);
			errors.push(
				`New configuration file detected: ${filePath}\n` +
					`  Run 'safe-command approve' to approve this file`,
			);
		} else if (record.hash !== currentHash) {
			// File has been modified
			changedFiles.push(filePath);
			errors.push(
				`Configuration file has been modified: ${filePath}\n` +
					`  Expected hash: ${record.hash.substring(0, 16)}...\n` +
					`  Current hash:  ${currentHash.substring(0, 16)}...\n` +
					`  Run 'safe-command approve' to approve these changes`,
			);
		}
	}

	// Check for deleted files (tracked but no longer exist)
	for (const [filePath] of records) {
		if (!existsSync(filePath)) {
			errors.push(`Configuration file has been deleted: ${filePath}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		changedFiles,
		newFiles,
		isFirstRun: false,
	};
}

/**
 * Update integrity records for all existing configuration files
 *
 * @returns Map of updated integrity records
 */
export function updateIntegrityRecords(): Map<string, IntegrityRecord> {
	const configFiles = getAllConfigFiles();
	const records = new Map<string, IntegrityRecord>();

	for (const filePath of configFiles) {
		const hash = calculateHash(filePath);
		records.set(filePath, {
			path: filePath,
			hash,
			lastModified: new Date().toISOString(),
		});
	}

	return records;
}
