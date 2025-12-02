/**
 * Initialize global configuration
 *
 * Creates a default safe-command.yaml configuration file in the user's home directory.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Default configuration template
 * Based on examples/safe-command.yaml
 */
const DEFAULT_CONFIG = `# safe-command Configuration Example
#
# This file defines which commands can be executed through safe-command.
# By default, ALL commands are DENIED unless explicitly allowed here.
#
# Copy this file to:
#   - ./safe-command.yaml (project root, recommended)
#   - ~/.config/safe-command/safe-command.yaml (global)

commands:
  # AWS CLI command patterns
  aws:
    patterns:
      # ============================================
      # Read-only operations (推奨: AIエージェント向け)
      # ============================================

      # 汎用的な読み取りコマンド
      - "* list-*"      # 任意のサービスの list- コマンド (例: s3 list-buckets, ec2 list-instances)
      - "* get-*"       # 任意のサービスの get- コマンド (例: s3 get-object, ssm get-parameter)
      - "* describe-*"  # 任意のサービスの describe- コマンド (例: ec2 describe-instances)

      # S3 読み取り操作
      - "s3 ls*"        # バケット/オブジェクト一覧 (例: s3 ls, s3 ls s3://my-bucket)

      # Identity 確認
      - "sts get-caller-identity"  # 現在のIAMユーザー/ロール確認

      # CloudWatch Logs
      - "logs filter-*" # ログのフィルタリング

      # ============================================
      # 書き込み操作 (慎重に使用してください)
      # ============================================
      # 以下は書き込みコマンドの例です
      # 必要な場合のみコメントアウトを解除してください

      # S3 書き込み操作
      # - "s3 cp*"      # S3へのファイルコピー
      # - "s3 sync*"    # S3とのファイル同期
      # - "s3 rm*"      # S3からのファイル削除

      # EC2 操作
      # - "ec2 start-instances*"    # EC2インスタンス起動
      # - "ec2 stop-instances*"     # EC2インスタンス停止
      # - "ec2 run-instances*"      # 新しいEC2インスタンス起動

      # Lambda 操作
      # - "lambda invoke*"          # Lambda関数の実行

      # ============================================
      # 危険な操作 (本番環境では絶対に許可しないでください)
      # ============================================
      # - "* delete-*"  # リソースの削除
      # - "* remove-*"  # リソースの削除
      # - "* terminate-*"  # リソースの終了

# ============================================
# 将来の拡張 (Phase 2+)
# ============================================
# 他のコマンドも追加可能です
#
# kubectl:
#   patterns:
#     - "get *"
#     - "describe *"
#
# terraform:
#   patterns:
#     - "plan*"
#     - "show*"
#     - "state list*"
`;

/**
 * Initialize global configuration
 *
 * @param configPath - Path to the configuration file
 * @param force - Force overwrite if file already exists
 * @throws Error if configuration already exists and force is false
 */
export function initCommand(configPath: string, force: boolean): void {
	// Check if file already exists
	if (existsSync(configPath) && !force) {
		throw new Error(
			`Configuration file already exists: ${configPath}\n` +
				`Use --force to overwrite the existing configuration.`,
		);
	}

	// Create directory if it doesn't exist
	const configDir = dirname(configPath);
	if (!existsSync(configDir)) {
		mkdirSync(configDir, { recursive: true });
		console.log(`Created directory: ${configDir}`);
	}

	// Write default configuration
	writeFileSync(configPath, DEFAULT_CONFIG, "utf-8");

	if (force && existsSync(configPath)) {
		console.log(`Configuration file overwritten: ${configPath}`);
	} else {
		console.log(`Configuration file created: ${configPath}`);
	}

	console.log("\nGlobal configuration has been initialized successfully!");
	console.log("\nYou can now use safe-command with the default configuration.");
	console.log("To customize the configuration, edit the file at:", configPath);
}
