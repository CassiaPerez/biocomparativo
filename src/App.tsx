import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Comparativo from './pages/Comparativo';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Comparativo />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}
