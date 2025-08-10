#
# ===== Stage 1: Builder =====
# This stage installs all dependencies (including dev), copies the source code,
# and builds the TypeScript application into JavaScript.
#
FROM node:22-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies needed for the build)
# Using 'npm install' here because we need typescript, @nestjs/cli etc.
RUN npm install

# Copy the rest of the application source code
COPY . .

# Run the build command to compile TypeScript to JavaScript
RUN npm run build

#
# ===== Stage 2: Production =====
# This is the final stage that will be used for the production image.
# It starts from a fresh, clean Node.js Alpine image to keep it minimal.
#
FROM node:22-alpine AS production

# Set the working directory
WORKDIR /usr/src/app

# Add a non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package.json and package-lock.json first
COPY package*.json ./

# Change ownership of the app directory BEFORE installing dependencies
# This is the key fix for the EACCES permission error.
RUN chown -R appuser:appgroup /usr/src/app

# Switch to the non-root user
USER appuser

# Install ONLY production dependencies using 'npm ci'.
# 'npm ci' is faster and more reliable for production builds as it uses
# the package-lock.json to ensure deterministic installs.
# '--omit=dev' ensures no devDependencies are installed.
RUN npm ci --omit=dev

# Copy the compiled application code from the 'builder' stage.
# The user already owns the directory, so this copy is fine.
COPY --from=builder /usr/src/app/dist ./dist

RUN ls -alh /usr/src/app/dist
# Set the port environment variable
ENV PORT=3000

# Expose the port the application will run on
EXPOSE ${PORT}

# The command to run the application in production
CMD ["npm", "run", "start:prod"]

#
# ===== Stage 3: Development =====
# This stage is specifically for the development environment.
# It includes devDependencies and uses nodemon for hot-reloading.
#
FROM node:22-alpine AS development

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies, including devDependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Set the port environment variable
ENV PORT=3000

# Expose the port
EXPOSE ${PORT}

# The command to run the application in development mode with hot-reloading
CMD ["npm", "run", "start:dev"]
