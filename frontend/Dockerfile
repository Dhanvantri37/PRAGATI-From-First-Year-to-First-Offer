FROM node:18-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_URL=http://pragati-backend:5000/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm ci

COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# ── Nginx for serving the built React app ────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
