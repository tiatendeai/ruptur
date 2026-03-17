FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
ENV WARMUP_RUNTIME_PORT=4173
EXPOSE 4173
CMD ["node", "runtime/server.mjs"]
