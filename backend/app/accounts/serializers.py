from django.contrib.auth.models import User
from rest_framework import serializers
from dj_rest_auth.serializers import LoginSerializer as DefaultLoginSerializer

class CustomLoginSerializer(DefaultLoginSerializer):
    username = None  # Remove o campo username
    email = serializers.EmailField(required=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        # Encontrar o usuário pelo email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Nenhum usuário encontrado com este email.")
        
        # ValidationError será lançado pelo DefaultLoginSerializer se a senha estiver errada
        attrs['username'] = user.username
        return super().validate(attrs)