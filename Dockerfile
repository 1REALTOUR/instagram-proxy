FROM node:22-alpine
WORKDIR /app
COPY package.json index.mjs ./
EXPOSE 3100
CMD ["node", "index.mjs"]
