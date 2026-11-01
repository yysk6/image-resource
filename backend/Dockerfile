FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY maven-settings.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -s maven-settings.xml package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/material-studio-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
