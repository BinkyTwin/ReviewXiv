import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Reader from './components/Reader';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentFileId, setCurrentFileId] = useState(null);

  const navigateToReader = (fileId) => {
    setCurrentFileId(fileId);
    setCurrentView('reader');
  };

  const navigateToDashboard = () => {
    setCurrentFileId(null);
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500/30">
      {currentView === 'dashboard' ? (
        <Dashboard onNavigate={navigateToReader} />
      ) : (
        <Reader fileId={currentFileId} onBack={navigateToDashboard} />
      )}
    </div>
  );
}

export default App;
