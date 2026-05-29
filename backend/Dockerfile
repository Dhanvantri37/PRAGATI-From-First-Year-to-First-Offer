FROM node:18-alpine

# Add curl for Docker healthcheck and python3, java, c++ for compiler
RUN apk add --no-cache curl python3 openjdk17 g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 5000

CMD ["node", "src/server.js"]
