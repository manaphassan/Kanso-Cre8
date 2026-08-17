# SuamiSihat Creative Team Web Portal
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source & set permissions
COPY . .
RUN chown -R node:node /usr/src/app

# Environment variables
ENV PORT=4000
ENV NODE_ENV=production
ENV WORKSPACE_ROOT=/volume1/Creative-Team

# Expose Web Portal port
EXPOSE 4000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/status').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Run container as non-root user
USER node

# Start the Web Portal server
CMD ["node", "server/index.js"]
