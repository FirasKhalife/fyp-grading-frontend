# Stage 1
FROM node:18-alpine AS base
WORKDIR /app
COPY package.json .
RUN npm install -g npm@10.2.4
RUN npm install
COPY . .
RUN npx vite build
RUN cd dist && pwd

# Stage 2
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/* && rm -rf /etc/nginx/nginx.conf
COPY ./nginx.conf /etc/nginx/nginx.conf
COPY --from=base /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
