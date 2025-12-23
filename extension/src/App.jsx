import { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    // 1. Get the current tab's URL
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const urlObj = new URL(tabs[0].url);
        const origin = urlObj.origin; // e.g. https://google.com
        setCurrentUrl(origin);
        fetchHistory(origin);
      });
    } else {
      // Fallback for local testing (outside Chrome extension environment)
      const dummy = "https://www.google.com";
      setCurrentUrl(dummy);
      fetchHistory(dummy);
    }
  }, []);

  const fetchHistory = async (url) => {
    try {
      const res = await axios.get(`https://core-pulse-production.up.railway.app/api/history?url=${url}`);
      setHistory(res.data);
    } catch (err) {
      console.error("Fetch error", err);
    }
  };

  const handleTrack = async () => {
    setLoading(true);
    setStatus('Sending to worker...');
    try {
      await axios.post('https://core-pulse-production.up.railway.app/api/track', { url: currentUrl });
      setStatus('✅ Tracking started! Run the worker to see results.');
      // Refresh after a delay
      setTimeout(() => fetchHistory(currentUrl), 2000);
    } catch (err) {
      setStatus('❌ Error connecting to API.');
    }
    setLoading(false);
  };

  // Chart Configuration
  const chartData = {
    labels: history.map(h => new Date(h.recorded_at).toLocaleDateString()),
    datasets: [
      {
        label: 'Performance Score',
        data: history.map(h => h.performance_score),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.5)',
        tension: 0.1
      }
    ]
  };

  return (
    <div style={{ width: '350px', padding: '15px', fontFamily: 'Segoe UI, sans-serif' }}>
      <h2 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>❤️ CorePulse</h2>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '15px' }}>
        Target: <strong>{currentUrl}</strong>
      </div>
      
      <div style={{ marginBottom: '15px', minHeight: '150px' }}>
        {history.length > 0 ? (
          <Line data={chartData} options={{ maintainAspectRatio: false }} height={200} />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', background: '#f1f5f9', borderRadius: '8px', fontSize: '13px' }}>
            No audit history found for this domain yet.
          </div>
        )}
      </div>

      <button 
        onClick={handleTrack} 
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px',
          background: loading ? '#94a3b8' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Processing...' : '📈 Track / Update This Site'}
      </button>
      
      {status && <p style={{ fontSize: '12px', marginTop: '10px', textAlign: 'center', color: '#10b981' }}>{status}</p>}
    </div>
  );
}

export default App;