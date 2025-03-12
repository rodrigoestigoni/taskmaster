from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _


class Category(models.Model):
    """Categorias para as tarefas"""
    name = models.CharField(_("Nome"), max_length=100)
    icon = models.CharField(_("Ícone"), max_length=50, help_text="Nome do ícone no sistema")
    color = models.CharField(_("Cor"), max_length=20, help_text="Código de cor HEX")
    description = models.TextField(_("Descrição"), blank=True, null=True)
    created_at = models.DateTimeField(_("Criado em"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Atualizado em"), auto_now=True)
    
    class Meta:
        verbose_name = _("Categoria")
        verbose_name_plural = _("Categorias")
        ordering = ["name"]
    
    def __str__(self):
        return self.name


class Goal(models.Model):
    """Metas de longo prazo"""
    PERIOD_CHOICES = [
        ('weekly', _('Semanal')),
        ('monthly', _('Mensal')),
        ('quarterly', _('Trimestral')),
        ('biannual', _('Semestral')),
        ('yearly', _('Anual')),
    ]
    
    MEASUREMENT_CHOICES = [
        ('count', _('Contagem')),
        ('time', _('Tempo')),
        ('pages', _('Páginas')),
        ('money', _('Dinheiro')),
        ('weight', _('Peso')),
        ('distance', _('Distância')),
        ('volume', _('Volume')),
        ('custom', _('Personalizado')),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="goals", verbose_name=_("Usuário"))
    title = models.CharField(_("Título"), max_length=200)
    description = models.TextField(_("Descrição"), blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="goals", verbose_name=_("Categoria"))
    period = models.CharField(_("Período"), max_length=20, choices=PERIOD_CHOICES)
    start_date = models.DateField(_("Data de início"))
    end_date = models.DateField(_("Data de término"))
    target_value = models.DecimalField(_("Valor alvo"), max_digits=10, decimal_places=2)
    current_value = models.DecimalField(_("Valor atual"), max_digits=10, decimal_places=2, default=0)
    measurement_unit = models.CharField(_("Unidade de medida"), max_length=20, choices=MEASUREMENT_CHOICES)
    custom_unit = models.CharField(_("Unidade personalizada"), max_length=50, blank=True, null=True)
    is_completed = models.BooleanField(_("Concluído"), default=False)
    progress_percentage = models.DecimalField(_("Percentual de progresso"), max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(_("Criado em"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Atualizado em"), auto_now=True)
    
    class Meta:
        verbose_name = _("Meta")
        verbose_name_plural = _("Metas")
        ordering = ["-created_at"]
    
    def __str__(self):
        return self.title
    
    def update_progress(self):
        """Atualiza o progresso percentual com base no valor atual e alvo"""
        if self.target_value > 0:
            # Converter current_value para Decimal antes da divisão
            from decimal import Decimal
            try:
                # Primeiro tenta converter diretamente
                if isinstance(self.current_value, (int, float)):
                    decimal_current = Decimal(str(self.current_value))
                else:
                    decimal_current = self.current_value
                    
                self.progress_percentage = (decimal_current / self.target_value) * 100
                self.progress_percentage = round(self.progress_percentage, 2)
                if self.progress_percentage >= 100:
                    self.is_completed = True
                    self.progress_percentage = 100
            except Exception as e:
                print(f"Erro ao calcular progresso: {e}")
                # Fallback seguro
                self.progress_percentage = 0
                
        self.save(update_fields=['progress_percentage', 'is_completed', 'current_value'])


class Task(models.Model):
    """Tarefas do usuário"""
    PRIORITY_CHOICES = [
        (1, _('Baixa')),
        (2, _('Média')),
        (3, _('Alta')),
        (4, _('Urgente')),
    ]
    
    STATUS_CHOICES = [
        ('pending', _('Pendente')),
        ('in_progress', _('Em andamento')),
        ('completed', _('Concluída')),
        ('failed', _('Falhou')),
        ('skipped', _('Pulada')),
    ]
    
    REPEAT_CHOICES = [
        ('none', _('Não repetir')),
        ('daily', _('Diariamente')),
        ('weekdays', _('Dias úteis (Seg-Sex)')),
        ('weekends', _('Finais de semana')),
        ('weekly', _('Semanalmente')),
        ('monthly', _('Mensalmente')),
        ('custom', _('Personalizado')),
    ]

    ENERGY_LEVEL_CHOICES = [
        ('high', _('Alta Energia')),
        ('medium', _('Energia Média')),
        ('low', _('Baixa Energia')),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tasks", verbose_name=_("Usuário"))
    title = models.CharField(_("Título"), max_length=200)
    description = models.TextField(_("Descrição"), blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="tasks", verbose_name=_("Categoria"))
    date = models.DateField(_("Data"))
    start_time = models.TimeField(_("Hora de início"))
    end_time = models.TimeField(_("Hora de término"))
    duration_minutes = models.PositiveIntegerField(_("Duração (minutos)"))
    priority = models.PositiveSmallIntegerField(_("Prioridade"), choices=PRIORITY_CHOICES, default=2)
    status = models.CharField(_("Status"), max_length=20, choices=STATUS_CHOICES, default='pending')
    repeat_pattern = models.CharField(_("Padrão de repetição"), max_length=20, choices=REPEAT_CHOICES, default='none')
    repeat_days = models.CharField(_("Dias de repetição"), max_length=20, blank=True, null=True, 
                                 help_text="Para padrão 'custom', lista de dias como '0,1,3' (0=Segunda, 6=Domingo)")
    repeat_end_date = models.DateField(_("Data final da repetição"), blank=True, null=True)
    goal = models.ForeignKey(Goal, on_delete=models.SET_NULL, related_name="tasks", blank=True, null=True, 
                           verbose_name=_("Meta associada"))
    target_value = models.DecimalField(_("Valor alvo"), max_digits=10, decimal_places=2, blank=True, null=True,
                                     help_text="Valor planejado para esta tarefa (ex: páginas, minutos)")
    actual_value = models.DecimalField(_("Valor realizado"), max_digits=10, decimal_places=2, blank=True, null=True,
                                     help_text="Valor efetivamente realizado")
    notes = models.TextField(_("Observações"), blank=True, null=True)
    created_at = models.DateTimeField(_("Criado em"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Atualizado em"), auto_now=True)
    energy_level = models.CharField(_("Nível de Energia"), max_length=10, choices=ENERGY_LEVEL_CHOICES, default='medium')
    
    class Meta:
        verbose_name = _("Tarefa")
        verbose_name_plural = _("Tarefas")
        ordering = ["date", "start_time"]
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        # Check if this is an existing task being updated
        is_new = self.pk is None

        # Adicionar logs detalhados
        print(f"[TASK DEBUG] Task save started: id={self.pk}, status={self.status}, actual_value={self.actual_value}")
        print(f"[TASK DEBUG] Related goal: {self.goal.id if self.goal else 'None'}")
        
        # If updating an existing task
        if not is_new:
            try:
                # Get the previous version of the task for comparison
                old_task = Task.objects.get(pk=self.pk)
                old_status = old_task.status
                old_actual_value = old_task.actual_value or 0
                old_goal = old_task.goal

                print(f"[TASK DEBUG] Old values: status={old_status}, actual_value={old_actual_value}, goal={old_goal.id if old_goal else 'None'}")
                
                # Calculate duration automatically if not provided
                if not self.duration_minutes and self.start_time and self.end_time:
                    # Convert to minutes
                    start_minutes = self.start_time.hour * 60 + self.start_time.minute
                    end_minutes = self.end_time.hour * 60 + self.end_time.minute
                    
                    # Handle tasks that go past midnight
                    if end_minutes < start_minutes:
                        end_minutes += 24 * 60
                        
                    self.duration_minutes = end_minutes - start_minutes
                
                # Save the task first
                super().save(*args, **kwargs)
                
                # Handle goal progress updates
                if self.goal:
                    # If the goal is the same as before
                    if old_goal and old_goal.id == self.goal.id:
                        # Case 1: Was completed before and still is, but value changed
                        if old_status == 'completed' and self.status == 'completed' and old_actual_value != (self.actual_value or 0):
                            # Calculate the difference and adjust goal value
                            diff = (self.actual_value or 0) - old_actual_value
                            if diff != 0:
                                self.goal.current_value += diff
                                self.goal.update_progress()
                                print(f"[TASK MODEL] Adjusted goal: {diff} added to goal {self.goal.id}")
                        
                        # Case 2: Was completed but no longer is
                        elif old_status == 'completed' and self.status != 'completed':
                            # Remove the value
                            self.goal.current_value = max(0, self.goal.current_value - old_actual_value)
                            self.goal.update_progress()
                            print(f"[TASK MODEL] Removed value from goal: {old_actual_value} removed from goal {self.goal.id}")
                        
                        # Case 3: Wasn't completed but now is
                        elif old_status != 'completed' and self.status == 'completed' and self.actual_value:
                            # Add the value
                            self.goal.current_value += self.actual_value
                            self.goal.update_progress()
                            print(f"[TASK MODEL] Added value to goal: {self.actual_value} added to goal {self.goal.id}")
                    
                    # If the goal changed
                    elif old_goal and old_goal.id != self.goal.id:
                        # Remove value from old goal if task was completed
                        if old_status == 'completed' and old_actual_value:
                            old_goal.current_value = max(0, old_goal.current_value - old_actual_value)
                            old_goal.update_progress()
                            print(f"[TASK MODEL] Removed from old goal: {old_actual_value} removed from goal {old_goal.id}")
                        
                        # Add value to new goal if task is completed
                        if self.status == 'completed' and self.actual_value:
                            self.goal.current_value += self.actual_value
                            self.goal.update_progress()
                            print(f"[TASK MODEL] Added to new goal: {self.actual_value} added to goal {self.goal.id}")
                    
                    # If there was no goal before but there is now
                    elif not old_goal and self.status == 'completed' and self.actual_value:
                        # Add value to the new goal
                        self.goal.current_value += self.actual_value
                        self.goal.update_progress()
                        print(f"[TASK MODEL] Added to new goal: {self.actual_value} added to goal {self.goal.id}")
                
                # If had goal before but no longer has
                elif old_goal and old_status == 'completed' and old_actual_value:
                    # Remove value from the old goal
                    old_goal.current_value = max(0, old_goal.current_value - old_actual_value)
                    old_goal.update_progress()
                    print(f"[TASK MODEL] Removed goal from task: {old_actual_value} removed from goal {old_goal.id}")
                    
            except Task.DoesNotExist:
                # First save for new tasks - calculate duration and save
                if not self.duration_minutes and self.start_time and self.end_time:
                    start_minutes = self.start_time.hour * 60 + self.start_time.minute
                    end_minutes = self.end_time.hour * 60 + self.end_time.minute
                    
                    if end_minutes < start_minutes:
                        end_minutes += 24 * 60
                        
                    self.duration_minutes = end_minutes - start_minutes
                
                super().save(*args, **kwargs)
                
                # For new tasks that are already completed
                if self.status == 'completed' and self.goal and self.actual_value:
                    self.goal.current_value += self.actual_value
                    self.goal.update_progress()
                    print(f"[TASK MODEL] New task already completed: {self.actual_value} added to goal {self.goal.id}")
            except Exception as e:
                print(f"[TASK DEBUG] Exception in save: {e}")
        else:
            # New task - calculate duration and save
            if not self.duration_minutes and self.start_time and self.end_time:
                start_minutes = self.start_time.hour * 60 + self.start_time.minute
                end_minutes = self.end_time.hour * 60 + self.end_time.minute
                
                if end_minutes < start_minutes:
                    end_minutes += 24 * 60
                    
                self.duration_minutes = end_minutes - start_minutes
            
            super().save(*args, **kwargs)
            
            # For new tasks that are already completed
            if self.status == 'completed' and self.goal and self.actual_value:
                self.goal.current_value += self.actual_value
                self.goal.update_progress()
                print(f"[TASK MODEL] New task already completed: {self.actual_value} added to goal {self.goal.id}")

class EnergyProfile(models.Model):
    """Perfil de energia do usuário ao longo do dia"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="energy_profile")
    
    # Períodos da manhã
    early_morning_energy = models.IntegerField(_("Energia no início da manhã (5h-8h)"), default=5)
    mid_morning_energy = models.IntegerField(_("Energia no meio da manhã (8h-11h)"), default=7)
    late_morning_energy = models.IntegerField(_("Energia no final da manhã (11h-14h)"), default=6)
    
    # Períodos da tarde
    early_afternoon_energy = models.IntegerField(_("Energia no início da tarde (14h-17h)"), default=5)
    late_afternoon_energy = models.IntegerField(_("Energia no final da tarde (17h-20h)"), default=4)
    
    # Períodos da noite
    evening_energy = models.IntegerField(_("Energia à noite (20h-23h)"), default=3)
    night_energy = models.IntegerField(_("Energia durante a noite (23h-5h)"), default=2)
    
    # Modificadores por dia da semana
    monday_modifier = models.IntegerField(_("Modificador de segunda-feira"), default=0)
    tuesday_modifier = models.IntegerField(_("Modificador de terça-feira"), default=0)
    wednesday_modifier = models.IntegerField(_("Modificador de quarta-feira"), default=0)
    thursday_modifier = models.IntegerField(_("Modificador de quinta-feira"), default=0)
    friday_modifier = models.IntegerField(_("Modificador de sexta-feira"), default=0)
    saturday_modifier = models.IntegerField(_("Modificador de sábado"), default=1)
    sunday_modifier = models.IntegerField(_("Modificador de domingo"), default=1)
    
    # Métodos para calcular energia para um determinado horário e dia
    def get_energy_level_for_time(self, time_obj, day_of_week=None):
        """Retorna o nível de energia para um horário específico"""
        # Implementação aqui
        
class TaskOccurrence(models.Model):
    """Ocorrências individuais de tarefas recorrentes"""
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="occurrences", verbose_name=_("Tarefa"))
    date = models.DateField(_("Data"))
    status = models.CharField(_("Status"), max_length=20, choices=Task.STATUS_CHOICES, default='pending')
    actual_value = models.DecimalField(_("Valor realizado"), max_digits=10, decimal_places=2, blank=True, null=True)
    notes = models.TextField(_("Observações desta ocorrência"), blank=True, null=True)
    created_at = models.DateTimeField(_("Criado em"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Atualizado em"), auto_now=True)
    
    class Meta:
        verbose_name = _("Ocorrência de Tarefa")
        verbose_name_plural = _("Ocorrências de Tarefas")
        ordering = ["date"]
        unique_together = ['task', 'date']
    
    def __str__(self):
        return f"{self.task.title} - {self.date}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Atualizar meta associada se existir
        if self.task.goal and self.status == 'completed' and self.actual_value:
            self.task.goal.current_value += self.actual_value
            self.task.goal.update_progress()


class UserPreference(models.Model):
    """Preferências do usuário"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences", verbose_name=_("Usuário"))
    default_view = models.CharField(_("Visualização padrão"), max_length=20, 
                                  choices=[('day', 'Dia'), ('week', 'Semana'), ('month', 'Mês')],
                                  default='day')
    start_day_of_week = models.PositiveSmallIntegerField(_("Dia de início da semana"), 
                                                       choices=[(0, 'Segunda'), (6, 'Domingo')],
                                                       default=0)
    wake_up_time = models.TimeField(_("Horário de despertar"), null=True, blank=True)
    sleep_time = models.TimeField(_("Horário de dormir"), null=True, blank=True)
    work_start_time = models.TimeField(_("Início do expediente"), null=True, blank=True)
    work_end_time = models.TimeField(_("Fim do expediente"), null=True, blank=True)
    break_start_time = models.TimeField(_("Início do intervalo"), null=True, blank=True)
    break_end_time = models.TimeField(_("Fim do intervalo"), null=True, blank=True)
    theme = models.CharField(_("Tema"), max_length=20, 
                           choices=[('light', 'Claro'), ('dark', 'Escuro'), ('system', 'Sistema')],
                           default='system')
    reminder_before_minutes = models.PositiveIntegerField(_("Minutos de antecedência para lembretes"), default=15)
    created_at = models.DateTimeField(_("Criado em"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Atualizado em"), auto_now=True)
    
    class Meta:
        verbose_name = _("Preferência do Usuário")
        verbose_name_plural = _("Preferências dos Usuários")
    
    def __str__(self):
        return f"Preferências de {self.user.username}"