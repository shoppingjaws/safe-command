/**
 * Configuration validation command
 *
 * Validates safe-command.yaml syntax and patterns for common issues.
 */

import type { SafeCommandConfig } from "./config";
import { loadConfig } from "./config";

interface ValidationIssue {
	type: "error" | "warning" | "info";
	message: string;
}

/**
 * Validate a configuration object
 *
 * @param config - Configuration to validate
 * @returns Array of validation issues
 */
function validateConfigStructure(config: SafeCommandConfig): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Check if there are any commands configured
	const commandNames = Object.keys(config.commands);
	if (commandNames.length === 0) {
		issues.push({
			type: "warning",
			message: "No commands configured. All commands will be denied.",
		});
		return issues;
	}

	// Count total patterns
	let totalPatterns = 0;

	// Validate each command
	for (const [commandName, commandConfig] of Object.entries(config.commands)) {
		const patterns = commandConfig.patterns;

		// Check for empty patterns
		if (patterns.length === 0) {
			issues.push({
				type: "warning",
				message: `Command '${commandName}' has no patterns. All ${commandName} commands will be denied.`,
			});
			continue;
		}

		totalPatterns += patterns.length;

		// Check for overly permissive patterns
		for (const pattern of patterns) {
			// Check for empty pattern strings first
			if (pattern.trim().length === 0) {
				issues.push({
					type: "error",
					message: `Command '${commandName}' has empty pattern.`,
				});
				continue;
			}

			// Check for single wildcard
			if (pattern === "*") {
				issues.push({
					type: "warning",
					message: `Command '${commandName}' has overly permissive pattern '*' - allows ALL ${commandName} commands.`,
				});
			}

			// Check for patterns that are too broad
			if (pattern === "* *") {
				issues.push({
					type: "warning",
					message: `Command '${commandName}' has overly permissive pattern '* *' - allows most ${commandName} commands.`,
				});
			}

			// Check for dangerous AWS patterns
			if (commandName === "aws") {
				if (pattern.includes("delete-") || pattern === "* delete-*") {
					issues.push({
						type: "warning",
						message: `AWS pattern '${pattern}' allows delete operations - use with extreme caution.`,
					});
				}
				if (pattern.includes("terminate-") || pattern === "* terminate-*") {
					issues.push({
						type: "warning",
						message: `AWS pattern '${pattern}' allows terminate operations - use with extreme caution.`,
					});
				}
				if (
					pattern.includes("remove-") ||
					pattern === "* remove-*" ||
					pattern.includes("destroy-")
				) {
					issues.push({
						type: "warning",
						message: `AWS pattern '${pattern}' allows destructive operations - use with extreme caution.`,
					});
				}
			}

			// Check for dangerous Kubernetes patterns
			if (commandName === "kubectl") {
				if (pattern.startsWith("delete ") || pattern === "delete *") {
					issues.push({
						type: "warning",
						message: `kubectl pattern '${pattern}' allows delete operations - use with extreme caution.`,
					});
				}
			}

			// Check for dangerous Terraform patterns
			if (commandName === "terraform") {
				if (pattern.startsWith("destroy")) {
					issues.push({
						type: "warning",
						message: `terraform pattern '${pattern}' allows destroy operations - use with extreme caution.`,
					});
				}
			}
		}
	}

	// Add info about configuration
	issues.push({
		type: "info",
		message: `Found ${commandNames.length} command(s) with ${totalPatterns} pattern(s) total.`,
	});

	return issues;
}

/**
 * Run configuration validation
 *
 * @returns Exit code (0 for success, 1 for errors)
 */
export function runValidate(): number {
	try {
		// Load configuration
		const config = loadConfig();

		// Validate configuration
		const issues = validateConfigStructure(config);

		// Display results
		const hasErrors = issues.some((issue) => issue.type === "error");
		const hasWarnings = issues.some((issue) => issue.type === "warning");

		if (hasErrors) {
			console.log("❌ Configuration validation FAILED\n");
		} else if (hasWarnings) {
			console.log("⚠️  Configuration is valid with warnings\n");
		} else {
			console.log("✅ Configuration is valid\n");
		}

		// Group and display issues
		const errors = issues.filter((i) => i.type === "error");
		const warnings = issues.filter((i) => i.type === "warning");
		const infos = issues.filter((i) => i.type === "info");

		if (errors.length > 0) {
			console.log("Errors:");
			for (const error of errors) {
				console.log(`  ❌ ${error.message}`);
			}
			console.log();
		}

		if (warnings.length > 0) {
			console.log("Warnings:");
			for (const warning of warnings) {
				console.log(`  ⚠️  ${warning.message}`);
			}
			console.log();
		}

		if (infos.length > 0) {
			console.log("Information:");
			for (const info of infos) {
				console.log(`  ℹ️  ${info.message}`);
			}
			console.log();
		}

		// Display command summary
		console.log("Configured commands:");
		for (const [commandName, commandConfig] of Object.entries(
			config.commands,
		)) {
			console.log(
				`  - ${commandName} (${commandConfig.patterns.length} patterns)`,
			);
		}

		return hasErrors ? 1 : 0;
	} catch (error) {
		console.error("❌ Configuration validation FAILED\n");
		console.error(
			"Error:",
			error instanceof Error ? error.message : String(error),
		);
		return 1;
	}
}
