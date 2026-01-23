# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files from the app directory
COPY app/package*.json ./

# Install dependencies
RUN npm install

# Copy app source code
COPY app/ .

# Build the app
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY infra/home/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
