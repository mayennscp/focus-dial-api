FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# The SQLite file lives on a volume, so data survives container restarts.
# The directory must belong to the non-root user, or SQLite cannot create the file.
RUN mkdir -p /data && chown node:node /data
ENV DB_PATH=/data/focus-dial.db
VOLUME /data

EXPOSE 3000
USER node
CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.ts"]
