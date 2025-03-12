import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import TaskService from '../services/TaskService';

const CompleteReadingTaskButton = ({ task, onSuccess }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagesRead, setPagesRead] = useState(task.target_value || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async (e) => {
    e.preventDefault();
    
    if (!pagesRead || isNaN(Number(pagesRead))) {
      toast.error('Por favor, informe um número válido de páginas');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Preparar os dados com o valor atual
      const completionData = {
        status: 'completed',
        actual_value: Number(pagesRead), // Converter para número para garantir
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: task.notes || 'Leitura concluída'
      };
      
      console.log('Enviando dados para conclusão:', completionData);
      
      // Chamar a API para atualizar o status
      const response = await TaskService.updateTaskStatus(task.id, completionData);
      console.log('Resposta da API:', response.data);
      
      toast.success(`Tarefa concluída! ${pagesRead} páginas adicionadas à meta.`);
      
      // Fechar o modal e executar callback de sucesso
      setIsModalOpen(false);
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error);
      toast.error('Erro ao concluir tarefa. Verifique o console para mais detalhes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        title="Marcar como concluída"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Concluir tarefa de leitura
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Quantas páginas você leu na tarefa "{task.title}"?
                      </p>
                      
                      <form onSubmit={handleComplete}>
                        <div className="mb-4">
                          <label htmlFor="pagesRead" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Número de páginas
                          </label>
                          <input
                            type="number"
                            name="pagesRead"
                            id="pagesRead"
                            value={pagesRead}
                            onChange={(e) => setPagesRead(e.target.value)}
                            min="1"
                            required
                            className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                          />
                        </div>
                        
                        <div className="mt-6 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                          >
                            {isSubmitting ? 'Salvando...' : 'Concluir tarefa'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompleteReadingTaskButton;