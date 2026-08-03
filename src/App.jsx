import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Spots from './pages/Spots';
import Chat from './pages/Chat';
import Conv from './pages/Conv';
import Mapa from './pages/Mapa';
import Miembros from './pages/Miembros';
import Spot from './pages/Spot';
import Menu from './pages/Menu';
import Timetable from './pages/Timetable';
import { loadSession } from './lib/db';

function Frame({ children }) {
  return <div className="phone-frame">{children}</div>;
}

function Home() {
  return loadSession() ? <Menu /> : <Onboarding />;
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
          <Route path="/menu" element={<Menu />} />
          <Route path="/lineup" element={<Timetable />} />
        </Routes>
      </Frame>
    </BrowserRouter>
  );
}
