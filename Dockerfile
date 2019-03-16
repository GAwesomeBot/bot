ARG NODE_VER=lts-alpine

FROM node:$NODE_VER

LABEL maintainer="https://github.com/GilbertGobbels/GAwesomeBot"

WORKDIR /home/node/GAwesomeBot

COPY package.json yarn.lock ./
COPY ./Internals/NPMScripts/WarnPreInstallWindows.js ./Internals/NPMScripts/

RUN apk add --no-cache --virtual .build-deps build-base git python-dev zlib-dev && \
    apk add --no-cache --virtual .npm-deps cairo libjpeg-turbo pango && \
    yarn install && \
    yarn cache clean && \
    apk del .build-deps

COPY . .

EXPOSE 80

CMD ["node", "master.js"]
