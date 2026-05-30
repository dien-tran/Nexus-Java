FROM eclipse-temurin:21-jdk AS build

ARG MODULE
WORKDIR /workspace

COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY common-lib/pom.xml common-lib/pom.xml
COPY discovery-server/pom.xml discovery-server/pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml
COPY identity-service/pom.xml identity-service/pom.xml
COPY work-service/pom.xml work-service/pom.xml

RUN chmod +x mvnw

COPY common-lib/src common-lib/src
COPY discovery-server/src discovery-server/src
COPY api-gateway/src api-gateway/src
COPY identity-service/src identity-service/src
COPY work-service/src work-service/src

RUN ./mvnw -B -DskipTests -pl ${MODULE} -am package

FROM eclipse-temurin:21-jre

ARG MODULE
WORKDIR /app

COPY --from=build /workspace/${MODULE}/target/*.jar app.jar

EXPOSE 8080 8081 8082 8761
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
