# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY app/package*.json ./app/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
WORKDIR /app/app
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy built assets from build stage
COPY --from=build /app/app/dist /usr/share/nginx/html

# Copy nginx config
COPY infra/home/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
