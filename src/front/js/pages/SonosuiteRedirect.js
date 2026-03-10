import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const SonosuiteRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const doRedirect = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const snsReturnTo = searchParams.get('sns_return_to') || '/albums';

      if (!token) {
        navigate('/login?next=/sonosuite-redirect');
        return;
      }

      try {
        const response = await fetch(
          `${backendUrl}/api/sonosuite/redirect?return_to=${encodeURIComponent(snsReturnTo)}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();
        if (response.ok && data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          window.location.href = 'https://streampirex.sonosuite.com/sonosuite-login';
        }
      } catch (err) {
        window.location.href = 'https://streampirex.sonosuite.com/sonosuite-login';
      }
    };

    doRedirect();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: '#0d1117',
      color: '#00ffc8'
    }}>
      <h2>🎵 Connecting to SonoSuite...</h2>
      <p style={{ color: '#8b949e' }}>You'll be redirected automatically.</p>
    </div>
  );
};

export default SonosuiteRedirect;
