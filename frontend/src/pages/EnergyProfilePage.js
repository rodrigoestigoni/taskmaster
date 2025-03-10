import React, { useState, useEffect } from 'react';
import { BoltIcon, SunIcon, MoonIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const EnergyProfilePage = () => {
  // Em produção, isso seria carregado do backend
  const [profile, setProfile] = useState({
    earlyMorningEnergy: 5,
    midMorningEnergy: 8,
    lateMorningEnergy: 7,
    earlyAfternoonEnergy: 6,
    lateAfternoonEnergy: 4,
    eveningEnergy: 3,
    nightEnergy: 2,
    mondayModifier: 0,
    tuesdayModifier: 0,
    wednesdayModifier: 0,
    thursdayModifier: 0,
    fridayModifier: -1,
    saturdayModifier: 1,
    sundayModifier: 2,
  });

  const handleChange = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  // Componente de slider de energia com visualização
  const EnergySlider = ({ name, value, onChange, label, icon }) => {
    const getEnergyColor = (level) => {
      if (level >= 8) return 'bg-green-500';
      if (level >= 5) return 'bg-blue-500';
      return 'bg-yellow-500';
    };
    
    return (
      <div className="mb-4">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {icon}
          <span className="ml-2">{label}</span>
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min="1"
            max="10"
            value={value}
            onChange={(e) => onChange(name, parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getEnergyColor(value)}`}
          >
            {value}
          </div>
        </div>
      </div>
    );
  };

  // Representação visual do perfil energético
  const EnergyChart = () => {
    const timePoints = [
      { time: '6h', energy: profile.earlyMorningEnergy },
      { time: '9h', energy: profile.midMorningEnergy },
      { time: '12h', energy: profile.lateMorningEnergy },
      { time: '15h', energy: profile.earlyAfternoonEnergy },
      { time: '18h', energy: profile.lateAfternoonEnergy },
      { time: '21h', energy: profile.eveningEnergy },
      { time: '0h', energy: profile.nightEnergy },
    ];

    const getEnergyColor = (level) => {
      if (level >= 8) return '#10B981'; // green-500
      if (level >= 5) return '#3B82F6'; // blue-500
      return '#F59E0B'; // yellow-500
    };

    return (
      <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
          Seu Perfil de Energia
        </h3>
        
        <div className="relative h-40 bg-gray-50 dark:bg-gray-900 rounded-lg">
          {/* Eixo Y */}
          <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between items-center text-xs text-gray-500 dark:text-gray-400 py-2">
            <span>10</span>
            <span>5</span>
            <span>1</span>
          </div>
          
          {/* Área do gráfico */}
          <div className="absolute left-10 right-0 top-0 bottom-0">
            {/* Linhas de grade horizontais */}
            <div className="absolute left-0 right-0 top-1/4 h-px bg-gray-200 dark:bg-gray-700"></div>
            <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-200 dark:bg-gray-700"></div>
            <div className="absolute left-0 right-0 top-3/4 h-px bg-gray-200 dark:bg-gray-700"></div>
            
            {/* Pontos e linhas do gráfico */}
            <svg className="absolute inset-0 w-full h-full">
              <polyline
                points={timePoints.map((point, index) => 
                  `${index * (100/(timePoints.length-1))}%,${100 - (point.energy * 10)}%`
                ).join(' ')}
                fill="none"
                stroke="url(#energyGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              <defs>
                <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="50%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              
              {timePoints.map((point, index) => (
                <circle
                  key={index}
                  cx={`${index * (100/(timePoints.length-1))}%`}
                  cy={`${100 - (point.energy * 10)}%`}
                  r="4"
                  fill={getEnergyColor(point.energy)}
                  stroke="white"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
            
            {/* Rótulos de tempo */}
            <div className="absolute left-0 right-0 bottom-0 flex justify-between px-2 text-xs text-gray-500 dark:text-gray-400">
              {timePoints.map((point, index) => (
                <span key={index}>{point.time}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <BoltIcon className="h-5 w-5 mr-2 text-primary-500" />
          Seu Perfil de Energia
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure seu padrão de energia ao longo do dia para otimizar o agendamento de tarefas.
        </p>
      </div>
      
      {/* Gráfico para visualização do perfil energético */}
      <EnergyChart />
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <SunIcon className="h-5 w-5 mr-2 text-orange-500" />
            Períodos da Manhã e Tarde
          </h3>
          <EnergySlider 
            name="earlyMorningEnergy" 
            value={profile.earlyMorningEnergy} 
            onChange={handleChange} 
            label="Início da manhã (5h-8h)" 
            icon={<SunIcon className="h-4 w-4 text-orange-300" />} 
          />
          <EnergySlider 
            name="midMorningEnergy" 
            value={profile.midMorningEnergy} 
            onChange={handleChange} 
            label="Meio da manhã (8h-11h)" 
            icon={<SunIcon className="h-4 w-4 text-orange-400" />} 
          />
          <EnergySlider 
            name="lateMorningEnergy" 
            value={profile.lateMorningEnergy} 
            onChange={handleChange} 
            label="Final da manhã (11h-14h)" 
            icon={<SunIcon className="h-4 w-4 text-orange-500" />} 
          />
          <EnergySlider 
            name="earlyAfternoonEnergy" 
            value={profile.earlyAfternoonEnergy} 
            onChange={handleChange} 
            label="Início da tarde (14h-17h)" 
            icon={<SunIcon className="h-4 w-4 text-orange-400" />} 
          />
        </div>
        
        <div>
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <MoonIcon className="h-5 w-5 mr-2 text-indigo-500" />
            Períodos da Noite
          </h3>
          <EnergySlider 
            name="lateAfternoonEnergy" 
            value={profile.lateAfternoonEnergy} 
            onChange={handleChange} 
            label="Final da tarde (17h-20h)" 
            icon={<SunIcon className="h-4 w-4 text-orange-300" />} 
          />
          <EnergySlider 
            name="eveningEnergy" 
            value={profile.eveningEnergy} 
            onChange={handleChange} 
            label="Noite (20h-23h)" 
            icon={<MoonIcon className="h-4 w-4 text-indigo-300" />} 
          />
          <EnergySlider 
            name="nightEnergy" 
            value={profile.nightEnergy} 
            onChange={handleChange} 
            label="Madrugada (23h-5h)" 
            icon={<MoonIcon className="h-4 w-4 text-indigo-500" />} 
          />
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
          Modificadores por Dia da Semana
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Ajuste como sua energia varia por dia da semana. Valores positivos indicam mais energia, negativos indicam menos energia.
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { key: 'mondayModifier', label: 'Segunda' },
            { key: 'tuesdayModifier', label: 'Terça' },
            { key: 'wednesdayModifier', label: 'Quarta' },
            { key: 'thursdayModifier', label: 'Quinta' },
            { key: 'fridayModifier', label: 'Sexta' },
            { key: 'saturdayModifier', label: 'Sábado' },
            { key: 'sundayModifier', label: 'Domingo' },
          ].map((day) => (
            <div key={day.key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex flex-col items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{day.label}</span>
              <div className="flex items-center mt-2">
                <button
                  onClick={() => handleChange(day.key, Math.max(-3, profile[day.key] - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-l-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                >
                  -
                </button>
                <div className="w-10 h-8 flex items-center justify-center bg-white dark:bg-gray-800 border-t border-b border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                  {profile[day.key]}
                </div>
                <button
                  onClick={() => handleChange(day.key, Math.min(3, profile[day.key] + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-r-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Salvar Perfil
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default EnergyProfilePage;