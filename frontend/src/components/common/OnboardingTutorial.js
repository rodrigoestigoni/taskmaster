import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ArrowSmallRightIcon,
  ArrowSmallLeftIcon,
  CheckCircleIcon,
  PlusIcon,
  FlagIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

/**
 * Componente de tutorial para novos usuários
 */
const OnboardingTutorial = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Verifica se é a primeira vez que o usuário acessa o sistema
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    
    if (!hasSeenTutorial) {
      // Atrasa a exibição para dar tempo da aplicação carregar completamente
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  const closeTutorial = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };
  
  const nextStep = () => {
    setCurrentStep((prev) => {
      if (prev < steps.length - 1) {
        return prev + 1;
      }
      // Se chegou no último passo, fecha o tutorial
      closeTutorial();
      return prev;
    });
  };
  
  const prevStep = () => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
  };
  
  const steps = [
    {
      title: 'Bem-vindo ao TaskMaster! 👋',
      description: 'Vamos conhecer as principais funcionalidades em alguns passos. Você pode gerenciar seu tempo e organizar suas tarefas de forma eficiente.',
      icon: <CheckCircleIcon className="h-12 w-12 text-primary-500" />,
    },
    {
      title: 'Adicione suas tarefas 📝',
      description: 'Crie tarefas para organizar seu dia. Defina título, descrição, data, horário e prioridade. Você pode criar tarefas recorrentes!',
      icon: <PlusIcon className="h-12 w-12 text-primary-500" />,
    },
    {
      title: 'Defina suas metas 🎯',
      description: 'Estabeleça metas de curto e longo prazo. Acompanhe seu progresso e mantenha o foco no que é importante para você.',
      icon: <FlagIcon className="h-12 w-12 text-primary-500" />,
    },
    {
      title: 'Visualizações diária, semanal e mensal 📅',
      description: 'Veja suas tarefas por dia, semana ou mês. Planeje seu tempo de maneira eficiente e nunca perca um compromisso.',
      icon: <CalendarIcon className="h-12 w-12 text-primary-500" />,
    },
    {
      title: 'Acompanhe seu progresso 📊',
      description: 'Analise relatórios detalhados sobre a conclusão das suas tarefas e metas. Identifique padrões e melhore sua produtividade.',
      icon: <ChartBarIcon className="h-12 w-12 text-primary-500" />,
    },
    {
      title: 'Pronto para começar! 🚀',
      description: 'Agora você já conhece o básico do TaskMaster. Comece a adicionar suas tarefas e metas para organizar melhor seu tempo.',
      icon: <ClockIcon className="h-12 w-12 text-primary-500" />,
    },
  ];
  
  const currentStepData = steps[currentStep];
  
  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4 block">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={closeTutorial}
                  >
                    <span className="sr-only">Fechar</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="text-center sm:mt-1">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                    {currentStepData.icon}
                  </div>
                  <Dialog.Title as="h3" className="mt-3 text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                    {currentStepData.title}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {currentStepData.description}
                    </p>
                  </div>
                </div>
                
                {/* Indicador de etapas */}
                <div className="mt-6 flex justify-center">
                  <div className="flex space-x-2">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 w-2 rounded-full ${
                          index === currentStep
                            ? 'bg-primary-600 dark:bg-primary-400'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    className={`${
                      currentStep === 0 ? 'invisible' : ''
                    } inline-flex items-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600`}
                    onClick={prevStep}
                  >
                    <ArrowSmallLeftIcon className="h-5 w-5 mr-1" />
                    Anterior
                  </button>
                  
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    onClick={nextStep}
                  >
                    {currentStep < steps.length - 1 ? (
                      <>
                        Próximo 
                        <ArrowSmallRightIcon className="h-5 w-5 ml-1" />
                      </>
                    ) : (
                      'Concluir'
                    )}
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

export default OnboardingTutorial;