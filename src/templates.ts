/**
 * Configuration templates for different use cases
 *
 * Provides pre-built configuration templates for common command-line tools.
 */

export type TemplateName =
	| "aws-readonly"
	| "aws-dev"
	| "kubernetes"
	| "terraform"
	| "docker"
	| "multi-command";

export interface Template {
	name: TemplateName;
	description: string;
	content: string;
}

/**
 * AWS read-only template
 * Safe patterns for read-only AWS operations
 */
const AWS_READONLY_TEMPLATE = `# safe-command Configuration
# Template: AWS Read-Only
#
# This configuration allows only read-only AWS CLI commands.
# Ideal for AI agents that need to inspect AWS resources without making changes.

commands:
  aws:
    patterns:
      # Generic read-only patterns
      - "* list-*"      # List commands (e.g., s3 list-buckets, ec2 list-instances)
      - "* get-*"       # Get commands (e.g., s3 get-object, ssm get-parameter)
      - "* describe-*"  # Describe commands (e.g., ec2 describe-instances)

      # S3 read operations
      - "s3 ls*"        # List buckets/objects

      # Identity verification
      - "sts get-caller-identity"  # Check current IAM user/role

      # CloudWatch Logs
      - "logs filter-*" # Filter logs
      - "logs tail*"    # Tail logs
`;

/**
 * AWS development template
 * Includes read operations and some safe write operations for development
 */
const AWS_DEV_TEMPLATE = `# safe-command Configuration
# Template: AWS Development
#
# This configuration allows read operations plus common development operations.
# Suitable for development environments with controlled AWS access.

commands:
  aws:
    patterns:
      # Read-only operations
      - "* list-*"
      - "* get-*"
      - "* describe-*"
      - "s3 ls*"
      - "sts get-caller-identity"
      - "logs filter-*"
      - "logs tail*"

      # S3 operations (for dev buckets)
      - "s3 cp*"        # Copy files to/from S3
      - "s3 sync*"      # Sync directories with S3
      - "s3 mb*"        # Make bucket
      - "s3 rb*"        # Remove bucket

      # Lambda operations
      - "lambda invoke*"          # Invoke Lambda functions
      - "lambda update-function-code*"  # Update function code

      # ECR operations
      - "ecr get-login-password*"
      - "ecr describe-repositories*"

      # Note: Consider restricting to dev resources with resource-specific patterns
      # Example: - "s3 cp * s3://dev-*/*"
`;

/**
 * Kubernetes template
 * Safe patterns for Kubernetes operations
 */
const KUBERNETES_TEMPLATE = `# safe-command Configuration
# Template: Kubernetes
#
# This configuration allows safe Kubernetes operations.
# Focuses on read-only and non-destructive operations.

commands:
  kubectl:
    patterns:
      # Read operations
      - "get *"         # Get resources
      - "describe *"    # Describe resources
      - "logs *"        # View logs
      - "top *"         # Resource usage
      - "explain *"     # Explain resource types

      # Configuration operations
      - "config *"      # Manage kubeconfig

      # Non-destructive operations
      - "diff *"        # Show differences
      - "api-resources*"  # List API resources
      - "api-versions*"   # List API versions
      - "cluster-info*"   # Display cluster info
      - "version*"        # Display version

      # Potentially destructive operations (commented out by default)
      # - "apply *"     # Apply configuration
      # - "create *"    # Create resources
      # - "delete *"    # Delete resources
      # - "scale *"     # Scale resources
      # - "rollout *"   # Manage rollouts
`;

/**
 * Terraform template
 * Safe patterns for Terraform operations
 */
const TERRAFORM_TEMPLATE = `# safe-command Configuration
# Template: Terraform
#
# This configuration allows Terraform operations with focus on planning and inspection.
# Apply operations are commented out for safety.

commands:
  terraform:
    patterns:
      # Safe operations
      - "version*"      # Show version
      - "init*"         # Initialize working directory
      - "validate*"     # Validate configuration
      - "fmt*"          # Format configuration
      - "plan*"         # Show execution plan
      - "show*"         # Show state or plan
      - "output*"       # Show output values
      - "providers*"    # Show providers
      - "state list*"   # List resources in state
      - "state show*"   # Show resource in state
      - "workspace list*"  # List workspaces
      - "workspace show*"  # Show current workspace

      # Potentially destructive operations (commented out by default)
      # - "apply*"      # Apply changes
      # - "destroy*"    # Destroy infrastructure
      # - "import*"     # Import existing resources
      # - "taint*"      # Mark resource for recreation
      # - "state rm*"   # Remove items from state
      # - "workspace delete*"  # Delete workspace
`;

