environment = "staging"
aws_region  = "ca-central-1"

# Networking
vpc_cidr         = "10.1.0.0/16"
private_subnets  = ["10.1.1.0/24", "10.1.2.0/24"]
public_subnets   = ["10.1.101.0/24", "10.1.102.0/24"]
database_subnets = ["10.1.201.0/24", "10.1.202.0/24"]

enable_nat_gateway = true
single_nat_gateway = true  # Save costs in staging

# Database
db_instance_class    = "db.t3.medium"
db_allocated_storage = 100
db_engine_version    = "15.4"

# Redis
redis_node_type       = "cache.t3.small"
redis_num_cache_nodes = 2

# ECS
task_cpu      = "1024"
task_memory   = "2048"
desired_count = 2
min_capacity  = 2
max_capacity  = 5

# Monitoring
log_retention_days = 30
alarm_email       = "staging-alerts@securesnap.com"

# Container image
container_image = "securesnap/app:staging"

# Certificate ARN (must be created separately in ACM)
certificate_arn = "arn:aws:acm:ca-central-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"