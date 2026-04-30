-- MySQL initialization script for Memoriaali development
-- This script runs when the MySQL container starts for the first time

-- Grant CREATE, DROP, ALTER, and REFERENCES privileges to memoriaali user for Prisma migrations
GRANT CREATE, DROP, ALTER, REFERENCES ON *.* TO 'memoriaali'@'%';
FLUSH PRIVILEGES;

-- Ensure memoriaali user has all privileges on the memoriaali database
GRANT ALL PRIVILEGES ON memoriaali.* TO 'memoriaali'@'%';
FLUSH PRIVILEGES; 