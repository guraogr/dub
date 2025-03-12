import React from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="bg-[#fafafa] min-h-screen flex justify-center">
      <div className="w-full max-w-md h-screen bg-white relative overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;