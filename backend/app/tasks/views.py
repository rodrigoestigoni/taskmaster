from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime, timedelta
from django.db.models import Q, Sum, Count, Case, When, IntegerField, F
from django.utils import timezone

from .models import Task, Category, Goal, TaskOccurrence, UserPreference
from .serializers import (
    TaskSerializer, CategorySerializer, GoalSerializer, 
    TaskOccurrenceSerializer, UserPreferenceSerializer,
    TaskReportSerializer, GoalReportSerializer, DashboardSerializer
)


class CategoryViewSet(viewsets.ModelViewSet):
    """API para gerenciar categorias"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'description']
    filterset_fields = ['name']


class GoalViewSet(viewsets.ModelViewSet):
    """API para gerenciar metas"""
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'description']
    filterset_fields = ['category', 'period', 'is_completed']

    def get_queryset(self):
        """Retorna apenas metas do usuário atual"""
        return Goal.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Salva a meta atribuindo o usuário atual"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Endpoint para atualizar o progresso manualmente"""
        goal = self.get_object()
        
        try:
            new_value = float(request.data.get('value', 0))
            goal.current_value = new_value
            goal.update_progress()
            
            return Response({
                'status': 'success',
                'current_value': goal.current_value,
                'progress_percentage': goal.progress_percentage,
                'is_completed': goal.is_completed
            })
        except ValueError:
            return Response({'error': 'Valor inválido'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def report(self, request):
        """Gera relatório de progresso das metas"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.get_queryset()
        
        if start_date:
            queryset = queryset.filter(start_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(end_date__lte=end_date)
            
        # Agrupar por categoria
        category_data = queryset.values('category__name').annotate(
            total=Count('id'),
            completed=Sum(Case(When(is_completed=True, then=1), default=0, output_field=IntegerField())),
            in_progress=Sum(Case(When(is_completed=False, then=1), default=0, output_field=IntegerField())),
            avg_progress=Sum(F('progress_percentage')) / Count('id')
        )
        
        # Agrupar por período
        period_data = queryset.values('period').annotate(
            total=Count('id'),
            completed=Sum(Case(When(is_completed=True, then=1), default=0, output_field=IntegerField())),
            avg_progress=Sum(F('progress_percentage')) / Count('id')
        )
        
        serializer = GoalReportSerializer({
            'categories': category_data,
            'periods': period_data,
            'total_goals': queryset.count(),
            'completed_goals': queryset.filter(is_completed=True).count(),
            'avg_progress': queryset.aggregate(avg=Sum(F('progress_percentage')) / Count('id'))['avg'] or 0,
        })
        
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    """API para gerenciar tarefas"""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ['title', 'description', 'notes']
    filterset_fields = ['category', 'date', 'priority', 'status', 'repeat_pattern']
    ordering_fields = ['date', 'start_time', 'priority', 'created_at']
    ordering = ['date', 'start_time']

    def get_queryset(self):
        """Retorna apenas tarefas do usuário atual"""
        return Task.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Salva a tarefa atribuindo o usuário atual"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Retorna tarefas para o dia atual"""
        today = timezone.localdate()
        queryset = self.get_queryset().filter(date=today)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def week(self, request):
        """Retorna tarefas para a semana atual"""
        today = timezone.localdate()
        start_of_week = today - timedelta(days=today.weekday())  # Segunda-feira
        end_of_week = start_of_week + timedelta(days=6)  # Domingo
        
        queryset = self.get_queryset().filter(date__range=[start_of_week, end_of_week])
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def month(self, request):
        """Retorna tarefas para o mês atual"""
        today = timezone.localdate()
        queryset = self.get_queryset().filter(
            date__year=today.year,
            date__month=today.month
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Marcar tarefa como concluída"""
        task = self.get_object()
        actual_value = request.data.get('actual_value')
        notes = request.data.get('notes')
        
        # Para tarefas recorrentes, criar uma ocorrência
        if task.repeat_pattern != 'none':
            occurrence_date = request.data.get('date', timezone.localdate())
            
            occurrence, created = TaskOccurrence.objects.get_or_create(
                task=task,
                date=occurrence_date,
                defaults={
                    'status': 'completed',
                    'actual_value': actual_value,
                    'notes': notes
                }
            )
            
            if not created:
                occurrence.status = 'completed'
                occurrence.actual_value = actual_value
                occurrence.notes = notes
                occurrence.save()
            
            serializer = TaskOccurrenceSerializer(occurrence)
            return Response(serializer.data)
        else:  # Este else está causando o problema
            # Para tarefas não recorrentes
            task.status = 'completed'
            task.actual_value = actual_value
            task.notes = notes or task.notes
            task.save()
            
            serializer = self.get_serializer(task)
            return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def report(self, request):
        """Gera relatório de progresso das tarefas"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.get_queryset()
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        # Agrupar por status
        status_data = queryset.values('status').annotate(
            count=Count('id'),
            percentage=Count('id') * 100.0 / queryset.count()
        )
        
        # Agrupar por categoria
        category_data = queryset.values('category__name', 'category__color').annotate(
            count=Count('id'),
            completed=Sum(Case(When(status='completed', then=1), default=0, output_field=IntegerField())),
            pending=Sum(Case(When(status='pending', then=1), default=0, output_field=IntegerField())),
            failed=Sum(Case(When(status='failed', then=1), default=0, output_field=IntegerField())),
            percentage=Count('id') * 100.0 / queryset.count()
        )
        
        # Agrupar por dia
        day_data = queryset.values('date').annotate(
            total=Count('id'),
            completed=Sum(Case(When(status='completed', then=1), default=0, output_field=IntegerField())),
            completion_rate=Sum(Case(When(status='completed', then=1), default=0, output_field=IntegerField())) * 100.0 / Count('id')
        ).order_by('date')
        
        serializer = TaskReportSerializer({
            'status': status_data,
            'categories': category_data,
            'days': day_data,
            'total_tasks': queryset.count(),
            'completed_tasks': queryset.filter(status='completed').count(),
            'completion_rate': queryset.filter(status='completed').count() * 100.0 / queryset.count() if queryset.count() > 0 else 0,
        })
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Retorna dados consolidados para o dashboard"""
        # Tarefas hoje
        today = timezone.localdate()
        tasks_today = self.get_queryset().filter(date=today)
        
        # Tarefas da semana
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        tasks_week = self.get_queryset().filter(date__range=[start_of_week, end_of_week])
        
        # Progresso das metas
        goals = Goal.objects.filter(user=request.user)
        active_goals = goals.filter(end_date__gte=today, is_completed=False)
        
        # Estatísticas de conclusão
        tasks_last_30_days = self.get_queryset().filter(
            date__range=[today - timedelta(days=30), today]
        )
        
        completion_by_day = tasks_last_30_days.values('date').annotate(
            total=Count('id'),
            completed=Sum(Case(When(status='completed', then=1), default=0, output_field=IntegerField())),
            rate=Sum(Case(When(status='completed', then=1), default=0, output_field=IntegerField())) * 100.0 / Count('id')
        ).order_by('date')
        
        serializer = DashboardSerializer({
            'today': {
                'total': tasks_today.count(),
                'completed': tasks_today.filter(status='completed').count(),
                'in_progress': tasks_today.filter(status='in_progress').count(),
                'pending': tasks_today.filter(status='pending').count(),
                'high_priority': tasks_today.filter(priority__gte=3).count(),
            },
            'week': {
                'total': tasks_week.count(),
                'completed': tasks_week.filter(status='completed').count(),
                'completion_rate': tasks_week.filter(status='completed').count() * 100.0 / tasks_week.count() if tasks_week.count() > 0 else 0,
            },
            'goals': {
                'total': goals.count(),
                'active': active_goals.count(),
                'completed': goals.filter(is_completed=True).count(),
                'close_to_deadline': active_goals.filter(end_date__lte=today + timedelta(days=7)).count(),
            },
            'completion_trend': list(completion_by_day),
        })
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Atualizar status da tarefa"""
        task = self.get_object()
        status_value = request.data.get('status')
        notes = request.data.get('notes')
        actual_value = request.data.get('actual_value')
        
        if status_value not in dict(Task.STATUS_CHOICES):
            return Response({'error': 'Status inválido'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Para tarefas recorrentes, criar uma ocorrência
        if task.repeat_pattern != 'none':
            occurrence_date = request.data.get('date', timezone.localdate())
            
            occurrence, created = TaskOccurrence.objects.get_or_create(
                task=task,
                date=occurrence_date,
                defaults={
                    'status': status_value,
                    'actual_value': actual_value,
                    'notes': notes
                }
            )
            
            if not created:
                occurrence.status = status_value
                if actual_value is not None:
                    occurrence.actual_value = actual_value
                if notes:
                    occurrence.notes = notes
                occurrence.save()
            
            serializer = TaskOccurrenceSerializer(occurrence)
            return Response(serializer.data)