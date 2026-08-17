# SuamiSihat Creative Team Web Portal
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose Web Portal port
EXPOSE 4000

# Environment variables
ENV PORT=4000
ENV NODE_ENV=production
ENV WORKSPACE_ROOT=/volume1/Creative-Team

# Start the Web Portal server
CMD ["node", "server/index.js"]
