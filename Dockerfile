FROM node:6

MAINTAINER Jiayu Liu <etareduce@gmail.com>

ENV HOME /opt/fake-leancloud-auth

WORKDIR $HOME

ADD package.json npm-shrinkwrap.json $HOME/

RUN npm install

ADD . $HOME/

RUN npm run build && \
    npm prune --production && \
    npm cache clean

EXPOSE 3000

ENV NODE_ENV production
ENV MONGO_URL mongodb://mongo:27017/local

CMD ["npm", "run", "start:prod"]

