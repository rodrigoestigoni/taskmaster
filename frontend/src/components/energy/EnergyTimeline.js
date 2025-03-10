import React from 'react';

const EnergyTimeline = ({ currentTime = new Date() }) => {
  // Horários principais do dia
  const timePoints = [
    { hour: 6, label: '6h' },
    { hour: 9, label: '9h' },
    { hour: 12, label: '12h' },
    { hour: 15, label: '15h' },
    { hour: 18, label: '18h' },
    { hour: 21, label: '21h' },
    { hour: 0, label: '0h' },
  ];
  
  // Para esta demo, usamos valores pré-definidos
  // Na implementação real, viriam da API
  const energyLevels = [
    { hour: 6, level: 6 },
    { hour: 9, level: 9 },
    { hour: 12, level: 7 },
    { hour: 15, level: 5 },
    { hour: 18, level: 4 },
    { hour: 21, level: 3 },
    { hour: 0, level: 2 },
  ];
  
  // Determinar a hora atual para marcar no gráfico
  const currentHour = currentTime.getHours();
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
        Energia ao Longo do Dia
      </h3>
      
      <div className="relative h-28 bg-gray-50 dark:bg-gray-900 rounded-lg">
        {/* Linha do tempo (eixo X) */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
          {timePoints.map((point, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {point.label}
              </span>
              <div className="h-2 w-px bg-gray-300 dark:bg-gray-600 mt-1"></div>
            </div>
          ))}
        </div>
        
        {/* Barras de energia */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-2">
          {energyLevels.map((point, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className={`w-6 rounded-t-sm ${
                  point.level >= 8 ? 'bg-green-500' :
                  point.level >= 5 ? 'bg-blue-500' : 'bg-yellow-500'
                } ${
                  // Destaque para o horário atual
                  (index > 0 && timePoints[index-1].hour <= currentHour && timePoints[index].hour > currentHour) ?
                  'ring-2 ring-primary-500' : ''
                }`}
                style={{ height: `${point.level * 5}px` }}
              ></div>
            </div>
          ))}
        </div>
        
        {/* Marcador de agora */}
        <div 
          className="absolute bottom-6 w-2 h-2 rounded-full bg-primary-600 z-10"
          style={{ 
            left: `${calculateCurrentPosition(currentHour, timePoints)}%`,
            transform: 'translateX(-50%)'
          }}
        ></div>
      </div>
      
      <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
        O melhor momento para tarefas de alta energia é entre 8h e 11h
      </div>
    </div>
  );
};

// Função auxiliar para calcular posição do marcador atual
function calculateCurrentPosition(currentHour, timePoints) {
  // Implementação simplificada
  // Cálculo baseado na posição relativa entre os pontos de tempo
  const totalPoints = timePoints.length;
  const segmentWidth = 100 / (totalPoints - 1);
  
  // Encontrar entre quais pontos estamos
  for (let i = 0; i < totalPoints - 1; i++) {
    const startHour = timePoints[i].hour;
    const endHour = timePoints[i+1].hour;
    
    // Ajustar para horas depois da meia-noite
    const adjustedEnd = endHour < startHour ? endHour + 24 : endHour;
    const adjustedCurrent = currentHour < startHour ? currentHour + 24 : currentHour;
    
    if (startHour <= adjustedCurrent && adjustedCurrent < adjustedEnd) {
      // Calcular posição proporcional dentro deste segmento
      const segmentPosition = (adjustedCurrent - startHour) / (adjustedEnd - startHour);
      return (i * segmentWidth) + (segmentPosition * segmentWidth);
    }
  }
  
  // Fallback se não encontrar (não deve acontecer)
  return 0;
}

export default EnergyTimeline;