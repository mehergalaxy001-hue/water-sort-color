import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function CrazyInit() {
  useEffect(() => {

    const init = async () => {
      try {
        await window.CrazyGames.SDK.init();
      } catch (e) {}

      window.CrazyGames.SDK.game.gameStart();
    };

    init();

  }, []);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrazyInit />
  </StrictMode>,
);
