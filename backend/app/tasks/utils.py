from django.db.models import Q
from datetime import datetime, timedelta
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