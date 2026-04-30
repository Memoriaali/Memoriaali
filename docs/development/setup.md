# Development Environment Setup

This guide provides a step-by-step process for setting up and working with the Memoriaali v2.0 development environment.

After completing this guide, you will have a functional development environment supporting the Memoriaali system, with all required tools, databases, and workflows ready for use.

## How to Set Up Your Environment

This section provides a phased approach to setting up your development environment, from system prerequisites to workflow verification.

### Phase 1: System Prerequisites

To guarantee compatibility and smooth operation of all Memoriaali components, ensure your system meets the minimum requirements and has all core software installed.

#### Operating System Requirements

| Platform   | Recommended Version | Notes               |
| ---------- | ------------------- | ------------------- |
| Linux      | Ubuntu 20.04+       | Full support        |
| macOS      | 12.0+               | Full support        |
| Windows 11 | WSL2 required       | Best on Linux/macOS |

#### Core Software Installation

Install Node.js, PNPM, Docker, and Java. These are required for the system to run.

**1. Install Node.js and Package Managers**

```bash
# Install Node.js 22.18+ (use Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
source ~/.bashrc

nvm install 22.18.0
nvm use 22.18.0
nvm alias default 22.18.0

# Install PNPM (preferred for monorepo)
npm install -g pnpm@8

# Verify installations
node --version    # Should be 22.18.x+
npm --version     # Should be 9.x+
pnpm --version    # Should be 8.x+
```

**2. Install Docker**

```bash
# Docker Desktop (recommended for development)
# Download from: https://www.docker.com/products/docker-desktop/

# Verify Docker installation
docker --version          # Should be 20.0+
docker compose --version  # Should be 2.0+

# Test Docker
docker run hello-world
```

**3. Install Java Development Kit (for SIP service)**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# macOS (using Homebrew)
brew install openjdk@21

# Verify Java installation
java --version    # Should be 21.x+
javac --version   # Should be 21.x+
```

**Download Commons-IP JAR**

```bash
# Download from: https://github.com/keeps/commons-ip/releases/tag/2.10.0
mkdir -p jars
# Place commons-ip-cli-2.10.0.jar in jars/ directory
```

---

### Phase 2: Project Setup

Clone the repository, install dependencies, and configure your environment to ensure your local setup matches the project requirements.

#### 1. Clone and Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd Memoriaali

# Verify project structure
ls -la
# Should see: apps/, packages/, docs/, docker-compose.yml, etc.

# Install dependencies (monorepo)
pnpm install

# Verify monorepo setup
pnpm --version
pnpm list --depth=0
```

#### 2. Environment Configuration

```bash
# Create environment configuration (when available)
cp .env.example .env

# Edit environment variables as needed
# Default values work for development
# NOTE: There are several .env files in the project.
# For instance database uri is defined in the
# .env file in the ./packages/database folder
```

#### 3. Database Setup Options

You can use either a Dockerized MySQL instance (recommended) or a local MySQL installation. Choose the option that best fits your workflow.

| Option        | Pros                       | Cons                        |
| ------------- | -------------------------- | --------------------------- |
| Docker        | Easy, consistent, isolated | Requires Docker             |
| Local Install | No Docker dependency       | Manual setup, less portable |

**Option A: Docker Database (Recommended)**

```bash
# Start MySQL via Docker
docker compose up -d mysql

# Wait for database to be ready (check health)
docker compose ps
# mysql should show "healthy" status

# Access database
docker compose exec mysql mysql -u memoriaali -p
# Password: memoriaali_pass
```

**Option B: Local MySQL Installation**

```bash
# Install MySQL (Ubuntu/Debian)
sudo apt update
sudo apt install mysql-server

# Install MySQL (macOS)
brew install mysql
brew services start mysql

# Configure database
sudo mysql -u root
mysql> CREATE DATABASE memoriaali;
mysql> CREATE USER 'memoriaali'@'localhost' IDENTIFIED BY 'memoriaali_pass';
mysql> GRANT ALL PRIVILEGES ON memoriaali.* TO 'memoriaali'@'localhost';
mysql> FLUSH PRIVILEGES;
mysql> EXIT;

# Test connection
mysql -u memoriaali -p memoriaali
```

#### 4. Database push and client generation

After the MySQL database is up and running, push the Prisma schema and generate Prisma client.

NOTE: make sure the environment variables (`.env` file) are properly set before running these scripts.

