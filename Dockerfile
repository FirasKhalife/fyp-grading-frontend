#Stage 1
FROM node:18-alpine AS base
WORKDIR /app
COPY package.json .
RUN npm install -g npm@9.6.6
RUN npm install
COPY . .
RUN npm run build
RUN cd target/classes/static/ && pwd

#Stage 2
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/* && rm -rf /etc/nginx/nginx.conf
COPY ./nginx.conf /etc/nginx/nginx.conf
COPY --from=base /app/target/classes/static /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]