FROM node:22-alpine

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci --omit=dev

COPY --chown=node:node . .

USER node

EXPOSE 3001

CMD ["node", "server.js"]
