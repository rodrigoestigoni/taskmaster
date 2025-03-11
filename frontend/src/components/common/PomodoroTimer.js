import React, { useState, useEffect, useRef } from 'react';

const PomodoroTimer = ({ taskId, taskTitle, onComplete }) => {
  // Default Pomodoro settings
  const defaultSettings = {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLongBreak: 4
  };
  
  const [settings, setSettings] = useState(defaultSettings);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work'); // 'work', 'shortBreak', or 'longBreak'
  const [secondsLeft, setSecondsLeft] = useState(settings.workMinutes * 60);
  const [sessionCount, setSessionCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const intervalRef = useRef(null);
  
  // Update timer when settings change
  useEffect(() => {
    if (mode === 'work') {
      setSecondsLeft(settings.workMinutes * 60);
    } else if (mode === 'shortBreak') {
      setSecondsLeft(settings.shortBreakMinutes * 60);
    } else {
      setSecondsLeft(settings.longBreakMinutes * 60);
    }
  }, [settings, mode]);
  
  // Timer countdown effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prevSeconds => {
          if (prevSeconds <= 1) {
            clearInterval(intervalRef.current);
            handleTimerEnd();
            return 0;
          }
          return prevSeconds - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);
  
  // Handle timer completion
  const handleTimerEnd = () => {
    // Play a sound if supported
    try {
      const audio = new Audio();
      audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZ//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAVBQ////M4wl4qP/LMYxQAB4AAAAwjngQDgCQAAQDglU4IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      audio.play().catch(e => console.error('Audio playback error:', e));
    } catch (e) {
      console.log('Audio notification not supported');
    }
    
    if (mode === 'work') {
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      
      // After work session, decide which break to take
      if (newSessionCount % settings.sessionsUntilLongBreak === 0) {
        setMode('longBreak');
      } else {
        setMode('shortBreak');
      }
      
      // Notify task completion if callback provided
      if (onComplete) {
        onComplete(taskId);
      }
    } else {
      // After any break, go back to work mode
      setMode('work');
    }
    
    setIsRunning(false);
  };
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Toggle timer
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };
  
  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    if (mode === 'work') {
      setSecondsLeft(settings.workMinutes * 60);
    } else if (mode === 'shortBreak') {
      setSecondsLeft(settings.shortBreakMinutes * 60);
    } else {
      setSecondsLeft(settings.longBreakMinutes * 60);
    }
  };
  
  // Change mode manually
  const changeMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
  };
  
  // Update settings
  const updateSettings = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setSettings({
      workMinutes: parseInt(formData.get('workMinutes')),
      shortBreakMinutes: parseInt(formData.get('shortBreakMinutes')),
      longBreakMinutes: parseInt(formData.get('longBreakMinutes')),
      sessionsUntilLongBreak: parseInt(formData.get('sessionsUntilLongBreak'))
    });
    setIsSettingsOpen(false);
  };
  
  // Calculate progress percentage
  const progressPercentage = () => {
    let totalSeconds;
    if (mode === 'work') {
      totalSeconds = settings.workMinutes * 60;
    } else if (mode === 'shortBreak') {
      totalSeconds = settings.shortBreakMinutes * 60;
    } else {
      totalSeconds = settings.longBreakMinutes * 60;
    }
    
    return ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {taskTitle || 'Pomodoro Timer'}
        </h3>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Timer Display */}
      <div className="relative w-full pt-2">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
          <div 
            className={`h-2.5 rounded-full ${
              mode === 'work' ? 'bg-red-500' : 
              mode === 'shortBreak' ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage()}%` }}
          ></div>
        </div>
        
        {/* Time Display */}
        <div className="text-center mb-4">
          <span className="text-4xl font-bold text-gray-800 dark:text-white">
            {formatTime(secondsLeft)}
          </span>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'work' ? 'Foco' : 
             mode === 'shortBreak' ? 'Pausa Curta' : 'Pausa Longa'}
          </div>
        </div>
        
        {/* Mode Selector */}
        <div className="flex justify-center space-x-2 mb-4">
          <button 
            onClick={() => changeMode('work')}
            className={`px-3 py-1 text-xs rounded-full ${
              mode === 'work' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Trabalho
          </button>
          <button 
            onClick={() => changeMode('shortBreak')}
            className={`px-3 py-1 text-xs rounded-full ${
              mode === 'shortBreak' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Pausa Curta
          </button>
          <button 
            onClick={() => changeMode('longBreak')}
            className={`px-3 py-1 text-xs rounded-full ${
              mode === 'longBreak' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            Pausa Longa
          </button>
        </div>
        
        {/* Control Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={toggleTimer}
            className={`px-4 py-2 rounded-md ${
              isRunning
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-primary-500 hover:bg-primary-600 text-white'
            }`}
          >
            {isRunning ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            onClick={resetTimer}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
          >
            Reiniciar
          </button>
        </div>
        
        {/* Session counter */}
        <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
          Sessões completadas: {sessionCount}
        </div>
      </div>
      
      {/* Settings Panel */}
      {isSettingsOpen && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Configurações do Pomodoro
          </h4>
          
          <form onSubmit={updateSettings}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="workMinutes" className="block text-xs text-gray-600 dark:text-gray-400">
                  Minutos de Trabalho
                </label>
                <input
                  type="number"
                  name="workMinutes"
                  id="workMinutes"
                  defaultValue={settings.workMinutes}
                  min="1"
                  max="60"
                  className="mt-1 w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="shortBreakMinutes" className="block text-xs text-gray-600 dark:text-gray-400">
                  Minutos de Pausa Curta
                </label>
                <input
                  type="number"
                  name="shortBreakMinutes"
                  id="shortBreakMinutes"
                  defaultValue={settings.shortBreakMinutes}
                  min="1"
                  max="15"
                  className="mt-1 w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="longBreakMinutes" className="block text-xs text-gray-600 dark:text-gray-400">
                  Minutos de Pausa Longa
                </label>
                <input
                  type="number"
                  name="longBreakMinutes"
                  id="longBreakMinutes"
                  defaultValue={settings.longBreakMinutes}
                  min="5"
                  max="30"
                  className="mt-1 w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="sessionsUntilLongBreak" className="block text-xs text-gray-600 dark:text-gray-400">
                  Sessões até Pausa Longa
                </label>
                <input
                  type="number"
                  name="sessionsUntilLongBreak"
                  id="sessionsUntilLongBreak"
                  defaultValue={settings.sessionsUntilLongBreak}
                  min="1"
                  max="10"
                  className="mt-1 w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="mr-2 px-3 py-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-sm text-white bg-primary-500 rounded-md"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;