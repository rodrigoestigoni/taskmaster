FROM node:18-alpine as build

WORKDIR /app

# Copiar apenas package.json e package-lock.json primeiro
COPY package.json package-lock.json* ./

# Usar cache para acelerar instalações subsequentes
RUN npm ci

# Agora copie o resto do código fonte
COPY . .

# Construir para produção
RUN npm run build

# Segunda etapa: servidor de produção
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html/taskmaster
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]