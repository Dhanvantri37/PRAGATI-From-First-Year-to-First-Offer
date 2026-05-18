FROM node:18-alpine

# Add curl for Docker healthcheck
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 5000

CMD ["node", "src/server.js"]
