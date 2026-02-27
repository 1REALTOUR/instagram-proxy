FROM node:22-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package.json index.mjs ./
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3100/health || exit 1
CMD ["node", "index.mjs"]
