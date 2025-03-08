import React from 'react';
import {
  AcademicCapIcon,
  BriefcaseIcon,
  HomeIcon,
  HeartIcon,
  CurrencyDollarIcon,
  TagIcon,
  TicketIcon,
  PuzzlePieceIcon,
  BookmarkIcon,
  BeakerIcon,
  CalculatorIcon,
  CalendarIcon,
  ClockIcon,
  CloudIcon,
  CodeBracketIcon,
  CogIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DocumentIcon,
  EnvelopeIcon,
  FireIcon,
  GiftIcon,
  GlobeAltIcon,
  LightBulbIcon,
  MapIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  PaintBrushIcon,
  PaperAirplaneIcon,
  PencilIcon,
  PhoneIcon,
  PhotoIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  StarIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
  VideoCameraIcon,
  WrenchIcon
} from '@heroicons/react/24/outline';

// Mapeamento de nomes de ícones para componentes reais
const iconMap = {
  'academic-cap': AcademicCapIcon,
  'briefcase': BriefcaseIcon,
  'home': HomeIcon,
  'heart': HeartIcon,
  'currency-dollar': CurrencyDollarIcon,
  'tag': TagIcon,
  'ticket': TicketIcon,
  'puzzle-piece': PuzzlePieceIcon,
  'bookmark': BookmarkIcon,
  'beaker': BeakerIcon,
  'calculator': CalculatorIcon,
  'calendar': CalendarIcon,
  'clock': ClockIcon,
  'cloud': CloudIcon,
  'code-bracket': CodeBracketIcon,
  'cog': CogIcon,
  'computer-desktop': ComputerDesktopIcon,
  'device-phone-mobile': DevicePhoneMobileIcon,
  'document': DocumentIcon,
  'envelope': EnvelopeIcon,
  'fire': FireIcon,
  'gift': GiftIcon,
  'globe-alt': GlobeAltIcon,
  'light-bulb': LightBulbIcon,
  'map': MapIcon,
  'microphone': MicrophoneIcon,
  'musical-note': MusicalNoteIcon,
  'paint-brush': PaintBrushIcon,
  'paper-airplane': PaperAirplaneIcon,
  'pencil': PencilIcon,
  'phone': PhoneIcon,
  'photo': PhotoIcon,
  'shopping-bag': ShoppingBagIcon,
  'shopping-cart': ShoppingCartIcon,
  'star': StarIcon,
  'truck': TruckIcon,
  'user': UserIcon,
  'users': UsersIcon,
  'video-camera': VideoCameraIcon,
  'wrench': WrenchIcon
};

/**
 * Componente que renderiza um ícone de categoria
 * @param {string} name - Nome do ícone
 * @param {string} color - Cor do ícone (opcional)
 * @param {string|number} size - Tamanho do ícone (opcional)
 * @param {string} className - Classes adicionais (opcional)
 */
const CategoryIcon = ({ name, color, size = 6, className = '' }) => {
  const IconComponent = iconMap[name] || TagIcon; // Usa TagIcon como fallback
  
  return (
    <div 
      className={`flex items-center justify-center ${className}`} 
      style={{ color: color || 'currentColor' }}
    >
      <IconComponent 
        className={`h-${size} w-${size}`}
        aria-hidden="true" 
      />
    </div>
  );
};

export default CategoryIcon;