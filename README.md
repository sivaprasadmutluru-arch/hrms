# Cloud HRMS

Spring Boot 3 HRMS backend with PostgreSQL. The repository also contains a
prebuilt static web UI under `src/main/resources/static`.

## Requirements

- Java 21 or newer
- Maven 3.9+ (or the included Maven wrapper)
- PostgreSQL 16+

## Local setup (macOS with Homebrew)

Install and start PostgreSQL:

```bash
brew install postgresql@16
brew services start postgresql@16
```

Create the development database and user. Run these commands as your local
PostgreSQL administrator (normally your macOS username):

```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgres -c \
  "CREATE ROLE postgres LOGIN SUPERUSER PASSWORD 'postgres123';"
/opt/homebrew/opt/postgresql@16/bin/createdb -O postgres cloudhrms_local
```

If either already exists, PostgreSQL will report that instead; no recreation is
needed. The matching defaults are in `src/main/resources/application.properties`.

Start the application:

```bash
mvn -Dskip.installnodenpm -Dskip.npm spring-boot:run
```

Then open:

- Application: <http://localhost:8080>
- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI JSON: <http://localhost:8080/api/docs>

On first startup, Hibernate creates/updates the database schema automatically.

## Configuration

Override local defaults with environment variables when needed:

```bash
export DB_URL='jdbc:postgresql://localhost:5432/cloudhrms_local'
export DB_USERNAME='postgres'
export DB_PASSWORD='postgres123'
export DDL_AUTO='update'
export JWT_SECRET='replace-with-a-long-random-secret'
mvn -Dskip.installnodenpm -Dskip.npm spring-boot:run
```

For production, activate the `prod` profile and provide every required variable
listed in `src/main/resources/application-prod.properties`. Use
`DDL_AUTO=validate` after the initial schema creation.

## Build and test the backend

```bash
mvn -Dskip.installnodenpm -Dskip.npm test
mvn -Dskip.installnodenpm -Dskip.npm package
```

The skip flags are currently required because `pom.xml` expects a separate
frontend project at `../hrms-web`, which is not included in this repository.

## Useful database commands

```bash
# Connect
PGPASSWORD=postgres123 /opt/homebrew/opt/postgresql@16/bin/psql \
  -h localhost -U postgres -d cloudhrms_local

# Stop or restart PostgreSQL
brew services stop postgresql@16
brew services restart postgresql@16
```

