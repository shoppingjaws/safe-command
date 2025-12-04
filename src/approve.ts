/**
 * Configuration approval command
 *
 * Allows users to explicitly approve configuration file changes
 * by updating the integrity records.
 */

import * as readline from "node:readline";
import {
	verifyIntegrity,
	updateIntegrityRecords,
	saveIntegrityRecords,
	getAllConfigFiles,
	loadIntegrityRecords,
} from "./integrity.js";

/**
 * Prompt user for yes/no confirmation
 *
 * @param question - Question to ask the user
 * @returns Promise that resolves to true if user answered yes, false otherwise
 */
async function confirm(question: string): Promise<boolean> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(`${question} (yes/no): `, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
		});
	});
}

/**
 * Display configuration file status
 */
function displayStatus(): void {
	const configFiles = getAllConfigFiles();
	const result = verifyIntegrity();

	if (configFiles.length === 0) {
		console.error("❌ No configuration files found");
		console.error("\nPlease create a safe-command.yaml file first.");
		console.error("See examples/ for sample configuration.");
		process.exit(1);
	}

	console.log("📋 Configuration Files:");
	console.log("");

	for (const filePath of configFiles) {
		console.log(`  ${filePath}`);
	}

	console.log("");

	if (result.isFirstRun) {
		console.log("ℹ️  This is the first run - no integrity records exist yet");
		console.log("");
		return;
	}

	if (result.valid) {
		console.log("✅ All configuration files are approved and unchanged");
		console.log("");
		const records = loadIntegrityRecords();
		if (records) {
			console.log("Current integrity records:");
			for (const [path, record] of records) {
				console.log(`  ${path}`);
				console.log(`    Hash: ${record.hash.substring(0, 16)}...`);
				console.log(`    Last approved: ${record.lastModified}`);
			}
		}
		console.log("");
		return;
	}

	// Display changes
	console.log("⚠️  Configuration Changes Detected:");
	console.log("");

	if (result.newFiles.length > 0) {
		console.log("  New files:");
		for (const file of result.newFiles) {
			console.log(`    + ${file}`);
		}
		console.log("");
	}

	if (result.changedFiles.length > 0) {
		console.log("  Modified files:");
		for (const file of result.changedFiles) {
			console.log(`    ~ ${file}`);
		}
		console.log("");
	}
}

/**
 * Run the approve command
 */
export async function runApprove(): Promise<void> {
	console.log("safe-command approve");
	console.log("====================");
	console.log("");

	displayStatus();

	const result = verifyIntegrity();

	// If already valid and not first run, ask if user wants to re-approve
	if (result.valid && !result.isFirstRun) {
		const shouldContinue = await confirm(
			"Configuration is already approved. Re-approve anyway?",
		);
		if (!shouldContinue) {
			console.log("\n✋ Approval cancelled");
			process.exit(0);
		}
	}

	// Ask for confirmation
	const message = result.isFirstRun
		? "Approve these configuration files?"
		: "Approve these changes?";

	console.log("⚠️  WARNING:");
	console.log(
		"   By approving, you confirm that you have reviewed the configuration",
	);
	console.log(
		"   and trust that all command patterns are safe and intentional.",
	);
	console.log("");

	const approved = await confirm(message);

	if (!approved) {
		console.log("\n✋ Approval cancelled");
		process.exit(0);
	}

	// Update integrity records
	try {
		const records = updateIntegrityRecords();
		saveIntegrityRecords(records);

		console.log("\n✅ Configuration approved successfully");
		console.log("");
		console.log("Updated integrity records:");
		for (const [path, record] of records) {
			console.log(`  ${path}`);
			console.log(`    Hash: ${record.hash.substring(0, 16)}...`);
			console.log(`    Approved: ${record.lastModified}`);
		}
		console.log("");
		console.log("You can now run safe-command with these configurations.");
	} catch (error) {
		console.error("\n❌ Failed to save integrity records");
		console.error(`   ${error}`);
		process.exit(1);
	}
}
