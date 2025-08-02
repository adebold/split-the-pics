output "photo_bucket_name" {
  description = "Name of the S3 bucket for photos"
  value       = aws_s3_bucket.photos.id
}

output "photo_bucket_arn" {
  description = "ARN of the S3 bucket for photos"
  value       = aws_s3_bucket.photos.arn
}

output "backup_bucket_name" {
  description = "Name of the S3 bucket for backups"
  value       = aws_s3_bucket.backups.id
}

output "backup_bucket_arn" {
  description = "ARN of the S3 bucket for backups"
  value       = aws_s3_bucket.backups.arn
}

output "rds_instance_id" {
  description = "The RDS instance ID"
  value       = aws_db_instance.main.id
}

output "rds_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "The database port"
  value       = aws_db_instance.main.port
}

output "rds_connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${var.db_username}:${urlencode(random_password.rds.result)}@${aws_db_instance.main.endpoint}/${var.db_name}?sslmode=require"
  sensitive   = true
}

output "redis_cluster_id" {
  description = "ID of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.id
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_connection_string" {
  description = "Redis connection string with auth"
  value       = "rediss://:${urlencode(random_password.redis_auth.result)}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
  sensitive   = true
}

output "rds_password_parameter_name" {
  description = "Name of the SSM parameter containing the RDS password"
  value       = aws_ssm_parameter.rds_password.name
}

output "redis_auth_token_parameter_name" {
  description = "Name of the SSM parameter containing the Redis auth token"
  value       = aws_ssm_parameter.redis_auth_token.name
}