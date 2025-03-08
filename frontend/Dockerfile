FROM node:18-alpine as build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . ./
RUN npm run build

# Configurar variáveis de ambiente para build
ENV PUBLIC_URL=/
ENV REACT_APP_API_URL=/api

# Segunda etapa: servidor de produção
FROM nginx:alpine

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html/taskmaster
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]