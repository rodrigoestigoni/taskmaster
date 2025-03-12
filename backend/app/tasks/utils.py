from django.db.models import Q
from django.core.cache import cache
from datetime import datetime, timedelta
from django.utils import timezone
from app.tasks.models import Task

def check_task_overlap(user, date, start_time, end_time, exclude_task_id=None):
    """
    Verifica se há sobreposição de horários para tarefas do usuário.
    
    Args:
        user: Objeto User do Django
        date: Data da tarefa (string no formato YYYY-MM-DD)
        start_time: Hora de início (string no formato HH:MM:SS)
        end_time: Hora de término (string no formato HH:MM:SS)
        exclude_task_id: ID da tarefa a ser excluída da verificação (útil para edição)
        
    Returns:
        Task ou None: Retorna a primeira tarefa sobreposta ou None se não houver sobreposição
    """
    # Converter strings para objetos datetime
    start_datetime = datetime.strptime(f"{date} {start_time}", "%Y-%m-%d %H:%M")
    end_datetime = datetime.strptime(f"{date} {end_time}", "%Y-%m-%d %H:%M")
    
    # Lidar com tarefas que passam da meia-noite
    if end_datetime < start_datetime:
        end_datetime += timedelta(days=1)
    
    # Construir a query para verificar sobreposição
    # Uma tarefa se sobrepõe a outra se:
    # 1. Seu início está entre o início e o fim da outra
    # 2. Seu fim está entre o início e o fim da outra
    # 3. Ela engloba completamente a outra
    query = Q(user=user, date=date) & (
        # Início da nova tarefa está entre o início e o fim de outra tarefa
        Q(start_time__lt=end_time, end_time__gt=start_time) |
        # Fim da nova tarefa está entre o início e o fim de outra tarefa
        Q(start_time__lt=end_time, end_time__gt=end_time) |
        # Nova tarefa engloba completamente outra tarefa
        Q(start_time__gte=start_time, end_time__lte=end_time)
    )
    
    # Excluir a própria tarefa, se estiver editando
    if exclude_task_id:
        query &= ~Q(id=exclude_task_id)
    
    # Executar a query
    overlapping_tasks = Task.objects.filter(query).order_by('start_time')
    
    return overlapping_tasks.first() if overlapping_tasks.exists() else None

def count_tasks_with_recurrences(user, date=None, date_range=None, filter_kwargs=None):
    """
    Função utilitária para contar tarefas incluindo ocorrências recorrentes.
    
    Parâmetros:
    - user: Usuário para filtrar as tarefas
    - date: Data específica (opcional)
    - date_range: Tupla (data_início, data_fim) (opcional)
    - filter_kwargs: Filtros adicionais (opcional)
    
    Retorna:
    - Um dicionário com contagens por status e totais
    """
    from .models import Task, TaskOccurrence
    
    # Inicializar resultado
    result = {
        'total': 0,
        'by_status': {
            'completed': 0,
            'pending': 0, 
            'in_progress': 0,
            'failed': 0,
            'skipped': 0
        },
        'by_category': {},
        'by_day': {}
    }
    
    # Construir query base
    query = Task.objects.filter(user=user)
    
    # Aplicar filtros
    if filter_kwargs:
        query = query.filter(**filter_kwargs)
    
    if date:
        # Para uma data específica
        query = query.filter(date=date)
    elif date_range:
        # Para um intervalo de datas
        start_date, end_date = date_range
        query = query.filter(date__gte=start_date, date__lte=end_date)
    
    # 1. Primeiro contar tarefas não recorrentes
    non_recurring = query.filter(repeat_pattern='none')
    
    # Adicionar à contagem total
    result['total'] += non_recurring.count()
    
    # Contar por status
    for status in ['completed', 'pending', 'in_progress', 'failed', 'skipped']:
        count = non_recurring.filter(status=status).count()
        result['by_status'][status] = count
    
    # 2. Processar tarefas recorrentes
    recur_query = query.exclude(repeat_pattern='none')
    
    # Determinar datas a processar
    dates_to_check = []
    if date:
        dates_to_check = [date]
    elif date_range:
        current = date_range[0]
        while current <= date_range[1]:
            dates_to_check.append(current)
            current += timedelta(days=1)
    else:
        # Se nenhuma data especificada, usar hoje
        dates_to_check = [timezone.localdate()]
    
    # Para cada tarefa recorrente
    for task in recur_query:
        # Para cada data
        for check_date in dates_to_check:
            # Verificar se a data está no período da tarefa
            if task.date > check_date:
                continue
            if task.repeat_end_date and check_date > task.repeat_end_date:
                continue
            
            # Verificar se a tarefa se aplica a esta data específica
            weekday = check_date.weekday()  # 0 = Segunda, 6 = Domingo
            
            # Verificar o padrão de repetição
            applies = False
            if task.repeat_pattern == 'daily':
                applies = True
            elif task.repeat_pattern == 'weekdays' and weekday < 5:
                applies = True
            elif task.repeat_pattern == 'weekends' and weekday >= 5:
                applies = True
            elif task.repeat_pattern == 'weekly' and task.date.weekday() == weekday:
                # Verificar se a semana é correta
                days_diff = (check_date - task.date).days
                weeks_diff = days_diff // 7
                applies = weeks_diff % 1 == 0
            elif task.repeat_pattern == 'monthly' and task.date.day == check_date.day:
                applies = True
            elif task.repeat_pattern == 'custom' and task.repeat_days:
                days = [int(d) for d in task.repeat_days.split(',')]
                applies = weekday in days
            
            # Se a tarefa se aplica a esta data
            if applies:
                # Verificar se existe ocorrência registrada
                try:
                    occurrence = TaskOccurrence.objects.get(task=task, date=check_date)
                    status = occurrence.status
                except TaskOccurrence.DoesNotExist:
                    # Se não existe, considerar como pendente
                    status = 'pending'
                
                # Só contar se não foi pulada
                if status != 'skipped':
                    # Incrementar contagem total
                    result['total'] += 1
                    
                    # Incrementar contagem por status
                    result['by_status'][status] += 1
                    
                    # Incrementar contagem por categoria
                    category_id = task.category_id
                    if category_id not in result['by_category']:
                        result['by_category'][category_id] = {
                            'total': 0,
                            'completed': 0,
                            'pending': 0,
                            'in_progress': 0,
                            'failed': 0
                        }
                    
                    result['by_category'][category_id]['total'] += 1
                    result['by_category'][category_id][status] += 1
                    
                    # Incrementar contagem por dia
                    date_str = check_date.isoformat()
                    if date_str not in result['by_day']:
                        result['by_day'][date_str] = {
                            'total': 0,
                            'completed': 0,
                            'pending': 0,
                            'in_progress': 0,
                            'failed': 0
                        }
                    
                    result['by_day'][date_str]['total'] += 1
                    result['by_day'][date_str][status] += 1
    
    return result

