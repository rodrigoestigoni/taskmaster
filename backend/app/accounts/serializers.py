from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'] = serializers.EmailField(required=True)
        self.fields['password'] = serializers.CharField(required=True, write_only=True)
        self.fields.pop('username', None)  # Remove o campo username
        
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        try:
            user = User.objects.get(email=email)
            # Adiciona o username para o validador interno
            attrs['username'] = user.username
            
            # Valida as credenciais usando o validador do JWT
            validated_data = super().validate(attrs)
            return validated_data
            
        except User.DoesNotExist:
            raise serializers.ValidationError("Nenhuma conta encontrada com este email.")

class CustomRegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    
    def validate_email(self, email):
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Este email já está em uso.")
        return email
    
    def validate(self, data):
        if data['password1'] != data['password2']:
            raise serializers.ValidationError("As senhas não coincidem.")
        return data