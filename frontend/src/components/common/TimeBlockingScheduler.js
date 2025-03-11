import React, { useState, useEffect } from 'react';
import { checkTaskOverlap } from './TaskOverlapModal';

const TimeBlockingScheduler = ({ tasks, onScheduleTask, onDetectConflict }) => {
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState([]);
  const [selectedHours, setSelectedHours] = useState({
    start: 8,
    end: 18
  });
  
  // Initialize time blocks when component mounts or hours change
  useEffect(() => {
    generateTimeBlocks();
  }, [selectedHours]);
  
  // Update schedule and unscheduled tasks when tasks change
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      // Filter tasks for today
      const todayTasks = tasks.filter(task => 
        new Date(task.date).toDateString() === new Date().toDateString()
      );
      
      // Separate scheduled and unscheduled tasks
      const scheduled = todayTasks.filter(task => 
        task.start_time && task.end_time
      );
      
      const unscheduled = todayTasks.filter(task => 
        !task.start_time || !task.end_time
      );
      
      setSchedule(scheduled);
      setUnscheduledTasks(unscheduled);
    }
  }, [tasks]);
  
  // Generate time blocks for the day
  const generateTimeBlocks = () => {
    const blocks = [];
    for (let hour = selectedHours.start; hour < selectedHours.end; hour++) {
      // Each hour has 4 blocks (15-minute intervals)
      for (let quarter = 0; quarter < 4; quarter++) {
        const startMinute = quarter * 15;
        const startTimeStr = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        
        const endMinute = startMinute + 15;
        let endHour = hour;
        let adjustedEndMinute = endMinute;
        
        if (endMinute === 60) {
          endHour += 1;
          adjustedEndMinute = 0;
        }
        
        const endTimeStr = `${endHour.toString().padStart(2, '0')}:${adjustedEndMinute.toString().padStart(2, '0')}`;
        
        blocks.push({
          id: `${hour}-${quarter}`,
          startTime: startTimeStr,
          endTime: endTimeStr,
          isOccupied: false,
          task: null
        });
      }
    }
    
    setTimeBlocks(blocks);
  };
  
  // Check if a time block is occupied by a scheduled task
  const isBlockOccupied = (block) => {
    if (!schedule || schedule.length === 0) return false;
    
    for (const task of schedule) {
      const taskStart = task.start_time;
      const taskEnd = task.end_time;
      
      // Convert times to minutes for easier comparison
      const blockStartMinutes = timeToMinutes(block.startTime);
      const blockEndMinutes = timeToMinutes(block.endTime);
      const taskStartMinutes = timeToMinutes(taskStart);
      const taskEndMinutes = timeToMinutes(taskEnd);
      
      // Check if the block overlaps with the task
      if ((blockStartMinutes >= taskStartMinutes && blockStartMinutes < taskEndMinutes) ||
          (blockEndMinutes > taskStartMinutes && blockEndMinutes <= taskEndMinutes) ||
          (blockStartMinutes <= taskStartMinutes && blockEndMinutes >= taskEndMinutes)) {
        return { occupied: true, task };
      }
    }
    
    return { occupied: false, task: null };
  };
  
  // Convert time string (HH:MM) to minutes
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Get all available time slots that can fit a task of given duration
  const getAvailableSlots = (durationMinutes) => {
    const slots = [];
    let currentSlot = [];
    let currentMinutes = 0;
    
    // Find continuous free blocks that fit the task
    for (let i = 0; i < timeBlocks.length; i++) {
      const block = timeBlocks[i];
      const { occupied } = isBlockOccupied(block);
      
      if (!occupied) {
        if (currentSlot.length === 0) {
          currentSlot = [i];
          currentMinutes = 15; // Each block is 15 minutes
        } else {
          currentSlot.push(i);
          currentMinutes += 15;
        }
        
        // If we have enough minutes for the task, add this as a potential slot
        if (currentMinutes >= durationMinutes) {
          slots.push([...currentSlot]);
          
          // Slide the window: remove first block and continue looking
          const removedBlock = currentSlot.shift();
          currentMinutes -= 15;
        }
      } else {
        // Reset on encountering occupied block
        currentSlot = [];
        currentMinutes = 0;
      }
    }
    
    return slots;
  };
  
  // Auto-schedule a task in the next available slot
  const autoScheduleTask = (task) => {
    // Calculate duration in minutes
    const durationMinutes = task.duration_minutes || 30; // Default to 30 minutes
    
    // Find available slots
    const availableSlots = getAvailableSlots(durationMinutes);
    
    if (availableSlots.length === 0) {
      if (onDetectConflict) {
        onDetectConflict(task, "No suitable time slots available for this task duration.");
      }
      return false;
    }
    
    // Use the first available slot
    const slot = availableSlots[0];
    const startBlock = timeBlocks[slot[0]];
    
    // Calculate end time based on duration
    const startMinutes = timeToMinutes(startBlock.startTime);
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    
    // Check for conflicts with existing tasks
    const proposedTask = {
      ...task,
      id: task.id,
      start_time: startBlock.startTime,
      end_time: endTime
    };
    
    const conflict = checkTaskOverlap(schedule, proposedTask);
    if (conflict) {
      if (onDetectConflict) {
        onDetectConflict(task, conflict);
      }
      return false;
    }
    
    // Schedule the task
    if (onScheduleTask) {
      onScheduleTask(task.id, startBlock.startTime, endTime);
    }
    
    return true;
  };
  
  // Get task for a specific time block
  const getTaskForBlock = (block) => {
    const { occupied, task } = isBlockOccupied(block);
    return occupied ? task : null;
  };
  
  // Get CSS class for a block based on its task
  const getBlockClass = (block) => {
    const task = getTaskForBlock(block);
    if (!task) return "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600";
    
    // Style based on task priority
    switch(parseInt(task.priority, 10)) {
      case 4: // Urgent
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800";
      case 3: // High
        return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800";
      case 2: // Medium
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800";
      case 1: // Low
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800";
      default:
        return "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600";
    }
  };
  
  // Handle drag events for unscheduled tasks
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData("taskId", task.id);
  };
  
  // Handle dropping a task onto a time block
  const handleDrop = (e, block) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const task = unscheduledTasks.find(t => t.id.toString() === taskId);
    
    if (!task) return;
    
    // Calculate end time based on task duration
    const durationMinutes = task.duration_minutes || 30; // Default to 30 minutes
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    
    // Check for conflicts
    const proposedTask = {
      ...task,
      id: task.id,
      start_time: block.startTime,
      end_time: endTime
    };
    
    const conflict = checkTaskOverlap(schedule, proposedTask);
    if (conflict) {
      if (onDetectConflict) {
        onDetectConflict(task, conflict);
      }
      return;
    }
    
    // Schedule the task
    if (onScheduleTask) {
      onScheduleTask(task.id, block.startTime, endTime);
    }
  };
  
  // Allow dropping on time blocks
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Bloco de Tempo
      </h3>
      
      {/* Time Range Selector */}
      <div className="mb-4 flex items-center space-x-4">
        <div>
          <label htmlFor="startHour" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hora Início
          </label>
          <select
            id="startHour"
            value={selectedHours.start}
            onChange={(e) => setSelectedHours({...selectedHours, start: parseInt(e.target.value, 10)})}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            {Array.from({length: 24}, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="endHour" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hora Fim
          </label>
          <select
            id="endHour"
            value={selectedHours.end}
            onChange={(e) => setSelectedHours({...selectedHours, end: parseInt(e.target.value, 10)})}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            {Array.from({length: 24}, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        {/* Time blocks calendar */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-hidden">
            <div className="overflow-y-auto max-h-96">
              {timeBlocks.map((block) => {
                const task = getTaskForBlock(block);
                const isBlockStart = task && task.start_time === block.startTime;
                
                return (
                  <div 
                    key={block.id}
                    className={`px-2 py-1 border-b border-gray-200 dark:border-gray-700 ${getBlockClass(block)}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, block)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">
                        {block.startTime}
                      </span>
                      
                      {isBlockStart && (
                        <span className="text-xs truncate">
                          {task.title}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Unscheduled Tasks */}
        <div className="w-full md:w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tarefas Não Agendadas ({unscheduledTasks.length})
            </h4>
          </div>
          
          <div className="overflow-y-auto max-h-80 p-2">
            {unscheduledTasks.length > 0 ? (
              <div className="space-y-2">
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 cursor-move hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {task.title}
                      </span>
                      
                      {task.priority && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          task.priority === '4' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          task.priority === '3' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          task.priority === '2' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          P{task.priority}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1 flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.duration_minutes ? `${task.duration_minutes} min` : 'Duração não definida'}
                      </span>
                      
                      <button
                        onClick={() => autoScheduleTask(task)}
                        className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                Sem tarefas não agendadas
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Dica: Arraste tarefas não agendadas para os blocos de tempo ou use o botão "Auto" para agendamento automático.
      </div>
    </div>
  );
};

export default TimeBlockingScheduler;