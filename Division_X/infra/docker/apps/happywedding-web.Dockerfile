FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN echo build happywedding-web
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app /app
CMD ['sh','-c','echo run happywedding-web']
