FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN echo build core-api
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app /app
CMD ['sh','-c','echo run core-api']
