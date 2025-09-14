# ---------- builder ----------
    FROM node:18-alpine AS builder
    WORKDIR /app
    
    # copy lockfile + package.json for deterministic install
    COPY package*.json ./
    
    # install all deps (dev + prod) so build works
    RUN npm ci
    
    # copy rest of app and build
    COPY . .
    RUN npm run build
    
    # ---------- runner ----------
    FROM node:18-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    
    # copy compiled artifact and node_modules from builder
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/package*.json ./
    
    EXPOSE 3000
    CMD ["node", "dist/main.js"]
    