/**
 * Docker template
 * Safe patterns for Docker operations
 */
const DOCKER_TEMPLATE = `# safe-command Configuration
# Template: Docker
#
# This configuration allows Docker operations focused on inspection and management.
# Container/image deletion operations are commented out for safety.

commands:
  docker:
    patterns:
      # Container operations
      - "ps*"           # List containers
      - "logs *"        # View container logs
      - "inspect *"     # Inspect containers/images
      - "stats*"        # Display resource usage statistics
      - "top *"         # Display running processes

      # Image operations
      - "images*"       # List images
      - "history *"     # Show image history
      - "search *"      # Search Docker Hub

      # Network/volume operations
      - "network ls*"   # List networks
      - "network inspect *"  # Inspect network
      - "volume ls*"    # List volumes
      - "volume inspect *"   # Inspect volume

      # System operations
      - "version*"      # Show version
      - "info*"         # Display system information

      # Build operations (use with caution)
      # - "build*"      # Build images
      # - "pull *"      # Pull images
      # - "push *"      # Push images

      # Potentially destructive operations (commented out by default)
      # - "run *"       # Run containers
      # - "start *"     # Start containers
      # - "stop *"      # Stop containers
      # - "restart *"   # Restart containers
      # - "rm *"        # Remove containers
      # - "rmi *"       # Remove images
      # - "prune*"      # Remove unused resources
`;

/**
 * Multi-command template
 * Demonstrates configuration for multiple common tools
 */
const MULTI_COMMAND_TEMPLATE = `# safe-command Configuration
# Template: Multi-Command
#
# This configuration includes multiple commonly used command-line tools.
# Focuses on read-only and safe operations across all tools.

commands:
  # AWS CLI
  aws:
    patterns:
      - "* list-*"
      - "* get-*"
      - "* describe-*"
      - "s3 ls*"
      - "sts get-caller-identity"

  # Kubernetes
  kubectl:
    patterns:
      - "get *"
      - "describe *"
      - "logs *"
      - "top *"

  # Terraform
  terraform:
    patterns:
      - "plan*"
      - "show*"
      - "state list*"
      - "output*"
      - "validate*"

  # Docker
  docker:
    patterns:
      - "ps*"
      - "images*"
      - "logs *"
      - "inspect *"

  # GitHub CLI
  gh:
    patterns:
      - "repo view*"
      - "issue list*"
      - "pr list*"
      - "status*"

  # Google Cloud CLI
  gcloud:
    patterns:
      - "* list*"
      - "* describe*"
      - "config *"
      - "auth list*"

  # Git (for basic inspection)
  git:
    patterns:
      - "status*"
      - "log*"
      - "show*"
      - "diff*"
      - "branch*"
`;

/**
 * All available templates
 */
export const TEMPLATES: Record<TemplateName, Template> = {
	"aws-readonly": {
		name: "aws-readonly",
		description: "AWS read-only operations (safest for AI agents)",
		content: AWS_READONLY_TEMPLATE,
	},
	"aws-dev": {
		name: "aws-dev",
		description: "AWS development operations (includes some write operations)",
		content: AWS_DEV_TEMPLATE,
	},
	kubernetes: {
		name: "kubernetes",
		description: "Kubernetes operations (read-only focus)",
		content: KUBERNETES_TEMPLATE,
	},
	terraform: {
		name: "terraform",
		description: "Terraform operations (plan and inspection)",
		content: TERRAFORM_TEMPLATE,
	},
	docker: {
		name: "docker",
		description: "Docker operations (inspection and management)",
		content: DOCKER_TEMPLATE,
	},
	"multi-command": {
		name: "multi-command",
		description:
			"Multiple tools (AWS, kubectl, terraform, docker, gh, gcloud, git)",
		content: MULTI_COMMAND_TEMPLATE,
	},
};

/**
 * Get a template by name
 */
export function getTemplate(name: TemplateName): Template | null {
	return TEMPLATES[name] || null;
}

/**
 * List all available templates
 */
export function listTemplates(): Template[] {
	return Object.values(TEMPLATES);
}
