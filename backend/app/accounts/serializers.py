from django.contrib.auth.models import User
from rest_framework import serializers
from dj_rest_auth.serializers import LoginSerializer as DefaultLoginSerializer
from django.contrib.auth import authenticate
import logging

logger = logging.getLogger(__name__)

class CustomLoginSerializer(DefaultLoginSerializer):
    email = serializers.EmailField(required=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        logger.error(f"Login attempt for email: {email}")
        
        try:
            # Encontrar o usuário pelo email
            user = User.objects.get(email=email)
            
            # Autenticar usando o username
            user = authenticate(username=user.username, password=password)
            
            if user is None:
                logger.error(f"Authentication failed for email: {email}")
                raise serializers.ValidationError("Unable to log in with provided credentials.")
            
            if not user.is_active:
                logger.error(f"User is not active: {email}")
                raise serializers.ValidationError("User account is not active.")
            
            # Adicionar username para compatibilidade
            attrs['username'] = user.username
        
        except User.DoesNotExist:
            logger.error(f"No user found with email: {email}")
            raise serializers.ValidationError("No user found with this email.")
        
        return super().validate(attrs)