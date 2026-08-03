import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Spots from './pages/Spots';
import Chat from './pages/Chat';
import Conv from './pages/Conv';
import Mapa from './pages/Mapa';
import Miembros from './pages/Miembros';
import Spot from './pages/Spot';
import { loadSession } from './lib/db';

function Frame({ children }) {
  return <div className="phone-frame">{children}</div>;
}

function Home() {
  return loadSession() ? <Spots /> : <Onboarding />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Frame>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/spots" element={<Spots />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/conv" element={<Conv />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/miembros" element={<Miembros />} />
          <Route path="/spot/:id" element={<Spot />} />
        </Routes>
      </Frame>
    </BrowserRouter>
  );
}
