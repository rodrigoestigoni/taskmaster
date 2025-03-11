import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Componente simplificado de perfil de energia
const EnergyProfilePage = () => {
  // Estado para armazenar o perfil de energia
  const [profile, setProfile] = useState({
    // Apenas 3 períodos do dia
    morningEnergy: 8,    // Manhã (5h-12h)
    afternoonEnergy: 6,  // Tarde (12h-18h) 
    eveningEnergy: 4,    // Noite (18h-5h)
    
    // Dias da semana - valores entre -2 e +2 para modificar a energia
    weekdayModifiers: [0, 0, 0, 0, -1, 1, 0]  // Seg, Ter, Qua, Qui, Sex, Sáb, Dom
  });

  useEffect(() => {
    const hasSeenEnergyIntro = localStorage.getItem('hasSeenEnergyIntro');
    if (!hasSeenEnergyIntro) {
      toast.info(
        "👋 Bem-vindo ao gerenciamento de energia! Configure seu perfil de energia para receber recomendações personalizadas de tarefas com base nos seus níveis de energia ao longo do dia.", 
        { autoClose: 8000 }
      );
      localStorage.setItem('hasSeenEnergyIntro', 'true');
    }
  }, []);

  // Função para atualizar valores do perfil
  const handleChange = (key, value) => {
    if (key.startsWith('weekday')) {
      // Para modificadores de dia da semana
      const index = parseInt(key.replace('weekday', ''), 10);
      const newModifiers = [...profile.weekdayModifiers];
      newModifiers[index] = value;
      
      setProfile(prev => ({
        ...prev,
        weekdayModifiers: newModifiers
      }));
    } else {
      // Para níveis de energia
      setProfile(prev => ({ ...prev, [key]: value }));
    }
  };

  // Função para salvar o perfil
  const handleSaveProfile = () => {
    // Em uma implementação real, enviaríamos para o backend
    // await TaskService.saveEnergyProfile(profile);
    
    toast.success('Perfil de energia salvo com sucesso!');
  };

  // Componente de slider de energia
  const EnergySlider = ({ name, value, onChange, label, description }) => {
    const getEnergyLabel = (level) => {
      if (level >= 8) return "Alta Energia";
      if (level >= 5) return "Energia Média";
      return "Baixa Energia";
    };
    
    const getEnergyColor = (level) => {
      if (level >= 8) return 'bg-green-500';
      if (level >= 5) return 'bg-blue-500';
      return 'bg-yellow-500';
    };
    
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <div className={`px-2 py-1 rounded text-xs text-white ${getEnergyColor(value)}`}>
            {getEnergyLabel(value)}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min="1"
            max="10"
            value={value}
            onChange={(e) => onChange(name, parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getEnergyColor(value)}`}
          >
            {value}
          </div>
        </div>
        
        {description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    );
  };

  // Componente para modificador de dia da semana
  const WeekdayModifier = ({ index, value, onChange }) => {
    const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    
    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex flex-col items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{dayNames[index]}</span>
        <div className="flex items-center">
          <button
            onClick={() => onChange(`weekday${index}`, Math.max(-2, value - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-l-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            -
          </button>
          <div className="w-10 h-8 flex items-center justify-center bg-white dark:bg-gray-800 border-t border-b border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
            {value > 0 ? `+${value}` : value}
          </div>
          <button
            onClick={() => onChange(`weekday${index}`, Math.min(2, value + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-r-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Seu Perfil de Energia
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure seu padrão de energia para otimizar suas tarefas ao longo do dia.
        </p>
      </div>
      
      {/* Níveis de energia do dia */}
      <div className="mb-8">
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
          Níveis de Energia
        </h3>
        
        <EnergySlider 
          name="morningEnergy" 
          value={profile.morningEnergy} 
          onChange={handleChange} 
          label="Manhã (5h-12h)" 
          description="Configure seu nível de energia típico durante a manhã"
        />
        
        <EnergySlider 
          name="afternoonEnergy" 
          value={profile.afternoonEnergy} 
          onChange={handleChange} 
          label="Tarde (12h-18h)" 
          description="Configure seu nível de energia típico durante a tarde"
        />
        
        <EnergySlider 
          name="eveningEnergy" 
          value={profile.eveningEnergy} 
          onChange={handleChange} 
          label="Noite (18h-5h)" 
          description="Configure seu nível de energia típico durante a noite"
        />
      </div>
      
      {/* Modificadores de dia da semana */}
      <div className="mb-8">
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
          Diferenças por Dia da Semana
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Ajuste como sua energia varia em dias específicos. Valores positivos indicam mais energia, negativos indicam menos energia.
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {profile.weekdayModifiers.map((value, index) => (
            <WeekdayModifier 
              key={index}
              index={index}
              value={value}
              onChange={handleChange}
            />
          ))}
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSaveProfile}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Salvar Perfil
          <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default EnergyProfilePage;