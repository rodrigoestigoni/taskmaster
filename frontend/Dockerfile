FROM node:18-alpine as build

WORKDIR /app

# Copiar apenas package.json e package-lock.json primeiro
COPY package.json package-lock.json* ./

# Usar cache para acelerar instalações subsequentes
RUN npm ci

# Agora copie o resto do código fonte
COPY . .

# Configurar variáveis de ambiente para build
ENV PUBLIC_URL=/taskmaster
ENV REACT_APP_API_URL=/taskmaster/api

# Construir para produção
RUN npm run build

# Segunda etapa: servidor de produção
FROM nginx:alpine

# Remover todas as configurações padrão
RUN rm -rf /etc/nginx/conf.d/* \
    && rm -rf /usr/share/nginx/html/* 

# Criar diretório para taskmaster
RUN mkdir -p /usr/share/nginx/html/taskmaster \
    && chmod 755 /usr/share/nginx/html/taskmaster

# Copiar build do React para pasta de servir
COPY --from=build /app/build /etc/nginx/html/

# Copiar configuração do NGINX
COPY nginx/nginx.conf /etc/nginx/conf.d/taskmaster.conf

# Debugging - print out contents
RUN ls -la /etc/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]