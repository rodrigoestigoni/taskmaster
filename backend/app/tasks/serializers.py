from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Task, Category, Goal, TaskOccurrence, UserPreference


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class GoalSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = Goal
        fields = '__all__'
        read_only_fields = ('user', 'progress_percentage', 'is_completed')
    
    def get_days_remaining(self, obj):
        """Calcula dias restantes até o fim da meta"""
        today = timezone.localdate()
        if obj.end_date > today:
            return (obj.end_date - today).days
        return 0


class TaskSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    goal_title = serializers.CharField(source='goal.title', read_only=True)
    
    # Campo para controlar verificação de sobreposição no nível do serializador
    ignore_overlap = serializers.BooleanField(write_only=True, required=False, default=False)
    
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ('user',)
    
    def create(self, validated_data):
        # Remover campo ignore_overlap se existir
        ignore_overlap = validated_data.pop('ignore_overlap', False)
        
        task = Task.objects.create(**validated_data)
        
        # Se for uma tarefa recorrente, gerar ocorrências para o período próximo
        if task.repeat_pattern != 'none' and task.repeat_end_date:
            self._generate_occurrences(task)
        
        return task
    
    def update(self, instance, validated_data):
        # Remover campo ignore_overlap se existir
        ignore_overlap = validated_data.pop('ignore_overlap', False)
        
        # Atualizar os campos da tarefa
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # Se os parâmetros de recorrência foram alterados, pode ser necessário regenerar ocorrências
        if 'repeat_pattern' in validated_data or 'repeat_end_date' in validated_data:
            # Tratar a regeneração de ocorrências aqui
            pass
            
        return instance
    
    # Método auxiliar para verificar sobreposição
    def _check_overlap(self, date, start_time, end_time, task_id=None):
        """Verifica se há sobreposição com outras tarefas"""
        from .utils import check_task_overlap
        
        user = self.context['request'].user
        
        return check_task_overlap(
            user=user,
            date=date,
            start_time=start_time,
            end_time=end_time,
            exclude_task_id=task_id
        )
    
    def _generate_occurrences(self, task):
        """Gera ocorrências iniciais para tarefas recorrentes"""
        current_date = task.date
        end_date = task.repeat_end_date
        
        if not end_date:
            # Se não houver data final, gerar para os próximos 30 dias
            end_date = current_date + timedelta(days=30)
        
        # Criar a primeira ocorrência para a data inicial
        TaskOccurrence.objects.create(
            task=task,
            date=current_date,
            status='pending'
        )
        
        # Para padrão semanal, aumentar 7 dias para cada nova ocorrência
        if task.repeat_pattern == 'weekly':
            next_date = current_date + timedelta(days=7)
            while next_date <= end_date:
                TaskOccurrence.objects.create(
                    task=task,
                    date=next_date,
                    status='pending'
                )
                next_date += timedelta(days=7)
        # Para padrão mensal, avançar um mês para cada nova ocorrência
        elif task.repeat_pattern == 'monthly':
            # Definir o dia do próximo mês
            year = current_date.year
            month = current_date.month + 1
            day = current_date.day
            
            # Ajustar se passar para o próximo ano
            if month > 12:
                month = 1
                year += 1
            
            # Continuar criando ocorrências até a data final
            while True:
                try:
                    next_date = datetime(year, month, day).date()
                    if next_date > end_date:
                        break
                    
                    TaskOccurrence.objects.create(
                        task=task,
                        date=next_date,
                        status='pending'
                    )
                    
                    # Avançar para o próximo mês
                    month += 1
                    if month > 12:
                        month = 1
                        year += 1
                except ValueError:
                    # Caso o dia não exista no próximo mês (ex: 31 de fevereiro)
                    # Avançar para o próximo mês
                    month += 1
                    if month > 12:
                        month = 1
                        year += 1
                    continue
        # Para padrões daily, weekdays, weekends e custom, gerar dia a dia
        else:
            next_date = current_date + timedelta(days=1)
            while next_date <= end_date:
                if self._should_create_occurrence(task, next_date):
                    TaskOccurrence.objects.create(
                        task=task,
                        date=next_date,
                        status='pending'
                    )
                
                next_date += timedelta(days=1)
    
    def _should_create_occurrence(self, task, date):
        """Determina se deve criar uma ocorrência para esta data com base no padrão de repetição"""
        # A data inicial já é tratada separadamente, então aqui verificamos apenas as datas subsequentes
        if date == task.date:
            return False  # A data inicial é tratada separadamente
        
        weekday = date.weekday()  # 0 = Segunda, 6 = Domingo
        
        if task.repeat_pattern == 'daily':
            return True
        elif task.repeat_pattern == 'weekdays':
            return weekday < 5  # Segunda a Sexta
        elif task.repeat_pattern == 'weekends':
            return weekday >= 5  # Sábado e Domingo
        elif task.repeat_pattern == 'weekly':
            # Esta lógica já foi tratada na função _generate_occurrences
            return False
        elif task.repeat_pattern == 'monthly':
            # Esta lógica já foi tratada na função _generate_occurrences
            return False
        elif task.repeat_pattern == 'custom' and task.repeat_days:
            days = [int(d) for d in task.repeat_days.split(',')]
            return weekday in days
        
        return False

class ModifiedTaskOccurrenceSerializer(serializers.ModelSerializer):
    """Serializador para ocorrências de tarefas que foram modificadas individualmente"""
    class Meta:
        model = TaskOccurrence
        fields = ('id', 'task', 'date', 'status', 'actual_value', 'notes')
        read_only_fields = ('task',)

class TaskOccurrenceSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    category = serializers.PrimaryKeyRelatedField(source='task.category', read_only=True)
    category_name = serializers.CharField(source='task.category.name', read_only=True)
    category_icon = serializers.CharField(source='task.category.icon', read_only=True)
    category_color = serializers.CharField(source='task.category.color', read_only=True)
    start_time = serializers.TimeField(source='task.start_time', read_only=True)
    end_time = serializers.TimeField(source='task.end_time', read_only=True)
    priority = serializers.IntegerField(source='task.priority', read_only=True)
    energy_level = serializers.CharField(source='task.energy_level', read_only=True)
    
    class Meta:
        model = TaskOccurrence
        fields = '__all__'
        read_only_fields = ('task',)


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = '__all__'
        read_only_fields = ('user',)


class TaskReportSerializer(serializers.Serializer):
    """Serializer para o relatório de tarefas"""
    status = serializers.ListField()
    categories = serializers.ListField()
    days = serializers.ListField()
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    completion_rate = serializers.FloatField()


class GoalReportSerializer(serializers.Serializer):
    """Serializer para o relatório de metas"""
    categories = serializers.ListField()
    periods = serializers.ListField()
    total_goals = serializers.IntegerField()
    completed_goals = serializers.IntegerField()
    avg_progress = serializers.FloatField()


class DashboardSerializer(serializers.Serializer):
    """Serializer para os dados do dashboard"""
    today = serializers.DictField()
    week = serializers.DictField()
    goals = serializers.DictField()
    completion_trend = serializers.ListField()