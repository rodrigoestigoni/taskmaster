from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
import logging
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


class AuthDebugView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        try:
            user = User.objects.get(email=email)
            
            return Response({
                'user_details': {
                    'username': user.username,
                    'email': user.email,
                    'is_active': user.is_active,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                }
            })
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

class CustomLoginTestView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({
                'error': 'Email e senha são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from django.contrib.auth.models import User
            user = User.objects.get(email=email)
            
            logger.error(f"Usuário encontrado: {user.username}")
            logger.error(f"Email informado: {email}")
            logger.error(f"Email do usuário: {user.email}")
            logger.error(f"Usuário está ativo: {user.is_active}")
            logger.error(f"Usuário é staff: {user.is_staff}")
            logger.error(f"Usuário é superusuário: {user.is_superuser}")
            
            # Verificar senha diretamente
            is_password_correct = user.check_password(password)
            logger.error(f"Senha está correta: {is_password_correct}")
            
            # Tentativa de autenticação com TODOS os backends
            from django.contrib.auth import get_backends
            auth_backends = get_backends()
            
            authenticated_user = None
            for backend in auth_backends:
                try:
                    user_from_backend = backend.authenticate(request, username=user.username, password=password)
                    if user_from_backend:
                        authenticated_user = user_from_backend
                        logger.error(f"Autenticado por backend: {backend.__class__.__name__}")
                        break
                except Exception as e:
                    logger.error(f"Erro no backend {backend.__class__.__name__}: {str(e)}")
            
            if authenticated_user is None:
                return Response({
                    'error': 'Falha na autenticação. Backends não conseguiram autenticar.',
                    'details': {
                        'username': user.username,
                        'email': user.email,
                        'is_active': user.is_active,
                        'is_staff': user.is_staff,
                        'is_superuser': user.is_superuser
                    }
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            return Response({
                'message': 'Login bem-sucedido',
                'username': user.username
            })
        
        except User.DoesNotExist:
            return Response({
                'error': 'Usuário não encontrado'
            }, status=status.HTTP_404_NOT_FOUND)