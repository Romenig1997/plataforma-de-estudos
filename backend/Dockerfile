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
RUN apk add --no-cache wget && addgroup -S app && adduser -S app -G app

COPY --from=build /build/target/*.jar app.jar

USER app

EXPOSE 8080

# Railway define PORT em tempo de execucao. No Compose/local o fallback mantem
# a porta 8080, portanto o health check acompanha o processo em ambos os casos.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -q -O - "http://localhost:${PORT:-8080}/actuator/health" || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
