import { Outlet } from 'react-router-dom';

import Footer from './Footer';
import Navbar from './Navbar';

const AppShell = () => (
  <div className="app-shell">
    <Navbar />
    <main className="app-shell__main">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default AppShell;

