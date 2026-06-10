FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
# ci installs exact locked versions; ignore-scripts blocks postinstall execution
RUN npm ci --ignore-scripts

COPY --chown=node:node . .

USER node

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
