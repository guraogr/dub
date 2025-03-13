import React from 'react';

interface TabOption {
  id: string;
  label: string;
}

interface TabsProps {
  options: TabOption[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

/**
 * 再利用可能なタブコンポーネント
 * リファクタリングポイント: UIコンポーネントを小さく分割して再利用性を高める
 */
const Tabs: React.FC<TabsProps> = ({ options, activeTab, onChange }) => {
  return (
    <div className="flex mb-4 overflow-hidden border-2 border-gray-100 rounded-lg bg-gray-100">
      {options.map((option) => (
        <button
          key={option.id}
          className={`flex-1 py-3 text-center focus:outline-none ${
            activeTab === option.id
              ? 'bg-white text-black font-medium'
              : 'bg-gray-100 text-gray-500'
          }`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
