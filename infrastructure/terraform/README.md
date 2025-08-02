# SecureSnap Terraform Infrastructure

This directory contains the Terraform configuration for deploying SecureSnap infrastructure on AWS.

## Architecture Overview

The infrastructure includes:
- **VPC** with public, private, and database subnets across 3 availability zones
- **ECS Fargate** for containerized application hosting
- **RDS PostgreSQL** for the primary database
- **ElastiCache Redis** for caching and sessions
- **S3** for photo storage and backups
- **CloudFront** for global content delivery
- **Application Load Balancer** with SSL termination
- **WAF** for web application firewall protection
- **KMS** for encryption at rest
- **CloudWatch** for monitoring and logging

## Prerequisites

1. **AWS Account**: Ensure you have an AWS account with appropriate permissions
2. **Terraform**: Install Terraform 1.0 or later
3. **AWS CLI**: Configure AWS credentials
4. **S3 Backend**: Create an S3 bucket for Terraform state
5. **ACM Certificate**: Create SSL certificate in AWS Certificate Manager

## Initial Setup

1. Create S3 bucket for Terraform state:
```bash
aws s3 mb s3://securesnap-terraform-state --region ca-central-1
aws s3api put-bucket-versioning --bucket securesnap-terraform-state --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket securesnap-terraform-state --server-side-encryption-configuration '{
  "Rules": [{
    "ApplyServerSideEncryptionByDefault": {
      "SSEAlgorithm": "AES256"
    }
  }]
}'
```

2. Create DynamoDB table for state locking:
```bash
aws dynamodb create-table \
  --table-name securesnap-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region ca-central-1
```

3. Request SSL certificate in ACM:
```bash
# Request certificate for your domain
aws acm request-certificate \
  --domain-name securesnap.com \
  --subject-alternative-names "*.securesnap.com" \
  --validation-method DNS \
  --region ca-central-1
```

## Deployment

### 1. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 2. Create workspace for environment

```bash
# For staging
terraform workspace new staging

# For production
terraform workspace new production
```

### 3. Plan deployment

```bash
# For staging
terraform plan -var-file=environments/staging.tfvars \
  -var="jwt_secret=$(openssl rand -base64 32)" \
  -var="jwt_refresh_secret=$(openssl rand -base64 32)" \
  -var="encryption_key=$(openssl rand -base64 32)" \
  -out=staging.tfplan

# For production
terraform plan -var-file=environments/production.tfvars \
  -var="jwt_secret=$(openssl rand -base64 32)" \
  -var="jwt_refresh_secret=$(openssl rand -base64 32)" \
  -var="encryption_key=$(openssl rand -base64 32)" \
  -out=production.tfplan
```

### 4. Apply changes

```bash
# Review the plan carefully before applying
terraform apply staging.tfplan  # or production.tfplan
```

## Post-Deployment Steps

1. **Update DNS Records**:
   - Point your domain to the CloudFront distribution
   - Add CNAME record: `securesnap.com` → CloudFront domain

2. **Initialize Database**:
   ```bash
   # Get RDS endpoint
   export DB_HOST=$(terraform output -raw rds_endpoint)
   
   # Run Prisma migrations
   DATABASE_URL="postgresql://securesnapmaster:PASSWORD@$DB_HOST/securesnap?sslmode=require" \
     npx prisma migrate deploy
   ```

3. **Configure GitHub Actions**:
   - Add AWS credentials as repository secrets
   - Update container registry URL in workflows

4. **Enable Monitoring**:
   - Configure CloudWatch dashboards
   - Set up SNS email subscriptions for alarms

## Managing Secrets

Sensitive values are stored in AWS Systems Manager Parameter Store:
- `/securesnap/[environment]/jwt-secret`
- `/securesnap/[environment]/jwt-refresh-secret`
- `/securesnap/[environment]/encryption-key`
- `/securesnap/[environment]/rds-password`
- `/securesnap/[environment]/redis-auth-token`

To update a secret:
```bash
aws ssm put-parameter \
  --name "/securesnap/production/jwt-secret" \
  --value "new-secret-value" \
  --type "SecureString" \
  --overwrite
```

## Scaling

### Horizontal Scaling
ECS services are configured with auto-scaling based on CPU and memory metrics:
- Target CPU: 70%
- Target Memory: 80%

### Vertical Scaling
To change instance sizes:
1. Update the appropriate `.tfvars` file
2. Run `terraform plan` and `terraform apply`
3. Note: RDS changes may require downtime

## Backup and Recovery

### Automated Backups
- **RDS**: Daily automated backups with 30-day retention
- **S3**: Versioning enabled with lifecycle policies
- **Redis**: Daily snapshots with 5-day retention (production)

### Manual Backup
```bash
# Create RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier securesnap-production-db \
  --db-snapshot-identifier manual-snapshot-$(date +%Y%m%d)

# Export S3 bucket
aws s3 sync s3://securesnap-photos-production s3://securesnap-backup-bucket
```

## Monitoring

### CloudWatch Alarms
Configured alarms for:
- ECS CPU/Memory utilization
- RDS CPU/Storage/Connections
- ALB target health
- Redis CPU/Memory/Evictions
- S3 bucket size

### Logs
All logs are centralized in CloudWatch Logs:
- `/ecs/securesnap-[environment]` - Application logs
- `/aws/rds/instance/securesnap-[environment]-db/postgresql` - Database logs
- `/aws/elasticache/securesnap-[environment]/redis/slow-log` - Redis slow queries

## Cost Optimization

1. **Use Reserved Instances** for predictable workloads
2. **Enable S3 Intelligent-Tiering** for automatic cost optimization
3. **Review CloudWatch logs retention** periods
4. **Use single NAT Gateway** in non-production environments
5. **Schedule non-production resources** to stop outside business hours

## Troubleshooting

### Common Issues

1. **Terraform state lock**:
   ```bash
   terraform force-unlock <LOCK_ID>
   ```

2. **ECS tasks not starting**:
   - Check CloudWatch logs
   - Verify security groups
   - Ensure IAM roles have necessary permissions

3. **Database connection issues**:
   - Verify security group rules
   - Check RDS parameter group settings
   - Ensure SSL is properly configured

### Useful Commands

```bash
# List all resources
terraform state list

# Show specific resource
terraform state show module.compute.aws_ecs_service.main

# Import existing resource
terraform import aws_s3_bucket.photos securesnap-photos-production

# Destroy specific resource
terraform destroy -target=module.storage.aws_s3_bucket.photos
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use IAM roles** instead of access keys where possible
3. **Enable MFA** for AWS console access
4. **Regular security audits** using AWS Security Hub
5. **Implement least privilege** access policies
6. **Enable AWS Config** for compliance monitoring
7. **Use AWS GuardDuty** for threat detection

## Disaster Recovery

### RTO/RPO Targets
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 1 hour

### DR Procedures
1. **Database failure**: Restore from automated backup
2. **Region failure**: Deploy to alternate region using same Terraform config
3. **Data corruption**: Restore from S3 versioning or backup bucket

## Module Structure

```
modules/
├── networking/     # VPC, subnets, routing
├── security/       # Security groups, IAM, KMS, WAF
├── storage/        # S3, RDS, ElastiCache
├── compute/        # ECS, ALB, CloudFront
└── monitoring/     # CloudWatch, SNS, alarms
```

## Contributing

1. Create feature branch
2. Make changes and test in staging
3. Submit PR with terraform plan output
4. Apply changes after approval

## License

Copyright © SecureSnap. All rights reserved.