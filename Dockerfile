FROM node:12.18.2-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock

RUN yarn install --production \
  && yarn cache clean

ADD lib /app/lib

CMD node lib/server