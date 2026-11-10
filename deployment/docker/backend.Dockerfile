FROM eclipse-temurin:21-jre-noble
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client-16 curl ca-certificates && rm -rf /var/lib/apt/lists/* && groupadd -g 10001 accruehr && useradd -u 10001 -g 10001 -M -s /usr/sbin/nologin accruehr
WORKDIR /app
COPY app.jar /app/app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
