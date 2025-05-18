FROM node:18.20.8-bullseye


WORKDIR app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000

entrypoint ["npm", "run", "start:prod"]