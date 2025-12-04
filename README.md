# safe-command

> A proxy tool to safely restrict commands that AI agents can execute

[![npm version](https://img.shields.io/npm/v/safe-command.svg)](https://www.npmjs.com/package/safe-command)
[![CI](https://github.com/shoppingjaws/safe-command/actions/workflows/ci.yaml/badge.svg)](https://github.com/shoppingjaws/safe-command/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-black)](https://bun.sh)

## 🎯 Overview

**safe-command** acts as a secure proxy between AI agents (like Claude Code) and system commands. It uses pattern-based allowlists to ensure only explicitly permitted commands can be executed, preventing potentially dangerous operations.

### Why safe-command?

AI coding assistants are powerful, but giving them unrestricted command execution access can be risky. Tools like Claude Code don't support granular command restrictions (e.g., `Bash(aws * get-:*)` syntax doesn't work). safe-command solves this by:

- ✅ **Allowlist-based**: Only explicitly permitted patterns can run (secure by default)
- ✅ **Wildcard support**: Flexible pattern matching with `*`
- ✅ **Simple configuration**: Easy-to-read YAML files
- ✅ **Zero runtime overhead**: Compiled to a single binary
- ✅ **Transparent**: Preserves stdout/stderr and exit codes
- ✅ **Dry-run mode**: Test commands without executing them

## 🚀 Quick Start

### 1. Install

```bash
# Clone the repository
git clone https://github.com/your-username/safe-command.git
cd safe-command

# Install dependencies
bun install

# Build the binary
bun run build
```

### 2. Create Configuration

Create `safe-command.yaml` in your project root:

```yaml
commands:
  aws:
    patterns:
      # Read-only operations (recommended)
      - "* list-*"
      - "* get-*"
      - "* describe-*"
      - "s3 ls*"
      - "sts get-caller-identity"
```

### 3. Run Commands

```bash
# Allowed command ✅ (recommended: use 'exec' subcommand)
./safe-command exec -- aws s3 ls

# Test with dry-run ✅
./safe-command exec --dry-run -- aws s3 ls
# Output: [DRY RUN] Would execute: aws s3 ls

# Blocked command ❌
./safe-command exec -- aws s3 rm s3://bucket/file.txt
# Error: Command not allowed: aws s3 rm s3://bucket/file.txt

# Legacy format (still supported) ✅
./safe-command -- aws s3 ls
```

## 📚 Usage

### Command Syntax

```bash
# Recommended: Use 'exec' subcommand (safer for AI agents)
safe-command exec [options] -- <command> [args...]

# Legacy format (still supported)
safe-command [options] -- <command> [args...]

# Admin commands
safe-command init [--force]     # Initialize configuration
safe-command approve            # Approve configuration changes
```

### Options

- `--dry-run`: Show what command would be executed without running it
- `-h, --help`: Show help message

### Examples

```bash
# AWS CLI commands (recommended: use 'exec')
./safe-command exec -- aws s3 ls
./safe-command exec -- aws ec2 describe-instances --region us-east-1
./safe-command exec -- aws sts get-caller-identity

# Dry-run mode (test without executing)
./safe-command exec --dry-run -- aws s3 ls
# Output: [DRY RUN] Would execute: aws s3 ls

# Other commands (configure in YAML)
./safe-command exec -- kubectl get pods
./safe-command exec -- terraform plan

# Legacy format (still works)
./safe-command -- aws s3 ls
```

### Dry-Run Mode

Use the `--dry-run` flag to test commands without actually executing them. This is useful for:

- **Testing configuration patterns**: Verify if a command would be allowed or blocked
- **Debugging**: See what command would be executed
- **Safe testing**: Test potentially dangerous commands without risk
- **Configuration development**: Iterate on patterns without side effects

```bash
# Test if a command is allowed (using exec subcommand)
./safe-command exec --dry-run -- aws s3 rm s3://bucket/file.txt

# If the command is blocked, you'll see:
# Error: Command not allowed: aws s3 rm s3://bucket/file.txt

# If the command is allowed, you'll see:
# [DRY RUN] Would execute: aws s3 rm s3://bucket/file.txt
```

### Configuration

Configuration files are searched in the following order:

1. `./safe-command.yaml` (project-specific)
2. `~/.config/safe-command/safe-command.yaml` (global)

#### Configuration Example

```yaml
commands:
  aws:
    patterns:
      # Wildcard patterns
      - "* list-*"           # Any service's list- commands
      - "* get-*"            # Any service's get- commands
      - "* describe-*"       # Any service's describe- commands

      # Specific commands
      - "s3 ls*"             # S3 list with any args
      - "ec2 describe-instances"  # Exact match
      - "sts get-caller-identity"

      # Write operations (use with caution!)
      # - "s3 cp*"
      # - "s3 sync*"

  kubectl:
    patterns:
      - "get *"
      - "describe *"

  terraform:
    patterns:
      - "plan*"
      - "show*"
      - "state list*"
```

### Pattern Matching Rules

| Pattern | Matches | Example |
|---------|---------|---------|
| `s3 ls` | Exact match | `s3 ls` ✅ `s3 ls s3://bucket` ❌ |
| `s3 ls*` | Prefix match | `s3 ls` ✅ `s3 ls s3://bucket` ✅ |
| `* describe-*` | Wildcard both | `ec2 describe-instances` ✅ `rds describe-db-instances` ✅ |
| `ec2 describe-instances` | Exact | `ec2 describe-instances` ✅ `ec2 describe-instances --region us-east-1` ❌ |

## 🔧 Development

### Prerequisites

- [Bun](https://bun.sh) v1.0.0 or later

### Setup

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev exec -- aws s3 ls

# Run linter
bunx biome check src/

# Auto-fix linting issues
bunx biome check --write src/
```

### Build

```bash
# Build compiled binary
bun run build

# Binary will be created at ./safe-command
```

### Project Structure

```
safe-command/
├── src/
│   ├── index.ts        # Entry point and CLI
│   ├── config.ts       # Configuration file loader
│   ├── matcher.ts      # Pattern matching logic
│   ├── executor.ts     # Command execution
│   └── init.ts         # Init command
├── examples/
│   └── safe-command.yaml  # Example configuration
├── SPEC.md             # Technical specification
└── README.md
```

## 🔒 Security Best Practices

### 1. Start with Read-Only Commands

```yaml
commands:
  aws:
    patterns:
      - "* list-*"
      - "* get-*"
      - "* describe-*"
```

### 2. Be Specific with Write Operations

```yaml
# ❌ Too permissive
patterns:
  - "*"

# ✅ Specific and safe
patterns:
  - "s3 cp s3://safe-bucket/*"
```

### 3. Use Project-Specific Configs

Keep sensitive configurations in project-specific `./safe-command.yaml` files, not global configs.

### 4. Review Patterns Regularly

Audit your allowlist patterns periodically to ensure they still match your security requirements.

### 5. Use Dry-Run for Testing

Always test new patterns with `--dry-run` before executing:

```bash
# Test the pattern first
./safe-command exec --dry-run -- aws s3 cp file.txt s3://bucket/

# If allowed and safe, run for real
./safe-command exec -- aws s3 cp file.txt s3://bucket/
```

## 🤝 Use with AI Agents

### Claude Code

When using with Claude Code or similar AI coding assistants, safe-command provides an extra security layer:

```bash
# Instead of allowing direct AWS commands
# claude-code: aws s3 rm s3://production-data

# Use safe-command exec as a proxy
# claude-code: safe-command exec -- aws s3 ls s3://production-data
```

The AI can only execute commands that match your allowlist patterns.

### ⚠️ CRITICAL: Security Configuration for AI Agents

**ONLY allow `safe-command exec` for AI agents. NEVER allow the bare `safe-command` command.**

❌ **WRONG** - This allows AI to approve config changes:
```bash
# Claude Code configuration - DON'T DO THIS
Bash(safe-command:*)  # Allows 'safe-command approve' - SECURITY RISK!
```

✅ **CORRECT** - Only allow exec subcommand:
```bash
# Claude Code configuration
Bash(safe-command exec:*)  # Only allows 'safe-command exec --' commands
```

**Why this matters:**
- `safe-command approve` updates integrity records, allowing config changes
- If an AI can run `safe-command approve`, it can bypass security restrictions
- By only allowing `safe-command exec`, you ensure the AI can only execute commands, not modify security policies

**Example safe configuration in Claude Code's allowed commands:**
```
Bash(safe-command exec:*)
```

This ensures:
- ✅ AI can run: `safe-command exec -- aws s3 ls`
- ✅ AI can run: `safe-command exec --dry-run -- aws s3 cp ...`
- ❌ AI cannot run: `safe-command approve`
- ❌ AI cannot run: `safe-command init`

## ⚠️ Important Notes

### Bun Runtime Limitation

**Do NOT run scripts directly with Bun**. The `--` delimiter is consumed by Bun's argument parser:

```bash
# ❌ Does NOT work
bun src/index.ts exec -- aws s3 ls
bun src/index.ts -- aws s3 ls

# ❌ Does NOT work
./src/index.ts exec -- aws s3 ls
./src/index.ts -- aws s3 ls

# ✅ WORKS - Use compiled binary
./safe-command exec -- aws s3 ls
./safe-command -- aws s3 ls  # legacy format
```

**Solution**: Always use the compiled binary (`bun run build`).

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (enforced by Biome)
- Add tests for new features
- Update documentation as needed
- Ensure `bunx biome check src/` passes

## 🐛 Issues

Found a bug? Have a feature request? Please [open an issue](https://github.com/your-username/safe-command/issues).

## 📖 Documentation

- [SPEC.md](SPEC.md) - Technical specification and architecture
- [examples/safe-command.yaml](examples/safe-command.yaml) - Configuration examples

## 🌟 Acknowledgments

Built with [Bun](https://bun.sh) - a fast all-in-one JavaScript runtime.
