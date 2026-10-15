import { useState } from "react";
export function App() {
  const [status, setStatus] = useState("Not checked");
  async function checkConnection() {
    setStatus("Checking...");
    try {
      const response = await fetch("/api/health/database");
      if (!response.ok) throw new Error("Connection failed");
      setStatus("Backend and database connected");
    } catch {
      setStatus("Unable to connect. Check that the backend and database are running.");
    }
  }
  return <main><h1>Campus Lost and Found</h1><p>Development setup</p>
    <button onClick={() => void checkConnection()}>Check connection</button>
    <p role="status">{status}</p></main>;
}
