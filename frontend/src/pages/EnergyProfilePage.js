import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import TaskService from '../services/TaskService';

// Componente de perfil de energia
const EnergyProfilePage = () => {
  // Estado para armazenar o perfil de energia
  const [profile, setProfile] = useState({
    // Períodos da manhã
    early_morning_energy: 5,  // Início da manhã (5h-8h)
    mid_morning_energy: 7,    // Meio da manhã (8h-11h)
    late_morning_energy: 6,   // Final da manhã (11h-14h)
    
    // Períodos da tarde
    early_afternoon_energy: 5, // Início da tarde (14h-17h)
    late_afternoon_energy: 4,  // Final da tarde (17h-20h)
    
    // Período da noite
    evening_energy: 3,        // Noite (20h-23h)
    night_energy: 2,          // Madrugada (23h-5h)
    
    // Dias da semana - valores entre -2 e +2 para modificar a energia
    monday_modifier: 0,
    tuesday_modifier: 0,
    wednesday_modifier: 0,
    thursday_modifier: 0,
    friday_modifier: -1,
    saturday_modifier: 1,
    sunday_modifier: 0
  });
  
  const [loading, setLoading] = useState(true);

  // Carregar o perfil do usuário ao iniciar
  useEffect(() => {
    fetchProfile();
    
    const hasSeenEnergyIntro = localStorage.getItem('hasSeenEnergyIntro');
    if (!hasSeenEnergyIntro) {
      toast.info(
        "👋 Bem-vindo ao gerenciamento de energia! Configure seu perfil de energia para receber recomendações personalizadas de tarefas com base nos seus níveis de energia ao longo do dia.", 
        { autoClose: 8000 }
      );
      localStorage.setItem('hasSeenEnergyIntro', 'true');
    }
  }, []);
  
  // Função para buscar o perfil
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await TaskService.getEnergyProfile();
      if (response.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil de energia:', error);
      toast.error('Não foi possível carregar seu perfil de energia');
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar valores do perfil
  const handleChange = (key, value) => {
    setProfile(prev => ({ 
      ...prev, 
      [key]: value 
    }));
  };

  // Função para salvar o perfil
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      await TaskService.saveEnergyProfile(profile);
      toast.success('Perfil de energia salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil de energia:', error);
      toast.error('Erro ao salvar o perfil de energia');
    } finally {
      setLoading(false);
    }
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

  // Componente para o novo seletor do dia da semana
  const WeekdayModifierNew = ({ day, value, onChange }) => {
    const dayNames = {
      'monday_modifier': 'Segunda',
      'tuesday_modifier': 'Terça',
      'wednesday_modifier': 'Quarta',
      'thursday_modifier': 'Quinta',
      'friday_modifier': 'Sexta',
      'saturday_modifier': 'Sábado',
      'sunday_modifier': 'Domingo'
    };
    
    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex flex-col items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{dayNames[day]}</span>
        <div className="flex items-center">
          <button
            onClick={() => onChange(day, Math.max(-2, profile[day] - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-l-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
            disabled={loading}
          >
            -
          </button>
          <div className="w-10 h-8 flex items-center justify-center bg-white dark:bg-gray-800 border-t border-b border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
            {profile[day] > 0 ? `+${profile[day]}` : profile[day]}
          </div>
          <button
            onClick={() => onChange(day, Math.min(2, profile[day] + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-r-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
            disabled={loading}
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
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ) : (
        <>
          {/* Níveis de energia do dia - Manhã */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
              Níveis de Energia - Manhã
            </h3>
            
            <EnergySlider 
              name="early_morning_energy" 
              value={profile.early_morning_energy} 
              onChange={handleChange} 
              label="Início da manhã (5h-8h)" 
              description="Configure seu nível de energia no início da manhã"
            />
            
            <EnergySlider 
              name="mid_morning_energy" 
              value={profile.mid_morning_energy} 
              onChange={handleChange} 
              label="Meio da manhã (8h-11h)" 
              description="Configure seu nível de energia no meio da manhã"
            />
            
            <EnergySlider 
              name="late_morning_energy" 
              value={profile.late_morning_energy} 
              onChange={handleChange} 
              label="Final da manhã (11h-14h)" 
              description="Configure seu nível de energia no final da manhã"
            />
          </div>
          
          {/* Níveis de energia do dia - Tarde e Noite */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
              Níveis de Energia - Tarde e Noite
            </h3>
            
            <EnergySlider 
              name="early_afternoon_energy" 
              value={profile.early_afternoon_energy} 
              onChange={handleChange} 
              label="Início da tarde (14h-17h)" 
              description="Configure seu nível de energia no início da tarde"
            />
            
            <EnergySlider 
              name="late_afternoon_energy" 
              value={profile.late_afternoon_energy} 
              onChange={handleChange} 
              label="Final da tarde (17h-20h)" 
              description="Configure seu nível de energia no final da tarde"
            />
            
            <EnergySlider 
              name="evening_energy" 
              value={profile.evening_energy} 
              onChange={handleChange} 
              label="Noite (20h-23h)" 
              description="Configure seu nível de energia durante a noite"
            />
            
            <EnergySlider 
              name="night_energy" 
              value={profile.night_energy} 
              onChange={handleChange} 
              label="Madrugada (23h-5h)" 
              description="Configure seu nível de energia durante a madrugada"
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
              <WeekdayModifierNew 
                day="monday_modifier"
                value={profile.monday_modifier}
                onChange={handleChange}
              />
              <WeekdayModifierNew 
                day="tuesday_modifier"
                value={profile.tuesday_modifier}
                onChange={handleChange}
              />
              <WeekdayModifierNew 
                day="wednesday_modifier"
                value={profile.wednesday_modifier}
                onChange={handleChange}
              />
              <WeekdayModifierNew 
                day="thursday_modifier"
                value={profile.thursday_modifier}
                onChange={handleChange}
              />
              <WeekdayModifierNew 
                day="friday_modifier"
                value={profile.friday_modifier}
                onChange={handleChange}
              />
              <WeekdayModifierNew 
                day="saturday_modifier"
                value={profile.saturday_modifier}
                onChange={handleChange}
              />
              <WeekdayModifierNew 
                day="sunday_modifier"
                value={profile.sunday_modifier}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Perfil'}
              {!loading && (
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EnergyProfilePage;