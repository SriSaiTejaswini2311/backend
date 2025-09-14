FROM node:18.20.2-alpine
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production --loglevel verbose && \
    npm cache clean --force

# Copy application code and set non-root user
COPY . .
RUN chown node:node /app
USER node

EXPOSE 3000
CMD ["node", "server.js"]