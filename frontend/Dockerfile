# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Allow the API URL to be baked in at build time. Defaults to the backend
# port as exposed on the host by docker-compose (http://localhost:4000) —
# the browser calls this directly, and the backend's CORS is configured
# to allow the frontend's host-mapped origin.
ARG VITE_API_URL="http://localhost:4000"
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ---- runtime ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
