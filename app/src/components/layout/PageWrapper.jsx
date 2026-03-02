import React from 'react';

const PageWrapper = ({
  children,
  className = '',
}) => {
  return (
    <main
      id="main-content"
      className={`min-h-screen bg-white w-full ${className}`}
      style={{ overflowX: 'hidden', width: '100%', position: 'relative' }}
    >
      {children}
    </main>
  );
};

export default PageWrapper;
