import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const DeleteTaskModal = ({ isOpen, onClose, onConfirm, isRecurring }) => {
  // Estado para rastrear o modo de exclusão selecionado
  const [selectedMode, setSelectedMode] = React.useState('only_this');
  
  // Reset o modo selecionado quando o modal é aberto
  React.useEffect(() => {
    if (isOpen) {
      setSelectedMode('only_this');
    }
  }, [isOpen]);
  
  // Função que lida com a confirmação e chama o callback com o modo
  const handleConfirm = () => {
    onConfirm(selectedMode);
  };
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Fechar</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-4 mt-0 text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                    >
                      Confirmar exclusão
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isRecurring 
                          ? "Esta é uma tarefa recorrente. Como deseja excluí-la?" 
                          : "Tem certeza que deseja excluir esta tarefa?"}
                      </p>
                    </div>
                    
                    {isRecurring && (
                      <div className="mt-4 space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="delete-mode"
                            checked={selectedMode === 'only_this'}
                            onChange={() => setSelectedMode('only_this')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Apenas esta ocorrência
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="delete-mode"
                            checked={selectedMode === 'this_and_future'}
                            onChange={() => setSelectedMode('this_and_future')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Esta e todas as ocorrências futuras
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="delete-mode"
                            checked={selectedMode === 'all'}
                            onChange={() => setSelectedMode('all')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Todas as ocorrências
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleConfirm}
                  >
                    Excluir
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DeleteTaskModal;