```bash
# cd to Prisma folder
cd ./packages/database

# Push Prisma schema to database (and generate a new Prisma client)
pnpm db:push

# Generate Prisma client without database push (optional)
pnpm db:generate
```

#### 5. Variant configurations and themes

You can find common variant configurations from packages/variant-config/variants/< yourvarianthere>.ts

Themes (color configurations) can be found from apps/frontend/src/app/styles/themes.scss

---

### Phase 3: Development Environment Verification

Verify that the system and all tools are working as expected.

#### Architecture Verification

```bash
# Return to root directory (if not already there)
cd ../..

# Build api types (first setup, after this api types will be built from root)
cd packages/api-types
pnpm build

# Build project
cd ../..       # Return to root directory
pnpm build     # Should build available packages (if there is an error from frontend check api:gen)

# Start Docker development environment
docker compose up -d mysql
# Should start MySQL + Prisma Studio

# Access Prisma Studio
cd packages/database
pnpm db:studio
# http://localhost:5555

# Generate frontend api packages
# Backend needs to be running while doing this
cd apps/backend
pnpm dev

# Different terminal
cd apps/frontend
pnpm api:gen
```

#### Testing Infrastructure Verification

> **Development Status:** Unit, integration, and performance testing infrastructure is fully implemented and operational.

```bash
# Test infrastructure verification
pnpm test                     # Run existing unit tests
pnpm test:coverage           # Generate coverage reports

# Check Vitest configuration
cat vitest.config.ts         # View test configuration

# Note: Performance testing tools (k6, Artillery, etc.) are available for integration if needed
```

---

### Phase 4: Expansions

#### SIP-creation

From variables you can choose to enable/disable SIP-package creation from your Memoriaali.
(packages/variant-config/variants/< yourvarianthere>.ts)

#### Oral history recording service

From variables you can choose to enable/disable oral history recording service from your Memoriaali.
(packages/variant-config/variants/< yourvarianthere>.ts)

#### AI Components

To start using the artificial intelligence to improve the quality and usability of digital records install and run the API on your server and add the correct API address on variables.
Note: If you don't want to use the components set all the enabled variables to false.
(packages/variant-config/variants/< yourvarianthere>.ts)

Detecting scanning errors from images:
https://github.com/DALAI-project/FaultyImageAPI

Detecting metadata from file:
https://github.com/DALAI-project/Document-analysis_API

Component codes and trained templates can be found on Github and are freely available and customisable (released under MIT licence). Also note that some components utilise typewritten text recognition, so they do not work with handwritten material.

Learn more:
https://github.com/DALAI-project
https://arkkiivi.fi/

### Troubleshooting Common Issues

This section provides solutions to common setup and development issues.

#### Port Conflicts

```bash
# Check what's using ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :3306

# Kill processes using ports
sudo kill -9 $(lsof -t -i:3000)

# Or use different ports in configuration
```

#### Database Connection Issues

```bash
# Test database connectivity
mysql -u memoriaali -p memoriaali -h localhost -P 3306

# Reset Docker database
docker compose down -v mysql
docker compose up -d mysql

# Check Docker network
docker network ls
docker network inspect memoriaali-v2_default
```

#### Node.js/NPM Issues

```bash
# Clear npm/pnpm cache
npm cache clean --force
pnpm store prune

# Reinstall dependencies
rm -rf node_modules package-lock.json
pnpm install

# Check Node.js version
node --version  # Should be 22+
```

#### Docker Issues

```bash
# Restart Docker daemon
sudo systemctl restart docker  # Linux
# Or restart Docker Desktop

# Clean Docker resources
docker system prune -f
docker volume prune

# Check Docker storage
docker system df
```

---

### Performance Optimization

Optimize your development environment.

#### Development Environment Optimization

```bash
# Use SSD for better performance
# Ensure adequate RAM (16GB+ recommended)
# Close unnecessary applications

# Docker optimization
# Increase Docker memory limit to 8GB+
# Use Docker BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Node.js optimization
# Increase Node.js memory limit for large builds
export NODE_OPTIONS="--max-old-space-size=8192"
```

#### File Watching Optimization

```bash
# Increase file watch limits (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Use polling for file changes in Docker
export CHOKIDAR_USEPOLLING=true
```

---

**Last Updated:** April 2, 2026  
**Setup Complexity:** Low to Medium  
**Time to Complete:** 2-4 hours for full setup
