import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Modal para mostrar quando há sobreposição de horários entre tarefas
 */
const TaskOverlapModal = ({ isOpen, onClose, onConfirm, overlappingTask }) => {
  return (
    <Transition.Root show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={onClose}>
        <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
            &#8203;
          </span>
          
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    Sobreposição de horário detectada
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      O horário desta tarefa conflita com a tarefa "{overlappingTask?.title}".
                    </p>
                    
                    {overlappingTask && (
                      <div className="mt-3 rounded-md bg-gray-50 dark:bg-gray-700 p-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {overlappingTask.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {overlappingTask.start_time} - {overlappingTask.end_time}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={onConfirm}
                >
                  Salvar mesmo assim
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={onClose}
                >
                  Ajustar horário
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

/**
 * Função para verificar sobreposição entre tarefas
 * @param {Array} existingTasks - Lista de tarefas existentes
 * @param {Object} newTask - Nova tarefa a ser verificada
 * @returns {Object|null} - Tarefa sobreposta ou null se não houver sobreposição
 */
export const checkTaskOverlap = (existingTasks, newTask) => {
  if (!existingTasks || existingTasks.length === 0 || !newTask) return null;
  
  // Não verificar a própria tarefa (útil para edição)
  const tasksToCheck = existingTasks.filter(task => 
    task.id !== newTask.id && task.date === newTask.date
  );
  
  if (tasksToCheck.length === 0) return null;
  
  // Verificar se há sobreposição
  for (const task of tasksToCheck) {
    // Converter para minutos para facilitar a comparação
    const taskStart = timeToMinutes(task.start_time);
    const taskEnd = timeToMinutes(task.end_time);
    const newTaskStart = timeToMinutes(newTask.start_time);
    const newTaskEnd = timeToMinutes(newTask.end_time);
    
    // Ajustar para tarefas que passam da meia-noite
    const adjustedTaskEnd = taskEnd < taskStart ? taskEnd + 24 * 60 : taskEnd;
    const adjustedNewTaskEnd = newTaskEnd < newTaskStart ? newTaskEnd + 24 * 60 : newTaskEnd;
    
    // Verificar sobreposição
    // Sobreposição ocorre quando o início ou fim de uma tarefa está entre o início e fim da outra
    if ((newTaskStart >= taskStart && newTaskStart < adjustedTaskEnd) || 
        (adjustedNewTaskEnd > taskStart && adjustedNewTaskEnd <= adjustedTaskEnd) ||
        (newTaskStart <= taskStart && adjustedNewTaskEnd >= adjustedTaskEnd)) {
      return task;
    }
  }
  
  return null;
};

// Função auxiliar para converter tempo (HH:MM) para minutos
const timeToMinutes = (timeString) => {
  if (!timeString) return 0;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

export default TaskOverlapModal;