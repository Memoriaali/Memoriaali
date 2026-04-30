FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy database package
COPY packages/database/ ./packages/database/

WORKDIR /app/packages/database

# Generate Prisma client
RUN pnpm db:generate

# Expose Prisma Studio port
EXPOSE 5555

# Start Prisma Studio
CMD ["pnpm", "db:studio", "--port", "5555", "--hostname", "0.0.0.0"]