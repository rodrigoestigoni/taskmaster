import React, { useState, useEffect } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';
import CategoryIcon from './CategoryIcon';

/**
 * Componente de seleção de categoria com ícones
 * @param {Array} categories - Lista de categorias
 * @param {Object} selectedCategory - Categoria selecionada
 * @param {Function} onChange - Função ao alterar seleção
 */
const CategorySelector = ({ categories, selectedCategory, onChange }) => {
  const [selected, setSelected] = useState(null);
  
  // Inicializa a categoria selecionada
  useEffect(() => {
    if (categories && categories.length > 0) {
      // Se já existe uma categoria selecionada, encontre-a na lista
      if (selectedCategory) {
        const found = categories.find(category => 
          category.id === selectedCategory || category.id === parseInt(selectedCategory, 10)
        );
        
        if (found) {
          setSelected(found);
        } else {
          // Se não encontrar, selecione a primeira
          setSelected(categories[0]);
        }
      } else {
        // Se nenhuma categoria foi selecionada, escolha a primeira
        setSelected(categories[0]);
      }
    }
  }, [categories, selectedCategory]);
  
  // Manipula a mudança de seleção
  const handleChange = (value) => {
    setSelected(value);
    if (onChange) {
      onChange(value.id);
    }
  };
  
  if (!selected || !categories || categories.length === 0) {
    return <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-md"></div>;
  }
  
  return (
    <Listbox value={selected} onChange={handleChange}>
      <div className="relative mt-1">
        <Listbox.Button className="relative w-full cursor-default rounded-md bg-white dark:bg-gray-900 py-2 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
          <div className="flex items-center">
            <span 
              className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
              style={{ backgroundColor: `${selected.color}20` }}
            >
              <CategoryIcon 
                name={selected.icon} 
                color={selected.color} 
                size={4} 
              />
            </span>
            <span className="block truncate">{selected.name}</span>
          </div>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={React.Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {categories.map((category) => (
              <Listbox.Option
                key={category.id}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'
                  }`
                }
                value={category}
              >
                {({ selected, active }) => (
                  <>
                    <div className="flex items-center">
                      <span 
                        className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <CategoryIcon 
                          name={category.icon} 
                          color={category.color} 
                          size={4} 
                        />
                      </span>
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {category.name}
                      </span>
                    </div>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? 'text-primary-600 dark:text-primary-300' : 'text-primary-500 dark:text-primary-400'
                        }`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

export default CategorySelector;