from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from datetime import date, datetime, timedelta
from django.db.models import Q, Sum, Count, Case, When, IntegerField, F
from django.utils import timezone

from .services import EnergyMatchService
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
    
    @action(detail=True, methods=['get'])
    def related_tasks(self, request, pk=None):
        """Retorna tarefas relacionadas a uma meta específica"""
        goal = self.get_object()
        tasks = Task.objects.filter(goal=goal)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
        
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
    def day(self, request):
        """Retorna tarefas para uma data específica, incluindo ocorrências geradas dinamicamente"""
        date_str = request.query_params.get('date', None)
        if not date_str:
            date = timezone.localdate()
        else:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Formato de data inválido'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Obter tarefas não recorrentes para esta data
        non_recurring_tasks = self.get_queryset().filter(
            date=date, 
            repeat_pattern='none'
        )
        
        # Obter tarefas recorrentes que se aplicam a esta data
        recurring_tasks = []
        recurring_query = self.get_queryset().exclude(repeat_pattern='none')
        
        for task in recurring_query:
            # Verificar se a data está dentro do período de recorrência
            if task.date <= date and (not task.repeat_end_date or date <= task.repeat_end_date):
                # Verificar se a tarefa se aplica a este dia da semana
                weekday = date.weekday()  # 0 = Segunda, 6 = Domingo
                
                applies = False
                if task.repeat_pattern == 'daily':
                    applies = True
                elif task.repeat_pattern == 'weekdays' and weekday < 5:  # Segunda a Sexta
                    applies = True
                elif task.repeat_pattern == 'weekends' and weekday >= 5:  # Sábado e Domingo
                    applies = True
                elif task.repeat_pattern == 'weekly' and task.date.weekday() == weekday:
                    # Mesmo dia da semana da tarefa original
                    applies = True
                elif task.repeat_pattern == 'monthly' and task.date.day == date.day:
                    # Mesmo dia do mês
                    applies = True
                elif task.repeat_pattern == 'custom' and task.repeat_days:
                    # Verificar dias personalizados
                    days = [int(d) for d in task.repeat_days.split(',')]
                    applies = weekday in days
                
                if applies:
                    # Verificar se já existe uma ocorrência para esta data
                    try:
                        occurrence = TaskOccurrence.objects.get(task=task, date=date)
                        # Usar os dados da ocorrência existente
                        task_data = self.get_serializer(task).data
                        task_data.update({
                            'status': occurrence.status,
                            'actual_value': occurrence.actual_value,
                            'notes': occurrence.notes,
                            'is_occurrence': True,
                            'occurrence_id': occurrence.id
                        })
                        recurring_tasks.append(task_data)
                    except TaskOccurrence.DoesNotExist:
                        # Criar uma representação virtual (sem salvar no banco)
                        task_data = self.get_serializer(task).data
                        task_data.update({
                            'is_occurrence': True,
                            'occurrence_id': None
                        })
                        recurring_tasks.append(task_data)
        
        # Combinar tarefas não recorrentes e recorrentes
        all_tasks = list(self.get_serializer(non_recurring_tasks, many=True).data) + recurring_tasks
        
        return Response(all_tasks)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Retorna tarefas para o dia atual, incluindo ocorrências geradas para tarefas recorrentes"""
        date_str = request.query_params.get('date')
        if date_str:
            try:
                selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                selected_date = timezone.localdate()
        else:
            selected_date = timezone.localdate()
        
        print(f"[DEBUG] Buscando tarefas para o dia: {selected_date}")
        
        # 1. Obter tarefas normais (não recorrentes) para este dia
        normal_tasks = self.get_queryset().filter(
            date=selected_date,
            repeat_pattern='none'
        )
        
        # 2. Obter ocorrências existentes para tarefas recorrentes
        task_occurrences = TaskOccurrence.objects.filter(
            date=selected_date,
            task__user=request.user
        ).select_related('task')
        
        occurrence_tasks = []
        for occurrence in task_occurrences:
            task_data = self.get_serializer(occurrence.task).data
            task_data.update({
                'date': occurrence.date.isoformat(),
                'status': occurrence.status,
                'actual_value': occurrence.actual_value,
                'notes': occurrence.notes,
                'is_occurrence': True,
                'occurrence_id': occurrence.id
            })
            occurrence_tasks.append(task_data)
        
        # 3. Gerar tarefas recorrentes que ainda não têm ocorrências
        recurring_tasks = self.get_queryset().exclude(repeat_pattern='none')
        
        generated_tasks = []
        for task in recurring_tasks:
            # Não considerar se a data inicial é posterior ao dia selecionado
            if task.date > selected_date:
                continue
            
            # Não considerar se a data final da recorrência é anterior ao dia selecionado
            if task.repeat_end_date and task.repeat_end_date < selected_date:
                continue
            
            # Verificar se a tarefa se aplica a este dia
            weekday = selected_date.weekday()  # 0=Segunda, 6=Domingo
            
            applies = False
            if task.repeat_pattern == 'daily':
                applies = True
            elif task.repeat_pattern == 'weekdays' and weekday < 5:
                applies = True
            elif task.repeat_pattern == 'weekends' and weekday >= 5:
                applies = True
            elif task.repeat_pattern == 'weekly' and task.date.weekday() == weekday:
                # Verificar se a semana é correta (a cada X semanas)
                days_diff = (selected_date - task.date).days
                weeks_diff = days_diff // 7
                applies = weeks_diff % 1 == 0  # Repetir a cada semana
            elif task.repeat_pattern == 'monthly' and task.date.day == selected_date.day:
                applies = True
            elif task.repeat_pattern == 'custom' and task.repeat_days:
                days = [int(d) for d in task.repeat_days.split(',')]
                applies = weekday in days
            
            # Se a tarefa se aplica e a data é válida
            if applies and selected_date >= task.date:
                if task.repeat_end_date and selected_date > task.repeat_end_date:
                    # Não aplicar se já passou da data final
                    continue
                
                # Verificar se já existe uma ocorrência para esta data
                occurrence_exists = any(
                    o.get('date') == selected_date.isoformat() and o.get('id') == task.id
                    for o in occurrence_tasks
                )
                
                if not occurrence_exists:
                    task_data = self.get_serializer(task).data
                    task_data.update({
                        'date': selected_date.isoformat(),
                        'is_generated': True
                    })
                    generated_tasks.append(task_data)
        
        # Combinar todas as tarefas
        all_tasks = list(self.get_serializer(normal_tasks, many=True).data)
        all_tasks.extend(occurrence_tasks)
        all_tasks.extend(generated_tasks)
        
        return Response(all_tasks)
    
    @action(detail=False, methods=['get'])
    def week(self, request):
        """Retorna tarefas para a semana atual, incluindo ocorrências geradas para tarefas recorrentes"""
        today = timezone.localdate()
        
        # Obter datas da semana a partir de parâmetros ou usar a semana atual
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                start_date = today - timedelta(days=today.weekday())  # Segunda-feira
                end_date = start_date + timedelta(days=6)  # Domingo
        else:
            start_date = today - timedelta(days=today.weekday())  # Segunda-feira
            end_date = start_date + timedelta(days=6)  # Domingo
        
        print(f"[DEBUG] Buscando tarefas para a semana: {start_date} a {end_date}")
        
        # 1. Obter tarefas normais (não recorrentes) para esta semana
        normal_tasks = self.get_queryset().filter(
            date__range=[start_date, end_date],
            repeat_pattern='none'
        )
        
        # 2. Obter ocorrências existentes para tarefas recorrentes
        task_occurrences = TaskOccurrence.objects.filter(
            date__range=[start_date, end_date],
            task__user=request.user
        ).select_related('task')
        
        occurrence_tasks = []
        for occurrence in task_occurrences:
            task_data = self.get_serializer(occurrence.task).data
            task_data.update({
                'date': occurrence.date.isoformat(),
                'status': occurrence.status,
                'actual_value': occurrence.actual_value,
                'notes': occurrence.notes,
                'is_occurrence': True,
                'occurrence_id': occurrence.id
            })
            occurrence_tasks.append(task_data)
        
        # 3. Gerar tarefas recorrentes que ainda não têm ocorrências
        recurring_tasks = self.get_queryset().exclude(repeat_pattern='none')
        
        generated_tasks = []
        for task in recurring_tasks:
            # Não considerar se a data inicial é posterior ao fim da semana
            if task.date > end_date:
                continue
            
            # Não considerar se a data final da recorrência é anterior ao início da semana
            if task.repeat_end_date and task.repeat_end_date < start_date:
                continue
            
            # Para cada dia da semana
            current_date = start_date
            while current_date <= end_date:
                # Verificar se a tarefa se aplica a este dia
                weekday = current_date.weekday()  # 0=Segunda, 6=Domingo
                
                applies = False
                if task.repeat_pattern == 'daily':
                    applies = True
                elif task.repeat_pattern == 'weekdays' and weekday < 5:
                    applies = True
                elif task.repeat_pattern == 'weekends' and weekday >= 5:
                    applies = True
                elif task.repeat_pattern == 'weekly' and task.date.weekday() == weekday:
                    # Verificar se a semana é correta (a cada X semanas)
                    days_diff = (current_date - task.date).days
                    weeks_diff = days_diff // 7
                    applies = weeks_diff % 1 == 0  # Repetir a cada semana
                elif task.repeat_pattern == 'monthly' and task.date.day == current_date.day:
                    applies = True
                elif task.repeat_pattern == 'custom' and task.repeat_days:
                    days = [int(d) for d in task.repeat_days.split(',')]
                    applies = weekday in days
                
                # Se a tarefa se aplica e a data é válida
                if applies and current_date >= task.date:
                    if task.repeat_end_date and current_date > task.repeat_end_date:
                        # Não aplicar se já passou da data final
                        current_date += timedelta(days=1)
                        continue
                    
                    # Verificar se já existe uma ocorrência para esta data
                    # (se já foi incluída acima)
                    occurrence_exists = any(
                        o.get('date') == current_date.isoformat() and o.get('id') == task.id
                        for o in occurrence_tasks
                    )
                    
                    if not occurrence_exists:
                        task_data = self.get_serializer(task).data
                        task_data.update({
                            'date': current_date.isoformat(),
                            'is_generated': True
                        })
                        generated_tasks.append(task_data)
                
                current_date += timedelta(days=1)
        
        # Combinar todas as tarefas
        all_tasks = list(self.get_serializer(normal_tasks, many=True).data)
        all_tasks.extend(occurrence_tasks)
        all_tasks.extend(generated_tasks)
        
        return Response(all_tasks)

    # Modifique de forma semelhante o método month:
    @action(detail=False, methods=['get'])
    def month(self, request):
        """Retorna tarefas para o mês, incluindo ocorrências geradas para tarefas recorrentes"""
        today = timezone.localdate()
        
        # Obter datas do mês a partir de parâmetros ou usar o mês atual
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))
        
        # Primeiro e último dia do mês
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        print(f"[DEBUG] Buscando tarefas para o mês: {start_date} a {end_date}")
        
        # Usar a mesma lógica da função week, adaptada para o período do mês
        # 1. Obter tarefas normais (não recorrentes) para este mês
        normal_tasks = self.get_queryset().filter(
            date__range=[start_date, end_date],
            repeat_pattern='none'
        )
        
        # 2. Obter ocorrências existentes para tarefas recorrentes
        task_occurrences = TaskOccurrence.objects.filter(
            date__range=[start_date, end_date],
            task__user=request.user
        ).select_related('task')
        
        occurrence_tasks = []
        for occurrence in task_occurrences:
            task_data = self.get_serializer(occurrence.task).data
            task_data.update({
                'date': occurrence.date.isoformat(),
                'status': occurrence.status,
                'actual_value': occurrence.actual_value,
                'notes': occurrence.notes,
                'is_occurrence': True,
                'occurrence_id': occurrence.id
            })
            occurrence_tasks.append(task_data)
        
        # 3. Gerar tarefas recorrentes que ainda não têm ocorrências
        recurring_tasks = self.get_queryset().exclude(repeat_pattern='none')
        
        generated_tasks = []
        for task in recurring_tasks:
            # Não considerar se a data inicial é posterior ao fim do mês
            if task.date > end_date:
                continue
            
            # Não considerar se a data final da recorrência é anterior ao início do mês
            if task.repeat_end_date and task.repeat_end_date < start_date:
                continue
            
            # Para cada dia do mês
            current_date = start_date
            while current_date <= end_date:
                # Verificar se a tarefa se aplica a este dia (mesma lógica da função week)
                weekday = current_date.weekday()
                
                applies = False
                if task.repeat_pattern == 'daily':
                    applies = True
                elif task.repeat_pattern == 'weekdays' and weekday < 5:
                    applies = True
                elif task.repeat_pattern == 'weekends' and weekday >= 5:
                    applies = True
                elif task.repeat_pattern == 'weekly' and task.date.weekday() == weekday:
                    # Verificar se a semana é correta (a cada X semanas)
                    days_diff = (current_date - task.date).days
                    weeks_diff = days_diff // 7
                    applies = weeks_diff % 1 == 0  # Repetir a cada semana
                elif task.repeat_pattern == 'monthly' and task.date.day == current_date.day:
                    applies = True
                elif task.repeat_pattern == 'custom' and task.repeat_days:
                    days = [int(d) for d in task.repeat_days.split(',')]
                    applies = weekday in days
                
                # Se a tarefa se aplica e a data é válida
                if applies and current_date >= task.date:
                    if task.repeat_end_date and current_date > task.repeat_end_date:
                        # Não aplicar se já passou da data final
                        current_date += timedelta(days=1)
                        continue
                    
                    # Verificar se já existe uma ocorrência para esta data
                    occurrence_exists = any(
                        o.get('date') == current_date.isoformat() and o.get('id') == task.id
                        for o in occurrence_tasks
                    )
                    
                    if not occurrence_exists:
                        task_data = self.get_serializer(task).data
                        task_data.update({
                            'date': current_date.isoformat(),
                            'is_generated': True
                        })
                        generated_tasks.append(task_data)
                
                current_date += timedelta(days=1)
        
        # Combinar todas as tarefas
        all_tasks = list(self.get_serializer(normal_tasks, many=True).data)
        all_tasks.extend(occurrence_tasks)
        all_tasks.extend(generated_tasks)
        
        return Response(all_tasks)
    
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
            
            # Atualizar meta associada se existir
            if task.goal and actual_value:
                task.goal.current_value += float(actual_value)
                task.goal.update_progress()
            
            serializer = TaskOccurrenceSerializer(occurrence)
            return Response(serializer.data)
        else:
            # Para tarefas não recorrentes
            task.status = 'completed'
            task.actual_value = actual_value
            task.notes = notes or task.notes
            task.save()
            
            # Atualizar meta associada se existir
            if task.goal and actual_value:
                task.goal.current_value += float(actual_value)
                task.goal.update_progress()
            
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
    
    @action(detail=True, methods=['get'])
    def occurrence(self, request, pk=None):
        """Retorna a ocorrência de uma tarefa para uma data específica"""
        task = self.get_object()
        date_str = request.query_params.get('date')
        
        if not date_str:
            return Response({'error': 'Data não especificada'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Formato de data inválido'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            occurrence = TaskOccurrence.objects.get(task=task, date=date)
            serializer = TaskOccurrenceSerializer(occurrence)
            return Response(serializer.data)
        except TaskOccurrence.DoesNotExist:
            return Response({'error': 'Ocorrência não encontrada'}, status=status.HTTP_404_NOT_FOUND)
            
    @action(detail=True, methods=['delete'])
    def delete_recurring(self, request, pk=None):
        """
        Excluir tarefa recorrente com opções:
        - 'only_this': apenas a ocorrência específica
        - 'this_and_future': esta ocorrência e todas futuras
        - 'all': todas as ocorrências (tarefa inteira)
        """
        task = self.get_object()
        delete_mode = request.query_params.get('mode', 'only_this')
        date_str = request.query_params.get('date')
        
        if not date_str and delete_mode != 'all':
            return Response(
                {'error': 'Data é obrigatória para excluir ocorrências específicas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if delete_mode != 'all':
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Formato de data inválido. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Caso 1: Excluir apenas a ocorrência específica
        if delete_mode == 'only_this':
            try:
                occurrence = TaskOccurrence.objects.get(task=task, date=date)
                occurrence.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except TaskOccurrence.DoesNotExist:
                # Se não existir uma ocorrência, criar uma com status 'skipped'
                TaskOccurrence.objects.create(
                    task=task,
                    date=date,
                    status='skipped',
                    notes="Excluída pelo usuário"
                )
                return Response(status=status.HTTP_204_NO_CONTENT)
        
        # Caso 2: Excluir esta ocorrência e todas as futuras
        elif delete_mode == 'this_and_future':
            # Atualizar a data final de recorrência para o dia anterior
            if date <= task.date:
                # Se a data for a data inicial ou anterior, excluir a tarefa inteira
                task.delete()
            else:
                # Caso contrário, atualizar a data final
                task.repeat_end_date = date - timedelta(days=1)
                task.save()
                
                # Excluir ocorrências desta data em diante
                TaskOccurrence.objects.filter(task=task, date__gte=date).delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        # Caso 3: Excluir todas as ocorrências (tarefa inteira)
        elif delete_mode == 'all':
            task.delete()  # Isso já exclui todas as ocorrências devido a DELETE CASCADE
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        return Response(
            {'error': 'Modo de exclusão inválido'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Atualizar status da tarefa"""
        task = self.get_object()
        status_value = request.data.get('status')
        notes = request.data.get('notes')
        actual_value = request.data.get('actual_value')
        
        print(f"[DEBUG] Atualizando status da tarefa {task.id} para {status_value}")
        print(f"[DEBUG] Valor recebido: {actual_value}, Tipo: {type(actual_value)}")
        print(f"[DEBUG] Meta associada: {task.goal.id if task.goal else 'Nenhuma'}")
        
        if status_value not in dict(Task.STATUS_CHOICES):
            return Response({'error': 'Status inválido'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar se está marcando como concluída
        is_completing = status_value == 'completed'
        
        # Para tarefas recorrentes, criar uma ocorrência
        if task.repeat_pattern != 'none':
            occurrence_date = request.data.get('date', timezone.localdate())
            
            # Verificar o formato da data
            if isinstance(occurrence_date, str):
                try:
                    occurrence_date = datetime.strptime(occurrence_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response({'error': 'Formato de data inválido'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar se já existe uma ocorrência com status completed
            previous_occurrence = None
            try:
                previous_occurrence = TaskOccurrence.objects.get(task=task, date=occurrence_date)
                was_already_completed = previous_occurrence.status == 'completed'
            except TaskOccurrence.DoesNotExist:
                was_already_completed = False
            
            # Criar ou atualizar a ocorrência
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
                # Se a ocorrência já existia, atualizar seus campos
                old_status = occurrence.status
                occurrence.status = status_value
                if actual_value is not None:
                    occurrence.actual_value = actual_value
                if notes:
                    occurrence.notes = notes
                occurrence.save()
            
            # Atualizar meta associada apenas se:
            # 1. Existe uma meta
            # 2. Estamos marcando como concluída agora (não estava concluída antes)
            # 3. Temos um valor real para contribuir
            if (is_completing and not was_already_completed and 
                task.goal and actual_value is not None):
                
                # Converter para float se for string
                if isinstance(actual_value, str):
                    try:
                        actual_value = float(actual_value)
                    except ValueError:
                        return Response({'error': 'Valor inválido'}, status=status.HTTP_400_BAD_REQUEST)
                
                goal = task.goal
                print(f"[DEBUG] Atualizando meta {goal.id}. Valor atual: {goal.current_value}")
                print(f"[DEBUG] Adicionando valor: {actual_value}")
                
                goal.current_value += actual_value
                goal.update_progress()
                
                print(f"[DEBUG] Meta atualizada. Novo valor: {goal.current_value}")
            
            serializer = TaskOccurrenceSerializer(occurrence)
            return Response(serializer.data)
        else:
            # Para tarefas não recorrentes
            old_status = task.status
            was_already_completed = old_status == 'completed'
            
            # Atualizar a tarefa
            task.status = status_value
            if actual_value is not None:
                task.actual_value = actual_value
            if notes:
                task.notes = notes
            task.save()
            
            # Atualizar meta associada apenas se:
            # 1. Existe uma meta
            # 2. Estamos marcando como concluída agora (não estava concluída antes)
            # 3. Temos um valor real para contribuir
            if (is_completing and not was_already_completed and 
                task.goal and actual_value is not None):
                
                # Converter para float se for string
                if isinstance(actual_value, str):
                    try:
                        actual_value = float(actual_value)
                    except ValueError:
                        return Response({'error': 'Valor inválido'}, status=status.HTTP_400_BAD_REQUEST)
                
                goal = task.goal
                print(f"[DEBUG] Atualizando meta {goal.id}. Valor atual: {goal.current_value}")
                print(f"[DEBUG] Adicionando valor: {actual_value}")
                
                goal.current_value += actual_value
                goal.update_progress()
                
                print(f"[DEBUG] Meta atualizada. Novo valor: {goal.current_value}")
            
            serializer = self.get_serializer(task)
            return Response(serializer.data)
            
    @action(detail=False, methods=['get'])
    def energy_recommendations(self, request):
        """Retorna tarefas recomendadas com base no nível de energia atual"""
        try:
            current_energy = EnergyMatchService.get_current_energy_level(request.user)
            recommended_tasks = EnergyMatchService.get_recommended_tasks(request.user)
            
            serializer = self.get_serializer(recommended_tasks, many=True)
            
            return Response({
                'current_energy_level': current_energy,
                'recommended_tasks': serializer.data
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)