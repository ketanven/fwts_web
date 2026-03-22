# AWS EC2 Deployment Guide

This guide explains how to host the **WorkHub Freelancer** frontend on an AWS EC2 instance using Docker.

## 1. Prepare EC2 Instance

- **AMI**: Amazon Linux 2023 or Ubuntu 22.04 LTS.
- **Instance Type**: `t3.micro` or `t3.small` (at least 1GB RAM recommended for build).
- **Security Group**: Allow **SSH (22)**, **HTTP (80)**, and **HTTPS (443)**.

## 2. Install Docker

On the EC2 instance, run:

```bash
# Update system
sudo yum update -y  # For Amazon Linux
# sudo apt update && sudo apt upgrade -y # For Ubuntu

# Install Docker
sudo yum install docker -y # For Amazon Linux
# sudo apt install docker.io -y # For Ubuntu

# Start Docker and enable it
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to the docker group (to run without sudo)
sudo usermod -aG docker $USER
# Logout and login again for this to take effect
```

## 3. Deploy the Application

### Option A: Manual Build on EC2

```bash
# Clone the repository
git clone <your-repo-url>
cd workhub-freelancer

# Build the Docker image
docker build -t workhub-frontend .

# Run the container
docker run -d --name workhub-web -p 80:80 workhub-frontend
```

### Option B: Using Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "80:80"
    restart: always
```

Then run:
```bash
docker-compose up -d --build
```

## 4. Environment Variables

If you need to change the API URL during deployment without rebuilding, you should ideally use a runtime environment variable injected via Nginx or a script, but for standard Vite builds, ensure your `.env.staging` (used by Dockerfile) has the correct `VITE_APP_API_BASE_URL`.

## 5. SSL / HTTPS (Optional but Recommended)

Use **Certbot (Let's Encrypt)** to set up SSL:

```bash
sudo yum install certbot python3-certbot-nginx -y
sudo certbot --nginx
```

---
**Note**: Ensure your Backend API is accessible from the EC2 instance and that CORS is configured to allow your EC2 domain.
