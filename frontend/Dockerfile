# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Backend URL is baked in at build time via ARG.
# Pass --build-arg VITE_API_BASE=https://your-backend.run.app
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

# --- runtime stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Cloud Run injects $PORT — Nginx alpine substitutes /etc/nginx/templates/*.template at startup.
ENV PORT=8080
EXPOSE 8080

CMD ["nginx","-g","daemon off;"]
