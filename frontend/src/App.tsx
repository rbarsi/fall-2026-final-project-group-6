import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import ListingForm from './Components/listingForm';
import Listings from '../src/listings';
import { Home } from './Home';


export function App() {
  const [status, setStatus] = useState("Not checked");
  const location = useLocation();

  const getLinkStyle = (path: string) => ({
    textDecoration: 'none',
    fontWeight: location.pathname == path ? 'bold' : 'normal',
    color: location.pathname == path ? '#0a4b32' : '#555',
  });

  async function checkConnection() {
    setStatus("Checking...");
    try {
      const response = await fetch("http://localhost:3000/api/health/database");
      if (!response.ok) throw new Error("Connection failed");
      setStatus("Backend and database connected");
    } catch {
      setStatus("Unable to connect. Check that the backend and database are running.");
    }
    
  }

  return (
    <main>
      <h1>Campus Lost and Found</h1>
      <p>Development setup..</p>
      <button onClick={() => void checkConnection()}>Check connection</button>
      <p role="status">{status}</p>

      <hr style={{ margin: '20px 0' }} />

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eaeaea', paddingBottom: '15px' }}>
            <h2>Campus Lost and Found</h2>
            <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <Link to="/" style={getLinkStyle('/')}>Browse</Link>
                <Link to="/my-listings" style={getLinkStyle('/my-listings')}>My Listings</Link>
                <Link to="/create"style={{ background: '#0a4b32', color: '#fff', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none' }}>+ Post an Item!</Link>
            </nav>
        </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<ListingForm />} />
        <Route path="/my-listings" element={<div><h3>My Listings</h3><p>Manage items you've posted.</p></div>} />
      </Routes>
    </main>
  );
}
export default App;