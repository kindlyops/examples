ARG ARCH=
FROM ${ARCH}node:alpine
RUN mkdir -p /usr/src/calc
WORKDIR /usr/src/calc
COPY . .
RUN npm install

CMD [ "node", "calculator.js" ]