def count_total_tasks(user, date=None, date_range=None):
    """
    Conta o total de tarefas para um usuário, incluindo recorrentes.
    
    Args:
        user: Objeto User do Django
        date: Data específica para contar (opcional)
        date_range: Tupla (data_inicio, data_fim) para contar (opcional)
        
    Returns:
        dict: Contagens por status e total
    """
    from .models import Task, TaskOccurrence
    from django.utils import timezone
    from datetime import timedelta
    
    # Inicializar contadores
    counts = {
        'total': 0,
        'completed': 0,
        'in_progress': 0,
        'pending': 0,
        'failed': 0
    }
    
    # Base query para todas as tarefas do usuário
    base_query = Task.objects.filter(user=user)
    
    # Para tarefas não recorrentes, usamos a filtragem por data
    if date:
        non_recurring_query = base_query.filter(repeat_pattern='none', date=date)
    elif date_range:
        start_date, end_date = date_range
        non_recurring_query = base_query.filter(
            repeat_pattern='none', 
            date__gte=start_date, 
            date__lte=end_date
        )
    else:
        # Se nenhuma data for especificada, use a data atual
        today = timezone.localdate()
        non_recurring_query = base_query.filter(repeat_pattern='none', date=today)
    
    # Adicionar contagens não recorrentes
    counts['total'] += non_recurring_query.count()
    counts['completed'] += non_recurring_query.filter(status='completed').count()
    counts['in_progress'] += non_recurring_query.filter(status='in_progress').count()
    counts['pending'] += non_recurring_query.filter(status='pending').count()
    counts['failed'] += non_recurring_query.filter(status='failed').count()
    
    # Para tarefas recorrentes, precisamos considerar qualquer tarefa que possa se aplicar à data
    if date:
        # Para uma data específica, obtenha todas as tarefas recorrentes que começaram antes ou na data especificada
        recurring_tasks = base_query.exclude(repeat_pattern='none').filter(date__lte=date)
    elif date_range:
        start_date, end_date = date_range
        # Para um intervalo, obtenha tarefas que começaram antes ou durante o intervalo
        recurring_tasks = base_query.exclude(repeat_pattern='none').filter(date__lte=end_date)
    else:
        # Se nenhuma data for especificada, use a data atual
        today = timezone.localdate()
        recurring_tasks = base_query.exclude(repeat_pattern='none').filter(date__lte=today)
    
    # Para cada tarefa recorrente
    for task in recurring_tasks:
        if date:
            dates_to_check = [date]
        elif date_range:
            # Gerar todas as datas no intervalo
            dates_to_check = []
            current_date = max(date_range[0], task.date)
            while current_date <= date_range[1]:
                dates_to_check.append(current_date)
                current_date += timedelta(days=1)
        else:
            # Se nenhuma data for especificada, use a data atual
            dates_to_check = [timezone.localdate()]
        
        # Para cada data, verificar se a tarefa se aplica
        for check_date in dates_to_check:
            # Verificar se a data está no período da tarefa
            if task.date > check_date:
                continue
            if task.repeat_end_date and check_date > task.repeat_end_date:
                continue
            
            # Verificar se a tarefa se aplica a esta data específica
            weekday = check_date.weekday()  # 0 = Segunda, 6 = Domingo
            
            # Verificar o padrão de repetição
            applies = False
            if task.repeat_pattern == 'daily':
                applies = True
            elif task.repeat_pattern == 'weekdays' and weekday < 5:
                applies = True
            elif task.repeat_pattern == 'weekends' and weekday >= 5:
                applies = True
            elif task.repeat_pattern == 'weekly' and task.date.weekday() == weekday:
                # Verificar se a semana é correta
                days_diff = (check_date - task.date).days
                weeks_diff = days_diff // 7
                applies = weeks_diff % 1 == 0
            elif task.repeat_pattern == 'monthly' and task.date.day == check_date.day:
                applies = True
            elif task.repeat_pattern == 'custom' and task.repeat_days:
                days = [int(d) for d in task.repeat_days.split(',')]
                applies = weekday in days
            
            # Se a tarefa se aplica a esta data, adicionar à contagem
            if applies:
                try:
                    occurrence = TaskOccurrence.objects.get(task=task, date=check_date)
                    if occurrence.status != 'skipped':
                        counts['total'] += 1
                        counts[occurrence.status] += 1
                except TaskOccurrence.DoesNotExist:
                    counts['total'] += 1
                    counts['pending'] += 1
    
    return counts

