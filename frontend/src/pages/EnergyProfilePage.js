import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import TaskService from '../services/TaskService';

// Componente de perfil de energia simplificado
const EnergyProfilePage = () => {
  // Estado para armazenar o perfil de energia simplificado
  const [profile, setProfile] = useState({
    // Simplificado para apenas 3 períodos
    morning_energy: 7,     // Manhã (5h-12h)
    afternoon_energy: 5,   // Tarde (12h-18h)
    evening_energy: 3,     // Noite/Madrugada (18h-5h)
    
    // Simplificado para apenas dias úteis e finais de semana
    weekday_modifier: 0,   // Segunda a Sexta
    weekend_modifier: 1,   // Sábado e Domingo
  });
  
  // Estado para o perfil completo (para compatibilidade com a API)
  const [fullProfile, setFullProfile] = useState({
    early_morning_energy: 5,
    mid_morning_energy: 7,
    late_morning_energy: 6,
    early_afternoon_energy: 5,
    late_afternoon_energy: 4,
    evening_energy: 3,
    night_energy: 2,
    monday_modifier: 0,
    tuesday_modifier: 0,
    wednesday_modifier: 0,
    thursday_modifier: 0,
    friday_modifier: 0,
    saturday_modifier: 1,
    sunday_modifier: 1
  });
  
  const [loading, setLoading] = useState(true);

  // Carregar o perfil do usuário ao iniciar
  useEffect(() => {
    fetchProfile();
    
    const hasSeenEnergyIntro = localStorage.getItem('hasSeenEnergyIntro');
    if (!hasSeenEnergyIntro) {
      toast.info(
        "👋 Configure seu perfil de energia para receber recomendações de tarefas com base nos seus níveis de energia ao longo do dia.", 
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
        // Guardar o perfil completo para envio posterior
        setFullProfile(response.data);
        
        // Simplificar para a interface do usuário
        const simplifiedProfile = {
          // Média dos valores da manhã
          morning_energy: Math.round((
            response.data.early_morning_energy + 
            response.data.mid_morning_energy + 
            response.data.late_morning_energy) / 3),
          
          // Média dos valores da tarde
          afternoon_energy: Math.round((
            response.data.early_afternoon_energy + 
            response.data.late_afternoon_energy) / 2),
          
          // Média dos valores da noite
          evening_energy: Math.round((
            response.data.evening_energy + 
            response.data.night_energy) / 2),
          
          // Média dos modificadores de dias úteis
          weekday_modifier: Math.round((
            response.data.monday_modifier + 
            response.data.tuesday_modifier + 
            response.data.wednesday_modifier + 
            response.data.thursday_modifier + 
            response.data.friday_modifier) / 5),
          
          // Média dos modificadores de fim de semana
          weekend_modifier: Math.round((
            response.data.saturday_modifier + 
            response.data.sunday_modifier) / 2)
        };
        
        setProfile(simplifiedProfile);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil de energia:', error);
      toast.error('Não foi possível carregar seu perfil de energia');
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar valores do perfil simplificado
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
      
      // Atualizar o perfil completo com os valores simplificados
      const updatedFullProfile = {
        ...fullProfile,
        early_morning_energy: profile.morning_energy,
        mid_morning_energy: profile.morning_energy,
        late_morning_energy: profile.morning_energy,
        early_afternoon_energy: profile.afternoon_energy,
        late_afternoon_energy: profile.afternoon_energy,
        evening_energy: profile.evening_energy,
        night_energy: profile.evening_energy,
        monday_modifier: profile.weekday_modifier,
        tuesday_modifier: profile.weekday_modifier,
        wednesday_modifier: profile.weekday_modifier,
        thursday_modifier: profile.weekday_modifier,
        friday_modifier: profile.weekday_modifier,
        saturday_modifier: profile.weekend_modifier,
        sunday_modifier: profile.weekend_modifier
      };
      
      await TaskService.saveEnergyProfile(updatedFullProfile);
      toast.success('Perfil de energia salvo com sucesso!');
      
      // Atualizar o perfil completo em cache
      setFullProfile(updatedFullProfile);
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

  // Componente simplificado para modificador de energia por dia
  const DayModifier = ({ type, value, onChange }) => {
    const labels = {
      'weekday_modifier': 'Dias úteis (Seg-Sex)',
      'weekend_modifier': 'Finais de semana (Sáb-Dom)'
    };
    
    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labels[type]}</span>
        <div className="flex items-center">
          <button
            onClick={() => onChange(type, Math.max(-2, value - 1))}
            className="w-10 h-10 flex items-center justify-center rounded-l-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-lg"
            disabled={loading}
          >
            -
          </button>
          <div className="w-14 h-10 flex items-center justify-center bg-white dark:bg-gray-800 border-t border-b border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium">
            {value > 0 ? `+${value}` : value}
          </div>
          <button
            onClick={() => onChange(type, Math.min(2, value + 1))}
            className="w-10 h-10 flex items-center justify-center rounded-r-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-lg"
            disabled={loading}
          >
            +
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {value > 0 ? 'Mais energia nestes dias' : value < 0 ? 'Menos energia nestes dias' : 'Energia normal'}
        </p>
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
          Configure seu padrão de energia para receber recomendações de tarefas personalizadas.
        </p>
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ) : (
        <>
          {/* Níveis de energia do dia - Simplificado */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
              Níveis de Energia por Período
            </h3>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Configure seu nível típico de energia em diferentes momentos do dia:
              </p>
              
              <EnergySlider 
                name="morning_energy" 
                value={profile.morning_energy} 
                onChange={handleChange} 
                label="Manhã (5h-12h)" 
                description="Sua energia durante a manhã"
              />
              
              <EnergySlider 
                name="afternoon_energy" 
                value={profile.afternoon_energy} 
                onChange={handleChange} 
                label="Tarde (12h-18h)" 
                description="Sua energia durante a tarde"
              />
              
              <EnergySlider 
                name="evening_energy" 
                value={profile.evening_energy} 
                onChange={handleChange} 
                label="Noite (18h-5h)" 
                description="Sua energia durante a noite e madrugada"
              />
            </div>
          </div>
          
          {/* Modificadores de dia da semana - Simplificado */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
              Variação por Dia da Semana
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Ajuste como sua energia varia entre dias úteis e finais de semana:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DayModifier 
                type="weekday_modifier"
                value={profile.weekday_modifier}
                onChange={handleChange}
              />
              <DayModifier 
                type="weekend_modifier"
                value={profile.weekend_modifier}
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