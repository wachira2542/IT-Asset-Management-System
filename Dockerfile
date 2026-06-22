FROM node:18-bullseye-slim

# Install sqlite3 dependencies (if needed for node-sqlite3 build)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose the app port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
