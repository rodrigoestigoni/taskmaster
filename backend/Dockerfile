FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc

# Instalar dependências
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copiar o projeto
COPY . .

# Expor a porta
EXPOSE 8440

# CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]
CMD ["uvicorn", "core.asgi:application", "--host", "0.0.0.0", "--port", "8440", "--ssl-keyfile", "/etc/letsencrypt/live/ultimoingresso.com.br/privkey.pem", "--ssl-certfile", "/etc/letsencrypt/live/ultimoingresso.com.br/fullchain.pem"]
