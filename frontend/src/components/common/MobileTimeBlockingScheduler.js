import React, { useState, useRef, useEffect } from 'react';
import { format, parse, addMinutes, differenceInMinutes, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, useDragControls, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const MobileTimeBlockingScheduler = ({ tasks, onScheduleTask, onDetectConflict }) => {
  const [displayTasks, setDisplayTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const containerRef = useRef(null);
  const dragControls = useDragControls();
  
  // Geração de horários de 05:00 às 23:00 com intervalos de 30 min
  useEffect(() => {
    const slots = [];
    const startHour = 5;
    const endHour = 23;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(format(new Date().setHours(hour, minute), 'HH:mm'));
      }
    }
    
    setTimeSlots(slots);
  }, []);
  
  // Processa as tarefas para exibição
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    
    const processedTasks = tasks.map(task => {
      // Converter strings de horário para objetos Date
      const taskDate = task.date ? new Date(task.date) : new Date();
      
      const startTimeParts = task.start_time.split(':').map(Number);
      const endTimeParts = task.end_time.split(':').map(Number);
      
      const startTime = new Date(taskDate);
      startTime.setHours(startTimeParts[0], startTimeParts[1]);
      
      const endTime = new Date(taskDate);
      endTime.setHours(endTimeParts[0], endTimeParts[1]);
      
      // Calcular a posição na grade e altura
      const startMinutes = startTimeParts[0] * 60 + startTimeParts[1];
      const endMinutes = endTimeParts[0] * 60 + endTimeParts[1];
      
      const duration = endMinutes - startMinutes;
      const height = (duration / 30) * 60; // Cada slot de 30 min tem 60px
      
      // Ajustar a posição vertical com base no horário de início
      // Usamos 5h como referência (05:00 = 0px)
      const topOffset = ((startMinutes - (5 * 60)) / 30) * 60;
      
      return {
        ...task,
        startTime,
        endTime,
        duration,
        height,
        topOffset
      };
    });
    
    setDisplayTasks(processedTasks);
  }, [tasks]);
  
  // Detecta conflitos entre tarefas
  const detectConflict = (task, newStartTime, newEndTime) => {
    const newStartMinutes = parseInt(newStartTime.split(':')[0]) * 60 + parseInt(newStartTime.split(':')[1]);
    const newEndMinutes = parseInt(newEndTime.split(':')[0]) * 60 + parseInt(newEndTime.split(':')[1]);
    
    return displayTasks.find(otherTask => {
      if (otherTask.id === task.id) return false;
      
      const otherStartParts = otherTask.start_time.split(':').map(Number);
      const otherEndParts = otherTask.end_time.split(':').map(Number);
      
      const otherStartMinutes = otherStartParts[0] * 60 + otherStartParts[1];
      const otherEndMinutes = otherEndParts[0] * 60 + otherEndParts[1];
      
      // Verificar se há sobreposição
      return (
        (newStartMinutes < otherEndMinutes && newEndMinutes > otherStartMinutes) ||
        (otherStartMinutes < newEndMinutes && otherEndMinutes > newStartMinutes)
      );
    });
  };
  
  // Manipula o início de arrasto de uma tarefa
  const handleDragStart = (e, task) => {
    setActiveTask(task);
    
    // Feedback tátil
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };
  
  // Manipula o movimento de arrasto (para dar feedback em tempo real)
  const handleDrag = (e, info, task) => {
    // A lógica aqui seria para mostrar guias de alinhamento ou feedback visual
    // durante o arrasto, como destacar outros blocos quando estão próximos
  };
  
  // Manipula o término do arrasto
  const handleDragEnd = (e, info, task) => {
    if (!task) return;
    
    // Converter o deslocamento em minutos
    const yOffset = info.offset.y;
    const minutesOffset = Math.round(yOffset / 2); // 1 minuto = 2px
    
    // Calcular novos horários de início e fim
    const currentStartParts = task.start_time.split(':').map(Number);
    const currentEndParts = task.end_time.split(':').map(Number);
    
    const currentStartMinutes = currentStartParts[0] * 60 + currentStartParts[1];
    const currentEndMinutes = currentEndParts[0] * 60 + currentEndParts[1];
    
    const newStartMinutes = currentStartMinutes + minutesOffset;
    const newEndMinutes = currentEndMinutes + minutesOffset;
    
    // Formatar para HH:MM
    const newStartTime = `${String(Math.floor(newStartMinutes / 60)).padStart(2, '0')}:${String(newStartMinutes % 60).padStart(2, '0')}`;
    const newEndTime = `${String(Math.floor(newEndMinutes / 60)).padStart(2, '0')}:${String(newEndMinutes % 60).padStart(2, '0')}`;
    
    // Verificar limites (não permitir horários antes das 5h ou depois das 23h)
    if (newStartMinutes < 5 * 60 || newEndMinutes > 23 * 60 + 59) {
      toast.warning('Horário fora dos limites permitidos');
      return;
    }
    
    // Verificar conflitos
    const conflict = detectConflict(task, newStartTime, newEndTime);
    if (conflict) {
      if (onDetectConflict) {
        onDetectConflict(task, conflict);
      }
      return;
    }
    
    // Chamar callback para atualizar tarefa
    if (onScheduleTask) {
      onScheduleTask(task.id, newStartTime, newEndTime);
      
      // Feedback tátil de sucesso
      if (navigator.vibrate) {
        navigator.vibrate([30, 20, 30]);
      }
    }
  };
  
  // Manipula o clique em um slot de tempo vazio
  const handleTimeSlotClick = (timeSlot) => {
    if (!containerRef.current) return;
    
    // Se houver tarefas não agendadas, perguntar se o usuário quer agendar
    const unscheduledTasks = tasks.filter(task => !task.start_time || !task.end_time);
    
    if (unscheduledTasks.length > 0) {
      // Na implementação real, abriria um modal para escolher uma tarefa
      // Aqui estamos apenas mostrando um toast
      toast.info('Clique e segure para criar uma nova tarefa neste horário');
    }
  };
  
  // Estilização dinâmica baseada na categoria da tarefa
  const getTaskStyle = (task) => {
    const categoryColor = task.category_color || '#4F46E5';
    const isCompleted = task.status === 'completed';
    
    return {
      backgroundColor: isCompleted ? '#F3F4F6' : `${categoryColor}20`,
      borderLeft: `4px solid ${categoryColor}`,
      color: isCompleted ? '#9CA3AF' : categoryColor,
      opacity: isCompleted ? 0.7 : 1
    };
  };
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Planejador de Tempo
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Arraste para ajustar
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-x-auto bg-white dark:bg-gray-800 touch-manipulation"
        style={{ height: '500px' }}
      >
        {/* Linhas de horário */}
        <div className="absolute inset-0 pointer-events-none">
          {timeSlots.map((slot, index) => (
            <div 
              key={slot}
              className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700 flex items-center h-[60px]"
              style={{ top: `${index * 60}px` }}
            >
              <div className="sticky left-0 w-12 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-1 z-10">
                {slot}
              </div>
            </div>
          ))}
        </div>
        
        {/* Tarefas */}
        <div className="absolute inset-0 pt-2 pl-12">
          <AnimatePresence>
            {displayTasks.map(task => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                drag="y"
                dragControls={dragControls}
                dragMomentum={false}
                dragConstraints={{ top: 0, bottom: 500 }}
                onDragStart={(e) => handleDragStart(e, task)}
                onDrag={(e, info) => handleDrag(e, info, task)}
                onDragEnd={(e, info) => handleDragEnd(e, info, task)}
                className="absolute left-2 right-2 rounded-md p-2 shadow-sm touch-manipulation"
                style={{
                  ...getTaskStyle(task),
                  top: `${task.topOffset}px`,
                  height: `${task.height}px`,
                  zIndex: activeTask?.id === task.id ? 20 : 10
                }}
                whileTap={{ scale: 1.03, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
              >
                <div className="flex flex-col h-full overflow-hidden">
                  <h3 className="font-medium text-sm truncate">
                    {task.title}
                  </h3>
                  <div className="text-xs opacity-80">
                    {format(task.startTime, 'HH:mm')} - {format(task.endTime, 'HH:mm')}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="text-sm text-center mt-4 text-gray-600 dark:text-gray-400">
        Dica: Arraste as tarefas para reposicioná-las no tempo
      </div>
    </div>
  );
};

export default MobileTimeBlockingScheduler;