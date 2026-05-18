# ════════════════════════════════════════════════════════
# Stage 1: Build the Spring Boot JAR with Maven
# ════════════════════════════════════════════════════════
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build

# Download dependencies first (cached unless pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source and build
COPY src/ ./src/
RUN mvn package -DskipTests -q

# ════════════════════════════════════════════════════════
# Stage 2: Minimal JRE runtime image
# ════════════════════════════════════════════════════════
FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache curl
WORKDIR /app

# Copy the built jar (version 2.0.0 matches pom.xml)
COPY --from=builder /build/target/resume-parser-2.0.0.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
