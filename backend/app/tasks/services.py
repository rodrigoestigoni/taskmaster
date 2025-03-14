from datetime import datetime, time
from .models import Task, EnergyProfile

class EnergyMatchService:
    """Serviço para correspondência de tarefas com níveis de energia"""
    
    @staticmethod
    def get_current_energy_level(user):
        """Determina o nível de energia atual para o usuário"""
        try:
            profile = EnergyProfile.objects.get(user=user)
            print(f"[DEBUG] Found energy profile for user {user.username}")
        except EnergyProfile.DoesNotExist:
            # Sem perfil, assume nível médio
            print(f"[DEBUG] No energy profile found for user {user.username}, using default level 5")
            return 5
            
        now = datetime.now().time()
        day_of_week = datetime.now().weekday()  # 0 = Monday, 6 = Sunday
        
        print(f"[DEBUG] Current time: {now}, day of week: {day_of_week}")
        
        # Determina qual período do dia estamos
        if time(5, 0) <= now < time(8, 0):
            base_energy = profile.early_morning_energy
            period = "early morning"
        elif time(8, 0) <= now < time(11, 0):
            base_energy = profile.mid_morning_energy
            period = "mid morning"
        elif time(11, 0) <= now < time(14, 0):
            base_energy = profile.late_morning_energy
            period = "late morning"
        elif time(14, 0) <= now < time(17, 0):
            base_energy = profile.early_afternoon_energy
            period = "early afternoon"
        elif time(17, 0) <= now < time(20, 0):
            base_energy = profile.late_afternoon_energy
            period = "late afternoon"
        elif time(20, 0) <= now < time(23, 0):
            base_energy = profile.evening_energy
            period = "evening"
        else:
            base_energy = profile.night_energy
            period = "night"
            
        print(f"[DEBUG] Current period: {period}, base energy: {base_energy}")
            
        # Aplicar modificador do dia da semana
        day_modifiers = [
            profile.monday_modifier,
            profile.tuesday_modifier,
            profile.wednesday_modifier,
            profile.thursday_modifier,
            profile.friday_modifier,
            profile.saturday_modifier,
            profile.sunday_modifier
        ]
        
        day_modifier = day_modifiers[day_of_week]
        print(f"[DEBUG] Day modifier for {day_of_week}: {day_modifier}")
        
        energy_level = base_energy + day_modifier
        print(f"[DEBUG] Final energy level before clamping: {energy_level}")
        
        # Limitar entre 1-10
        final_energy = max(1, min(10, energy_level))
        print(f"[DEBUG] Final energy level after clamping: {final_energy}")
        
        return final_energy
    
    @staticmethod
    def get_task_energy_match_score(task, current_energy):
        """Calcula pontuação de correspondência entre tarefa e nível de energia atual"""
        # Mapear níveis de energia de tarefa para valores numéricos
        task_energy_map = {
            'high': 8,
            'medium': 5,
            'low': 2
        }
        
        task_energy = task_energy_map.get(task.energy_level, 5)
        
        # Calcular diferença (quanto menor, melhor a correspondência)
        energy_diff = abs(current_energy - task_energy)
        
        # Converter para pontuação (10 = correspondência perfeita, 0 = pior correspondência)
        match_score = max(0, 10 - energy_diff)
        
        return match_score
    
    @classmethod
    def get_recommended_tasks(cls, user, limit=5):
        """Retorna tarefas recomendadas com base no nível de energia atual"""
        current_energy = cls.get_current_energy_level(user)
        
        # Buscar tarefas pendentes do usuário para hoje
        today = datetime.now().date()
        print(f"[DEBUG] Looking for pending tasks for {user.username} on {today}")
        
        # First try to find tasks with energy levels explicitly set
        pending_tasks = Task.objects.filter(
            user=user,
            status='pending',
            date=today
        ).exclude(energy_level='')  # Make sure energy_level is not empty
        
        # If no tasks with explicit energy levels, fall back to all pending tasks
        if pending_tasks.count() == 0:
            print(f"[DEBUG] No tasks with energy levels found, using all pending tasks")
            pending_tasks = Task.objects.filter(
                user=user,
                status='pending',
                date=today
            )
        
        # Se não há tarefas pendentes, verificar se há tarefas sem energia definida
        if pending_tasks.count() == 0:
            # Check if there are tasks without energy level assigned
            unassigned_tasks = Task.objects.filter(
                user=user,
                status='pending',
                date=today,
                energy_level__isnull=True
            )
            if unassigned_tasks.exists():
                print(f"[DEBUG] User has {unassigned_tasks.count()} tasks without energy levels assigned.")
            else:
                print(f"[DEBUG] User has no pending tasks for today.")
            return []
            
        # Log debugging info
        print(f"[DEBUG] Found {pending_tasks.count()} pending tasks for user {user.username}")
        
        # Calcular pontuação para cada tarefa
        task_scores = []
        for task in pending_tasks:
            # Defensive check for energy_level - ensure valid value
            if not task.energy_level or task.energy_level not in ['high', 'medium', 'low']:
                task.energy_level = 'medium'  # Default to medium energy if not set
                
            score = cls.get_task_energy_match_score(task, current_energy)
            task_scores.append((task, score))
            print(f"[DEBUG] Task {task.id} ({task.title}) has energy level {task.energy_level} and score {score}")
        
        # Ordenar por pontuação (maior primeiro)
        task_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Retornar apenas as tarefas
        result = [task for task, score in task_scores[:limit]]
        print(f"[DEBUG] Returning {len(result)} recommended tasks")
        return result