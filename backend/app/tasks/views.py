from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from datetime import date, datetime, timedelta
from django.db.models import Q, Sum, Count, Case, When, IntegerField, F
from django.utils import timezone

from .utils import check_task_overlap, count_tasks_with_recurrences, count_total_tasks
from .services import EnergyMatchService
from .models import Task, Category, Goal, TaskOccurrence, UserPreference, EnergyProfile
from .serializers import (
    TaskSerializer, CategorySerializer, GoalSerializer, 
    TaskOccurrenceSerializer, UserPreferenceSerializer,
    TaskReportSerializer, GoalReportSerializer, DashboardSerializer,
    EnergyProfileSerializer
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
        """Gera relatório de progresso das tarefas"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Converter para objetos de data
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Usar a função utilitária para contar tarefas no período
        if start_date_obj and end_date_obj:
            counts = count_tasks_with_recurrences(
                request.user,
                date_range=(start_date_obj, end_date_obj)
            )
        else:
            # Se não houver período especificado, usar os últimos 30 dias
            end_date_obj = timezone.localdate()
            start_date_obj = end_date_obj - timedelta(days=30)
            counts = count_tasks_with_recurrences(
                request.user,
                date_range=(start_date_obj, end_date_obj)
            )
        
        # Formatar os dados para o serializer
        
        # 1. Status
        status_data = []
        for status, count in counts['by_status'].items():
            if counts['total'] > 0:
                percentage = (count / counts['total']) * 100
            else:
                percentage = 0
            
            status_data.append({
                'status': status,
                'count': count,
                'percentage': percentage
            })
        
        # 2. Categorias
        category_data = []
        for category_id, category_counts in counts['by_category'].items():
            try:
                category = Category.objects.get(id=category_id)
                category_name = category.name
                category_color = category.color
            except Category.DoesNotExist:
                category_name = "Desconhecida"
                category_color = "#CCCCCC"
            
            category_data.append({
                'category__name': category_name,
                'category__color': category_color,
                'count': category_counts['total'],
                'completed': category_counts['completed'],
                'pending': category_counts['pending'],
                'failed': category_counts['failed'],
                'percentage': (category_counts['total'] / counts['total'] * 100) 
                            if counts['total'] > 0 else 0
            })
        
        # 3. Contagens por dia
        day_data = []
        for date_str, day_counts in counts['by_day'].items():
            day_data.append({
                'date': datetime.strptime(date_str, '%Y-%m-%d').date(),
                'total': day_counts['total'],
                'completed': day_counts['completed'],
                'completion_rate': (day_counts['completed'] / day_counts['total'] * 100)
                                if day_counts['total'] > 0 else 0
            })
        
        # Ordenar por data
        day_data.sort(key=lambda x: x['date'])
        
        # Construir resposta
        serializer = TaskReportSerializer({
            'status': status_data,
            'categories': category_data,
            'days': day_data,
            'total_tasks': counts['total'],
            'completed_tasks': counts['by_status']['completed'],
            'completion_rate': (counts['by_status']['completed'] / counts['total'] * 100)
                            if counts['total'] > 0 else 0,
        })
        
        return Response(serializer.data)

def task_counts_by_day_formatter(by_day_dict, user=None):
    """
    Formata contagens diárias para o gráfico de tendência de conclusão.
    Garante que dados recentes sejam incluídos, mesmo os de hoje.
    
    Args:
        by_day_dict: Dicionário com contagens por dia
        user: Usuário para cálculos de hoje
    
    Returns:
        Gerador que produz dicionários formatados para o gráfico
    """
    from datetime import datetime, timedelta
    
    # Obter hoje para garantir que está incluído
    today = datetime.now().date().isoformat()
    print(f"[DEBUG] Formatando contagens por dia - hoje é {today}")
    print(f"[DEBUG] Dicionário by_day possui {len(by_day_dict)} dias: {list(by_day_dict.keys())}")
    
    # Certificar-se de que temos todas as datas no intervalo
    # Caso algumas datas não tenham tarefas
    if by_day_dict and len(by_day_dict) > 1:
        dates = sorted(by_day_dict.keys())
        start_date = datetime.strptime(dates[0], '%Y-%m-%d')
        end_date = datetime.strptime(dates[-1], '%Y-%m-%d')
        
        # Se hoje não está incluído, adicionar
        if today not in by_day_dict:
            print(f"[DEBUG] Hoje ({today}) não estava nas contagens - adicionando")
            # Acessa as contagens diretas de hoje
            from .utils import count_total_tasks
            from django.utils import timezone
            if user:
                today_counts = count_total_tasks(user=user, date=timezone.localdate())
                by_day_dict[today] = {
                    'total': today_counts['total'],
                    'completed': today_counts['completed'],
                    'pending': today_counts['pending']
                }
            else:
                # Se não houver usuário, usar valores vazios
                by_day_dict[today] = {'total': 0, 'completed': 0}
            print(f"[DEBUG] Contagens calculadas para hoje: {by_day_dict[today]}")
            end_date = max(end_date, datetime.now())
        
        # Preencher dias faltantes no intervalo
        current = start_date
        while current <= end_date:
            date_str = current.date().isoformat()
            if date_str not in by_day_dict:
                by_day_dict[date_str] = {'total': 0, 'completed': 0}
            current += timedelta(days=1)
    
    # Ordenar datas para garantir ordem cronológica
    sorted_dates = sorted(by_day_dict.keys())
    
    for date_str in sorted_dates:
        counts = by_day_dict[date_str]
        yield {
            'date': date_str,
            'total': counts['total'],
            'completed': counts['completed'],
            'rate': (counts['completed'] / counts['total'] * 100) if counts['total'] > 0 else 0
        }
        
def update_recurring_task(self, instance, request, mode, occurrence_date=None):
    """
    Atualiza uma tarefa recorrente com base no modo selecionado:
    - 'only_this': Apenas a ocorrência específica
    - 'this_and_future': Esta ocorrência e todas as futuras
    - 'all': Todas as ocorrências
    
    Args:
        instance: Instância da tarefa
        request: Request do Django
        mode: Modo de edição ('only_this', 'this_and_future', 'all')
        occurrence_date: Data da ocorrência específica (formato YYYY-MM-DD)
    
    Returns:
        Response com os dados atualizados
    """
    from django.db import transaction
    
    if mode not in ['only_this', 'this_and_future', 'all']:
        return Response(
            {'error': 'Modo de edição inválido. Use "only_this", "this_and_future" ou "all".'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Para o modo 'only_this', a data da ocorrência é obrigatória
    if mode == 'only_this' and not occurrence_date:
        return Response(
            {'error': 'Data da ocorrência é obrigatória para o modo "only_this".'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Para o modo 'this_and_future', a data da ocorrência é obrigatória
    if mode == 'this_and_future' and not occurrence_date:
        return Response(
            {'error': 'Data da ocorrência é obrigatória para o modo "this_and_future".'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verificar sobreposição (apenas para 'all' e 'this_and_future')
    if mode in ['all', 'this_and_future']:
        date = request.data.get('date', instance.date)
        start_time = request.data.get('start_time', instance.start_time)
        end_time = request.data.get('end_time', instance.end_time)
        
        ignore_overlap = request.query_params.get('ignore_overlap', 'false').lower() == 'true'
        
        if not ignore_overlap and date and start_time and end_time:
            overlapping_task = check_task_overlap(
                user=request.user,
                date=date,
                start_time=start_time,
                end_time=end_time,
                exclude_task_id=instance.id  # Excluir a própria tarefa da verificação
            )
            
            if overlapping_task:
                # Retornar erro com detalhes da sobreposição
                return Response({
                    'error': 'Sobreposição de horário detectada',
                    'overlapping_task': {
                        'id': overlapping_task.id,
                        'title': overlapping_task.title,
                        'start_time': overlapping_task.start_time,
                        'end_time': overlapping_task.end_time,
                        'date': overlapping_task.date
                    }
                }, status=status.HTTP_409_CONFLICT)
    
    try:
        with transaction.atomic():
            if mode == 'only_this':
                # Editar apenas esta ocorrência
                # Verifica se já existe uma ocorrência para esta data
                try:
                    occurrence = TaskOccurrence.objects.get(task=instance, date=occurrence_date)
                    
                    # Atualizar dados da ocorrência
                    if 'status' in request.data:
                        occurrence.status = request.data['status']
                    if 'actual_value' in request.data:
                        occurrence.actual_value = request.data['actual_value']
                    if 'notes' in request.data:
                        occurrence.notes = request.data['notes']
                    
                    occurrence.save()
                except TaskOccurrence.DoesNotExist:
                    # Se não existir, criar uma nova ocorrência modificada
                    # (Para padrões recorrentes, isso é interpretado como uma exceção à regra)
                    occurrence_data = {
                        'task': instance,
                        'date': occurrence_date,
                        'status': request.data.get('status', 'pending'),
                        'actual_value': request.data.get('actual_value'),
                        'notes': request.data.get('notes', f"Modificada em {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                    }
                    
                    # Criar registro de ocorrência
                    TaskOccurrence.objects.create(**occurrence_data)
                
                # Retornar os dados da tarefa original
                serializer = self.get_serializer(instance)
                return Response(serializer.data)
            
            elif mode == 'this_and_future':
                # Editar esta ocorrência e todas as futuras
                # Para isso, criamos uma nova tarefa com os novos dados
                
                # Se a data de início da recorrência for igual ou posterior à ocorrência,
                # atualizamos a tarefa original
                if instance.date >= occurrence_date:
                    serializer = self.get_serializer(instance, data=request.data, partial=True)
                    serializer.is_valid(raise_exception=True)
                    self.perform_update(serializer)
                    
                    return Response(serializer.data)
                else:
                    # Caso contrário, marcamos o fim da tarefa original um dia antes da ocorrência
                    from datetime import datetime, timedelta
                    from django.utils.dateparse import parse_date
                    
                    occurrence_date_obj = parse_date(occurrence_date)
                    end_date = occurrence_date_obj - timedelta(days=1)
                    
                    # Atualizar a data de término da recorrência original
                    instance.repeat_end_date = end_date
                    instance.save()
                    
                    # Criar uma nova tarefa com os novos dados
                    new_task_data = request.data.copy()
                    new_task_data['date'] = occurrence_date
                    
                    # Criar a nova tarefa
                    serializer = self.get_serializer(data=new_task_data)
                    serializer.is_valid(raise_exception=True)
                    serializer.save(user=request.user)
                    
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            elif mode == 'all':
                # Editar todas as ocorrências - atualiza a tarefa principal
                serializer = self.get_serializer(instance, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                
                # Atualizar todas as ocorrências existentes que possam ter sido modificadas
                if 'status' in request.data or 'actual_value' in request.data or 'notes' in request.data:
                    occurrences = TaskOccurrence.objects.filter(task=instance)
                    for occurrence in occurrences:
                        if 'status' in request.data:
                            occurrence.status = request.data['status']
                        if 'actual_value' in request.data:
                            occurrence.actual_value = request.data['actual_value']
                        if 'notes' in request.data:
                            occurrence.notes = request.data['notes']
                        occurrence.save()
                
                return Response(serializer.data)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
    
    def destroy(self, request, *args, **kwargs):
        from django.db import transaction
        
        with transaction.atomic():
            instance = self.get_object()
            
            # Check if the task is completed and has an associated goal
            if instance.status == 'completed' and instance.goal and instance.actual_value:
                # Subtract the value from the goal
                goal = instance.goal
                goal.current_value = max(0, goal.current_value - instance.actual_value)
                goal.update_progress()
                print(f"[TaskViewSet] Adjusting goal when deleting task: Subtracting {instance.actual_value} from goal {goal.id}")
            
            # Delete the task
            self.perform_destroy(instance)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
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
        status_filter = request.query_params.get('status')
        
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
        
        # Aplicar filtro de status (se fornecido)
        if status_filter:
            status_list = status_filter.split(',')
            normal_tasks = normal_tasks.filter(status__in=status_list)
            task_occurrences = task_occurrences.filter(status__in=status_list)
        
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
                
                # Aplicar filtro de status para tarefas geradas
                if not occurrence_exists:
                    task_data = self.get_serializer(task).data
                    
                    # Se houver filtro de status, verificar se o status da tarefa gerada está na lista
                    if status_filter and 'pending' not in status_list:  # Tarefas geradas são sempre 'pending'
                        continue
                        
                    task_data.update({
                        'date': selected_date.isoformat(),
                        'is_generated': True
                    })
                    generated_tasks.append(task_data)
        
        # Combinar todas as tarefas
        all_tasks = list(self.get_serializer(normal_tasks, many=True).data)
        all_tasks.extend(occurrence_tasks)
        all_tasks.extend(generated_tasks)
        
        # Ordenar todas as tarefas por hora de início
        all_tasks.sort(key=lambda x: x['start_time'])
        
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
        
        # Aplicar filtro de status (se fornecido)
        status_filter = request.query_params.get('status')
        
        # 1. Obter tarefas normais (não recorrentes) para esta semana
        normal_tasks = self.get_queryset().filter(
            date__range=[start_date, end_date],
            repeat_pattern='none'
        )
        
        if status_filter:
            status_list = status_filter.split(',')
            normal_tasks = normal_tasks.filter(status__in=status_list)
        
        # 2. Obter ocorrências existentes para tarefas recorrentes
        task_occurrences = TaskOccurrence.objects.filter(
            date__range=[start_date, end_date],
            task__user=request.user
        ).select_related('task')
        
        if status_filter:
            task_occurrences = task_occurrences.filter(status__in=status_list)
        
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
                        # Se houver filtro de status, verificar se o status padrão ('pending') está na lista
                        if status_filter and 'pending' not in status_filter.split(','):
                            current_date += timedelta(days=1)
                            continue
                            
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
        
        # Ordenar tarefas primeiramente por data e depois por hora de início
        all_tasks.sort(key=lambda x: (x['date'], x['start_time']))
        
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
        today = timezone.localdate()
        
        # Tarefas da semana
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        # Obter contagens detalhadas para o gráfico de tendência
        week_counts = count_tasks_with_recurrences(
            request.user, 
            date_range=(start_of_week, end_of_week)
        )
        
        # Também obter dados específicos para a semana anterior para comparação
        last_week_start = start_of_week - timedelta(days=7)
        last_week_end = end_of_week - timedelta(days=7)
        
        # Estender o período para o gráfico de tendência (últimos 30 dias)
        trend_start = today - timedelta(days=30)
        trend_counts = count_tasks_with_recurrences(
            request.user, 
            date_range=(trend_start, today)
        )
        
        # Progresso das metas
        goals = Goal.objects.filter(user=request.user)
        active_goals = goals.filter(end_date__gte=today, is_completed=False)
        
        # Formatando os dados para o serializer usando a função atualizada
        today_stats = count_total_tasks(request.user, date=timezone.localdate())
        week_stats = count_total_tasks(request.user, date_range=(start_of_week, end_of_week))
        
        # Log para depuração
        print(f"[DEBUG] today_stats: {today_stats}")
        print(f"[DEBUG] week_stats: {week_stats}")
        print(f"[DEBUG] today high_priority: {today_stats.get('high_priority', 0)}")
        print(f"[DEBUG] week completion_rate: {week_stats.get('completion_rate', 0)}")
        
        # Gerar resposta
        serializer = DashboardSerializer({
            'today': today_stats,
            'week': week_stats,
            'goals': {
                'total': goals.count(),
                'active': active_goals.count(),
                'completed': goals.filter(is_completed=True).count(),
                'close_to_deadline': active_goals.filter(end_date__lte=today + timedelta(days=7)).count(),
            },
            # Usar o formatter atualizado com dados de tendência de 30 dias
            'completion_trend': list(task_counts_by_day_formatter(trend_counts['by_day'], request.user)),
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
        from django.db import transaction
        
        with transaction.atomic():
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
            
            if delete_mode == 'only_this':
                try:
                    occurrence = TaskOccurrence.objects.get(task=task, date=date)
                    
                    # Se a ocorrência está concluída e tem meta, ajustar a meta
                    if occurrence.status == 'completed' and task.goal and occurrence.actual_value:
                        goal = task.goal
                        goal.current_value = max(0, goal.current_value - occurrence.actual_value)
                        goal.update_progress()
                        print(f"[DEBUG] Ajustando meta ao excluir ocorrência: {occurrence.actual_value} removido")
                    
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
                    # Antes de excluir a tarefa, ajustar todas as metas afetadas
                    if task.goal:
                        # Buscar todas as ocorrências concluídas para esta tarefa
                        completed_occurrences = TaskOccurrence.objects.filter(
                            task=task,
                            status='completed'
                        )
                        
                        total_to_remove = sum(occ.actual_value or 0 for occ in completed_occurrences)
                        
                        if total_to_remove > 0:
                            goal = task.goal
                            goal.current_value = max(0, goal.current_value - total_to_remove)
                            goal.update_progress()
                            print(f"[DEBUG] Removendo {total_to_remove} da meta {goal.id} ao excluir tarefa recorrente")
                    
                    # Se a data for a data inicial ou anterior, excluir a tarefa inteira
                    task.delete()
                else:
                    # Caso contrário, atualizar a data final
                    task.repeat_end_date = date - timedelta(days=1)
                    task.save()
                    
                    # Excluir ocorrências desta data em diante, ajustando metas conforme necessário
                    if task.goal:
                        future_completed = TaskOccurrence.objects.filter(
                            task=task,
                            date__gte=date,
                            status='completed'
                        )
                        
                        total_to_remove = sum(occ.actual_value or 0 for occ in future_completed)
                        
                        if total_to_remove > 0:
                            goal = task.goal
                            goal.current_value = max(0, goal.current_value - total_to_remove)
                            goal.update_progress()
                            print(f"[DEBUG] Removendo {total_to_remove} da meta {goal.id} ao excluir ocorrências futuras")
                    
                    TaskOccurrence.objects.filter(task=task, date__gte=date).delete()
                
                return Response(status=status.HTTP_204_NO_CONTENT)
            
            # Caso 3: Excluir todas as ocorrências (tarefa inteira)
            elif delete_mode == 'all':
                if task.goal:
                    # Buscar todas as ocorrências concluídas para esta tarefa
                    completed_occurrences = TaskOccurrence.objects.filter(
                        task=task,
                        status='completed'
                    )
                    
                    total_to_remove = sum(occ.actual_value or 0 for occ in completed_occurrences)
                    
                    # Se a tarefa principal também tem valor (sem ocorrências)
                    if task.status == 'completed' and task.actual_value:
                        total_to_remove += task.actual_value
                    
                    if total_to_remove > 0:
                        goal = task.goal
                        goal.current_value = max(0, goal.current_value - total_to_remove)
                        goal.update_progress()
                        print(f"[DEBUG] Removendo {total_to_remove} da meta {goal.id} ao excluir todas as ocorrências")
                
                task.delete()  # Isso já exclui todas as ocorrências devido a DELETE CASCADE
                return Response(status=status.HTTP_204_NO_CONTENT)
            
            return Response(
                {'error': 'Modo de exclusão inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
            
class EnergyProfileViewSet(viewsets.ModelViewSet):
    """API para gerenciar o perfil de energia do usuário"""
    serializer_class = EnergyProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retorna apenas o perfil de energia do usuário atual"""
        return EnergyProfile.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Obtém ou cria um perfil de energia para o usuário atual"""
        profile, created = EnergyProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                # Valores padrão quando um novo perfil é criado
                'early_morning_energy': 5,
                'mid_morning_energy': 7,
                'late_morning_energy': 6,
                'early_afternoon_energy': 5,
                'late_afternoon_energy': 4,
                'evening_energy': 3,
                'night_energy': 2,
                'monday_modifier': 0,
                'tuesday_modifier': 0,
                'wednesday_modifier': 0,
                'thursday_modifier': 0,
                'friday_modifier': -1,
                'saturday_modifier': 1,
                'sunday_modifier': 0
            }
        )
        return profile
    
    def perform_create(self, serializer):
        """Salva o perfil atribuindo o usuário atual"""
        serializer.save(user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """
        Custom update method for EnergyProfile to avoid using TaskViewSet's update
        which expects Task model attributes.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Retorna o perfil de energia do usuário atual"""
        profile = self.get_object()
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Atualizar status da tarefa"""
        from django.db import transaction
        from decimal import Decimal
        
        with transaction.atomic():
            task = self.get_object()
            status_value = request.data.get('status')
            notes = request.data.get('notes')
            if request.data.get('actual_value'):
                actual_value = Decimal(request.data.get('actual_value'))
            else:
                actual_value = None
            
            print(f"[DEBUG] Atualizando status da tarefa {task.id} para {status_value}")
            print(f"[DEBUG] Valor recebido: {actual_value}, Tipo: {type(actual_value)}")
            print(f"[DEBUG] Meta associada: {task.goal.id if task.goal else 'Nenhuma'}")
            
            if status_value not in dict(Task.STATUS_CHOICES):
                return Response({'error': 'Status inválido'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar se está marcando como concluída
            is_completing = status_value == 'completed'
            
            # Guardar valores antigos para comparação
            old_status = task.status
            old_actual_value = task.actual_value or 0
            was_already_completed = old_status == 'completed'
            
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
                    # Guardar valores antigos para comparação
                    old_occurrence_status = occurrence.status
                    old_occurrence_value = occurrence.actual_value or 0
                    was_already_completed = old_occurrence_status == 'completed'
                    
                    # Atualizar a ocorrência
                    occurrence.status = status_value
                    occurrence.actual_value = actual_value
                    occurrence.notes = notes
                    
                    # Atualizar meta associada
                    if task.goal:
                        # Caso 1: Estava concluída e continua, mas valor mudou
                        if was_already_completed and is_completing and old_occurrence_value != (actual_value or 0):
                            diff = (actual_value or 0) - old_occurrence_value
                            if diff != 0:
                                task.goal.current_value += diff
                                task.goal.update_progress()
                                print(f"[DEBUG] Ajustando meta (ocorrência): {diff} na meta {task.goal.id}")
                        
                        # Caso 2: Estava concluída mas não está mais
                        elif was_already_completed and not is_completing:
                            task.goal.current_value = max(0, task.goal.current_value - old_occurrence_value)
                            task.goal.update_progress()
                            print(f"[DEBUG] Removendo valor da meta (ocorrência): {old_occurrence_value} da meta {task.goal.id}")
                        
                        # Caso 3: Não estava concluída mas agora está
                        elif not was_already_completed and is_completing and actual_value is not None:
                            # Converter para float se for string
                            actual_value_float = actual_value
                            if isinstance(actual_value, str):
                                try:
                                    actual_value_float = float(actual_value)
                                except ValueError:
                                    return Response({'error': 'Valor inválido'}, status=status.HTTP_400_BAD_REQUEST)
                            
                            task.goal.current_value += actual_value_float
                            task.goal.update_progress()
                            print(f"[DEBUG] Adicionando valor à meta (ocorrência): {actual_value_float} à meta {task.goal.id}")
                    
                    occurrence.save()
                else:
                    # Nova ocorrência, se está marcada como concluída
                    if is_completing and task.goal and actual_value is not None:
                        # Converter para float se for string
                        actual_value_float = actual_value
                        if isinstance(actual_value, str):
                            try:
                                actual_value_float = float(actual_value)
                            except ValueError:
                                return Response({'error': 'Valor inválido'}, status=status.HTTP_400_BAD_REQUEST)
                        
                        task.goal.current_value += actual_value_float
                        task.goal.update_progress()
                        print(f"[DEBUG] Nova ocorrência concluída: {actual_value_float} adicionado à meta {task.goal.id}")
                
                serializer = TaskOccurrenceSerializer(occurrence)
                return Response(serializer.data)
            else:
                # Para tarefas não recorrentes
                
                # Atualizar a tarefa
                task.status = status_value
                if actual_value is not None:
                    task.actual_value = actual_value
                if notes:
                    task.notes = notes
                
                # Atualizar meta associada
                if task.goal:
                    # Caso 1: Estava concluída e continua, mas valor mudou
                    if was_already_completed and is_completing and old_actual_value != (actual_value or 0):
                        diff = (actual_value or 0) - old_actual_value
                        if diff != 0:
                            task.goal.current_value += diff
                            task.goal.update_progress()
                            print(f"[DEBUG] Ajustando meta: {diff} adicionado à meta {task.goal.id}")
                    
                    # Caso 2: Estava concluída mas não está mais
                    elif was_already_completed and not is_completing:
                        task.goal.current_value = max(0, task.goal.current_value - old_actual_value)
                        task.goal.update_progress()
                        print(f"[DEBUG] Removendo valor da meta: {old_actual_value} removido da meta {task.goal.id}")
                    
                    # Caso 3: Não estava concluída mas agora está
                    elif not was_already_completed and is_completing and actual_value is not None:
                        # Converter para float se for string
                        actual_value_float = actual_value
                        if isinstance(actual_value, str):
                            try:
                                actual_value_float = float(actual_value)
                            except ValueError:
                                return Response({'error': 'Valor inválido'}, status=status.HTTP_400_BAD_REQUEST)
                        
                        task.goal.current_value += actual_value_float
                        task.goal.update_progress()
                        print(f"[DEBUG] Adicionando valor à meta: {actual_value_float} adicionado à meta {task.goal.id}")
                
                task.save()
                
                serializer = self.get_serializer(task)
                return Response(serializer.data)
            
    @action(detail=False, methods=['get'])
    def energy_recommendations(self, request):
        """Retorna tarefas recomendadas com base no nível de energia atual"""
        try:
            current_energy = EnergyMatchService.get_current_energy_level(request.user)
            recommended_tasks = EnergyMatchService.get_recommended_tasks(request.user)
            
            # Use explicitly TaskSerializer instead of self.get_serializer
            from .serializers import TaskSerializer
            serializer = TaskSerializer(recommended_tasks, many=True)
            
            return Response({
                'current_energy_level': current_energy,
                'recommended_tasks': serializer.data
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def create(self, request, *args, **kwargs):
        """Criar tarefa com verificação de sobreposição"""
        # Verificar sobreposição de horários
        date = request.data.get('date')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        
        # Adicionar um parâmetro opcional para ignorar a verificação de sobreposição
        ignore_overlap = request.query_params.get('ignore_overlap', 'false').lower() == 'true'
        
        if not ignore_overlap and date and start_time and end_time:
            overlapping_task = check_task_overlap(
                user=request.user,
                date=date,
                start_time=start_time,
                end_time=end_time
            )
            
            if overlapping_task:
                # Retornar erro com detalhes da sobreposição
                return Response({
                    'error': 'Sobreposição de horário detectada',
                    'overlapping_task': {
                        'id': overlapping_task.id,
                        'title': overlapping_task.title,
                        'start_time': overlapping_task.start_time,
                        'end_time': overlapping_task.end_time,
                        'date': overlapping_task.date
                    }
                }, status=status.HTTP_409_CONFLICT)
        
        # Se não houver sobreposição ou se for para ignorar, continuar com a criação
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        from django.db import transaction
        
        with transaction.atomic():
            instance = self.get_object()
            
            # Check if this is a Task instance
            if not isinstance(instance, Task):
                # For non-Task instances, use the default update behavior
                serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                return Response(serializer.data)
            
            # Task-specific update logic follows
            # Salvar valores antigos
            old_status = instance.status
            old_actual_value = instance.actual_value or 0
            old_goal_id = instance.goal.id if instance.goal else None
            
            # Atualizar a tarefa
            serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            # A partir daqui, instance já está atualizado com os novos valores
            
            # Verificar se houve alteração relevante para a meta
            if instance.goal:
                # Caso 1: Mesma meta, verifica mudanças de valor ou status
                if old_goal_id == instance.goal.id:
                    if old_status == 'completed' and instance.status == 'completed' and instance.actual_value != old_actual_value:
                        # Ajustar a diferença
                        diff = (instance.actual_value or 0) - old_actual_value
                        if diff != 0:
                            goal = instance.goal
                            goal.current_value += diff
                            goal.update_progress()
                            print(f"[DEBUG] Ajustando meta: {diff} adicionado à meta {goal.id}. Valor atual: {goal.current_value}")
                    elif old_status == 'completed' and instance.status != 'completed':
                        # Tarefa não está mais concluída, remover valor
                        goal = instance.goal
                        goal.current_value = max(0, goal.current_value - old_actual_value)
                        goal.update_progress()
                        print(f"[DEBUG] Removendo valor da meta: {old_actual_value} removido da meta {goal.id}")
                    elif old_status != 'completed' and instance.status == 'completed' and instance.actual_value:
                        # Tarefa agora está concluída, adicionar valor
                        goal = instance.goal
                        goal.current_value += instance.actual_value
                        goal.update_progress()
                        print(f"[DEBUG] Adicionando valor à meta: {instance.actual_value} adicionado à meta {goal.id}")
                # Caso 2: Mudou de meta
                elif old_goal_id:
                    from .models import Goal
                    old_goal = Goal.objects.get(id=old_goal_id)
                    # Remover da meta antiga se estava concluída
                    if old_status == 'completed' and old_actual_value:
                        old_goal.current_value = max(0, old_goal.current_value - old_actual_value)
                        old_goal.update_progress()
                        print(f"[DEBUG] Removendo da meta antiga: {old_actual_value} removido da meta {old_goal_id}")
                    
                    # Adicionar à nova meta se está concluída
                    if instance.status == 'completed' and instance.actual_value:
                        instance.goal.current_value += instance.actual_value
                        instance.goal.update_progress()
                        print(f"[DEBUG] Adicionando à nova meta: {instance.actual_value} adicionado à meta {instance.goal.id}")
            
            # Se a tarefa tinha meta e agora não tem mais
            elif old_goal_id and old_status == 'completed' and old_actual_value:
                from .models import Goal
                old_goal = Goal.objects.get(id=old_goal_id)
                old_goal.current_value = max(0, old_goal.current_value - old_actual_value)
                old_goal.update_progress()
                print(f"[DEBUG] Removendo meta da tarefa: {old_actual_value} removido da meta {old_goal_id}")
            
            return Response(serializer.data)
    
    @action(detail=True, methods=['put'])
    def edit_recurring(self, request, pk=None):
        """Endpoint específico para editar tarefas recorrentes"""
        instance = self.get_object()
        mode = request.query_params.get('mode', 'only_this')
        occurrence_date = request.query_params.get('date')
        
        # Verificar se é uma tarefa recorrente
        if instance.repeat_pattern == 'none':
            return Response(
                {'error': 'Esta não é uma tarefa recorrente'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return self.update_recurring_task(instance, request, mode, occurrence_date)