terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  
  backend "s3" {
    bucket         = "securesnap-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ca-central-1"
    encrypt        = true
    dynamodb_table = "securesnap-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "SecureSnap"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Random suffix for unique resource names
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Networking Module
module "networking" {
  source = "./modules/networking"
  
  project_name     = var.project_name
  environment      = var.environment
  vpc_cidr         = var.vpc_cidr
  azs              = data.aws_availability_zones.available.names
  private_subnets  = var.private_subnets
  public_subnets   = var.public_subnets
  database_subnets = var.database_subnets
  
  enable_nat_gateway   = var.enable_nat_gateway
  single_nat_gateway   = var.single_nat_gateway
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = local.common_tags
}

# Security Module
module "security" {
  source = "./modules/security"
  
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  
  alb_security_group_ingress_rules = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP from anywhere"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS from anywhere"
    }
  ]
  
  tags = local.common_tags
}

# Storage Module
module "storage" {
  source = "./modules/storage"
  
  project_name = var.project_name
  environment  = var.environment
  
  # S3 configuration
  photo_bucket_name = "${var.project_name}-photos-${var.environment}-${random_string.suffix.result}"
  backup_bucket_name = "${var.project_name}-backups-${var.environment}-${random_string.suffix.result}"
  
  # RDS configuration
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_engine_version    = var.db_engine_version
  db_name              = var.db_name
  db_username          = var.db_username
  db_subnet_group_name = module.networking.database_subnet_group_name
  vpc_security_group_ids = [module.security.rds_security_group_id]
  
  # ElastiCache configuration
  redis_node_type           = var.redis_node_type
  redis_num_cache_nodes     = var.redis_num_cache_nodes
  redis_parameter_group_family = var.redis_parameter_group_family
  redis_engine_version      = var.redis_engine_version
  redis_subnet_group_name   = module.networking.elasticache_subnet_group_name
  redis_security_group_ids  = [module.security.redis_security_group_id]
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  
  kms_key_arn = module.security.kms_key_arn
  
  tags = local.common_tags
}

# Compute Module
module "compute" {
  source = "./modules/compute"
  
  project_name = var.project_name
  environment  = var.environment
  
  # ECS configuration
  ecs_cluster_name = "${var.project_name}-${var.environment}"
  
  # Task definition
  task_family      = var.project_name
  task_cpu         = var.task_cpu
  task_memory      = var.task_memory
  container_image  = var.container_image
  container_port   = var.container_port
  
  # Service configuration
  desired_count    = var.desired_count
  min_capacity     = var.min_capacity
  max_capacity     = var.max_capacity
  
  # Network configuration
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  public_subnet_ids  = module.networking.public_subnet_ids
  alb_security_group_id = module.security.alb_security_group_id
  ecs_security_group_id = module.security.ecs_security_group_id
  
  # Environment variables
  environment_variables = [
    {
      name  = "NODE_ENV"
      value = var.environment
    },
    {
      name  = "DATABASE_URL"
      value = module.storage.rds_connection_string
    },
    {
      name  = "REDIS_URL"
      value = module.storage.redis_connection_string
    },
    {
      name  = "S3_BUCKET_NAME"
      value = module.storage.photo_bucket_name
    },
    {
      name  = "AWS_REGION"
      value = var.aws_region
    }
  ]
  
  # Secrets from Parameter Store
  secrets = [
    {
      name      = "JWT_SECRET"
      valueFrom = aws_ssm_parameter.jwt_secret.arn
    },
    {
      name      = "JWT_REFRESH_SECRET"
      valueFrom = aws_ssm_parameter.jwt_refresh_secret.arn
    },
    {
      name      = "ENCRYPTION_KEY"
      valueFrom = aws_ssm_parameter.encryption_key.arn
    }
  ]
  
  # SSL certificate
  certificate_arn = var.certificate_arn
  
  tags = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"
  
  project_name = var.project_name
  environment  = var.environment
  
  # CloudWatch configuration
  log_retention_days = var.log_retention_days
  
  # Alarms configuration
  alb_arn_suffix     = module.compute.alb_arn_suffix
  target_group_arn_suffix = module.compute.target_group_arn_suffix
  ecs_cluster_name   = module.compute.ecs_cluster_name
  ecs_service_name   = module.compute.ecs_service_name
  rds_instance_id    = module.storage.rds_instance_id
  redis_cluster_id   = module.storage.redis_cluster_id
  
  # SNS topic for alerts
  alarm_email = var.alarm_email
  
  tags = local.common_tags
}

# Parameter Store for secrets
resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project_name}/${var.environment}/jwt-secret"
  description = "JWT secret for authentication"
  type        = "SecureString"
  value       = var.jwt_secret
  key_id      = module.security.kms_key_id
  
  tags = local.common_tags
}

resource "aws_ssm_parameter" "jwt_refresh_secret" {
  name        = "/${var.project_name}/${var.environment}/jwt-refresh-secret"
  description = "JWT refresh token secret"
  type        = "SecureString"
  value       = var.jwt_refresh_secret
  key_id      = module.security.kms_key_id
  
  tags = local.common_tags
}

resource "aws_ssm_parameter" "encryption_key" {
  name        = "/${var.project_name}/${var.environment}/encryption-key"
  description = "Encryption key for sensitive data"
  type        = "SecureString"
  value       = var.encryption_key
  key_id      = module.security.kms_key_id
  
  tags = local.common_tags
}

# Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.compute.alb_dns_name
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name"
  value       = module.compute.cloudfront_distribution_domain
}

output "photo_bucket_name" {
  description = "Name of the S3 bucket for photos"
  value       = module.storage.photo_bucket_name
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.storage.rds_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.storage.redis_endpoint
  sensitive   = true
}