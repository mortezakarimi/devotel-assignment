# Devotel Assignment - Job Aggregation Service

A robust NestJS-based job aggregation service that collects and manages job postings from multiple providers. Built with TypeScript, PostgreSQL, and Docker for scalable deployment.

## 🚀 Features

- **Job Aggregation**: Collects job postings from multiple external providers
- **RESTful API**: Comprehensive API endpoints for job management
- **Database Management**: PostgreSQL with TypeORM for data persistence
- **Scheduled Tasks**: Automated job collection and updates
- **Docker Support**: Containerized development and production environments
- **Testing**: Comprehensive test suite with Jest and E2E testing
- **API Documentation**: Swagger/OpenAPI documentation
- **Logging**: Structured logging with Winston
- **Validation**: Request validation with class-validator

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Docker** (v20 or higher)
- **Docker Compose** (v2 or higher)
- **PostgreSQL** (v16 or higher) - if running locally without Docker

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd devotel-assignment
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_DATABASE=devotel_jobs
DATABASE_USERNAME=db_user
DATABASE_PASSWORD=your_secure_password
DATABASE_VERSION=16

# Docker Compose
COMPOSE_PROJECT_NAME=devotel
```

## 🚀 Development Environment

### Option 1: Local Development (Recommended for Development)

#### Start the Database

```bash
# Using Docker Compose for database only
docker-compose up database -d

# Or start PostgreSQL locally if you have it installed
```

#### Run the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Debug mode
npm run start:debug

# Production build and run
npm run build
npm run start:prod
```

#### Database Migrations

```bash
# Run pending migrations
npm run migration:run

# Generate new migration
npm run migration:generate --name=migration_name

# Create empty migration
npm run migration:create --name=migration_name

# Revert last migration
npm run migration:revert
```

### Option 2: Docker Development Environment

#### Start Complete Development Stack

```bash
# Start all services (app + database + adminer)
docker-compose -f compose.yaml -f compose.dev.yaml up -d

# View logs
docker-compose -f compose.yaml -f compose.dev.yaml logs -f server

# Stop all services
docker-compose -f compose.yaml -f compose.dev.yaml down
```

#### Access Development Tools

- **Application**: http://localhost:3000
- **Database Admin (Adminer)**: http://localhost:8080
- **Database**: localhost:5432

## 🚀 Production Environment

### Docker Production Deployment

#### Build and Deploy

```bash
# Build production image
docker-compose build

# Start production stack
docker-compose up -d

# View logs
docker-compose logs -f server

# Scale the application
docker-compose up -d --scale server=3
```

#### Production Environment Variables

```bash
# Production .env file
NODE_ENV=production
PORT=3000
DATABASE_HOST=database
DATABASE_PORT=5432
DATABASE_DATABASE=devotel_jobs_prod
DATABASE_USERNAME=prod_user
DATABASE_PASSWORD=very_secure_production_password
DATABASE_VERSION=16
COMPOSE_PROJECT_NAME=devotel-prod
```

### Manual Production Deployment

#### 1. Build the Application

```bash
npm run build
```

#### 2. Install Production Dependencies

```bash
npm ci --omit=dev
```

#### 3. Set Environment Variables

```bash
export NODE_ENV=production
export PORT=3000
# ... other environment variables
```

#### 4. Run the Application

```bash
npm run start:prod
```

## 🧪 Testing

### Run Test Suite

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# Debug tests
npm run test:debug

# End-to-end tests
npm run test:e2e
```

### Test Coverage

The application includes comprehensive test coverage for:

- Controllers and Services
- Database entities and migrations
- API endpoints
- Business logic validation

## 📚 API Documentation

Once the application is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:3000/api
- **API JSON**: http://localhost:3000/api-json

## 🔧 Development Commands

### Code Quality

```bash
# Lint and fix code
npm run lint

# Format code with Prettier
npm run format

# Type checking
npm run build
```

### Database Operations

```bash
# Drop database schema
npm run schema:drop

# Generate new migration
npm run migration:generate --name=add_new_feature

# Run migrations
npm run migration:run
```

## 🐳 Docker Commands

### Development

```bash
# Build development image
docker build --target development -t devotel-dev .

# Run development container
docker run -p 3000:3000 -v $(pwd):/usr/src/app devotel-dev
```

### Production

```bash
# Build production image
docker build --target production -t devotel-prod .

# Run production container
docker run -p 3000:3000 --env-file .env devotel-prod
```

## 📁 Project Structure

```
src/
├── common/           # Shared utilities, DTOs, filters
├── database/         # Database configuration, entities, migrations
├── modules/          # Feature modules (jobs, scheduler, settings)
├── providers/        # External service providers
└── main.ts          # Application entry point
```

## 🔒 Security Considerations

- **Database**: Uses non-root user in Docker containers
- **Environment**: Sensitive data stored in environment variables
- **Validation**: Input validation with class-validator
- **Logging**: Structured logging without sensitive data exposure

## 📊 Monitoring & Logging

- **Application Logs**: Winston-based structured logging
- **Health Checks**: Database health monitoring
- **Error Handling**: Comprehensive error filters and DTOs

## 🚀 Performance Optimization

- **Database**: Connection pooling and optimized queries
- **Caching**: Built-in NestJS caching mechanisms
- **Compression**: Response compression for API endpoints
- **Docker**: Multi-stage builds for optimized images

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the API documentation at `/api`
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join community discussions for questions and help

## 🔗 Useful Links

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Happy Coding! 🎉**
