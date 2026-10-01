# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /build

# Dependencias primeiro: aproveita o cache de camadas entre rebuilds
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app

# Roda sem root
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /build/target/*.jar app.jar

USER app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]