FROM node:18-alpine as build

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* ./
RUN npm install

# Copiar o código fonte
COPY . .

# Construir para produção
RUN npm run build

# Segunda etapa: servidor de produção
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html/taskmaster
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]