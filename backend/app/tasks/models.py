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
            self.progress_percentage = (self.current_value / self.target_value) * 100
            self.progress_percentage = round(self.progress_percentage, 2)  # Arredondar para 2 casas decimais
            if self.progress_percentage >= 100:
                self.is_completed = True
                self.progress_percentage = 100
        self.save(update_fields=['progress_percentage', 'is_completed'])


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
        # Calcular duração automaticamente se não fornecida
        if not self.duration_minutes and self.start_time and self.end_time:
            # Converter para minutos
            start_minutes = self.start_time.hour * 60 + self.start_time.minute
            end_minutes = self.end_time.hour * 60 + self.end_time.minute
            
            # Lidar com tarefas que passam da meia-noite
            if end_minutes < start_minutes:
                end_minutes += 24 * 60
                
            self.duration_minutes = end_minutes - start_minutes
        
        # Salvar a tarefa
        super().save(*args, **kwargs)
        
        # Atualizar meta associada se existir e se a tarefa foi concluída
        if self.goal and self.status == 'completed' and self.actual_value:
            self.goal.current_value += self.actual_value
            self.goal.update_progress()

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