environment = "production"
aws_region  = "ca-central-1"

# Networking
vpc_cidr         = "10.0.0.0/16"
private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnets   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

enable_nat_gateway = true
single_nat_gateway = false

# Database
db_instance_class    = "db.r6g.large"
db_allocated_storage = 500
db_engine_version    = "15.4"

# Redis
redis_node_type       = "cache.r6g.large"
redis_num_cache_nodes = 3

# ECS
task_cpu      = "2048"
task_memory   = "4096"
desired_count = 3
min_capacity  = 3
max_capacity  = 20

# Monitoring
log_retention_days = 90
alarm_email       = "alerts@securesnap.com"

# Container image
container_image = "securesnap/app:latest"

# Certificate ARN (must be created separately in ACM)
certificate_arn = "arn:aws:acm:ca-central-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"