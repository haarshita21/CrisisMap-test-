import React, { useState } from 'react';
import axios from 'axios';
import { AlertOctagon, CheckCircle, MapPin, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReportPage() {

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [reportText, setReportText] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {

    if (!reportText.trim()) {
      alert('Please describe emergency.');
      return;
    }

    setStatus('loading');

    try {

      let locationText = '';

      // Get user location
      if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition((pos) => {

          locationText = ` User coordinates latitude ${pos.coords.latitude} longitude ${pos.coords.longitude}.`;

        });
      }

      const finalText = reportText + locationText;

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/submit`,
        {
          text: finalText
        }
      );

      setMessage(response.data?.incident?.summary || 'Incident submitted.');

      setStatus('success');

      setTimeout(() => {
        setStatus('idle');
        setReportText('');
      }, 7000);

    } catch (error) {

      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div
      className="container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '2rem'
      }}
    >

      {/* Back Button */}
      <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
        <Link
          to="/map"
          style={{
            padding: '0.6rem 1rem',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          ← Back to Map
        </Link>
      </div>

      <div
        style={{
          textAlign: 'center',
          maxWidth: '700px',
          width: '100%'
        }}
      >

        <h1
          style={{
            fontSize: '3rem',
            color: '#e94560',
            marginBottom: '1rem',
            textShadow: '0 0 20px rgba(233,69,96,0.5)'
          }}
        >
          EMERGENCY REPORT
        </h1>

        <p
          style={{
            color: '#a0a5ba',
            fontSize: '1.1rem',
            marginBottom: '2rem'
          }}
        >
          Describe the emergency. AI will automatically detect location,
          crisis type, severity, and required emergency response.
        </p>

        {/* Input */}
        {status === 'idle' && (
          <>
            <div
              style={{
                background: 'rgba(15,15,25,0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 0 40px rgba(0,0,0,0.4)'
              }}
            >

              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Example: Fire near Whitefield bus stand. Heavy smoke. Around 15 people trapped."
                rows={6}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '1rem',
                  color: 'white',
                  fontSize: '1rem',
                  resize: 'none'
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '1rem',
                  color: '#8b92a5',
                  fontSize: '0.9rem'
                }}
              >
                <span>
                  <MapPin size={14} style={{ marginRight: '5px' }} />
                  AI will estimate location
                </span>

                <span>{reportText.length} chars</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              style={{
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #ff2a2a, #cc0000)',
                border: '10px solid #7a0000',
                cursor: 'pointer',
                boxShadow:
                  '0 0 60px rgba(255,0,0,0.5), inset 0 15px 20px rgba(255,255,255,0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                transition: '0.2s'
              }}
            >
              <AlertOctagon size={70} color="white" />

              <strong
                style={{
                  color: 'white',
                  marginTop: '1rem',
                  fontSize: '1.2rem',
                  letterSpacing: '2px'
                }}
              >
                SEND REPORT
              </strong>
            </button>
          </>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div
            style={{
              color: '#f39c12',
              fontSize: '1.4rem',
              padding: '3rem'
            }}
          >
            <Send
              size={48}
              style={{
                marginBottom: '1rem',
                animation: 'pulse 1s infinite'
              }}
            />

            <div>AI analyzing emergency...</div>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div
            style={{
              color: '#00ffcc',
              padding: '2rem',
              background: 'rgba(0,255,204,0.08)',
              borderRadius: '14px',
              border: '1px solid rgba(0,255,204,0.25)'
            }}
          >
            <CheckCircle
              size={54}
              style={{ margin: '0 auto 1rem auto' }}
            />

            <h2 style={{ color: '#00ffcc' }}>
              Emergency Logged
            </h2>

            <p
              style={{
                color: '#b7fff2',
                marginTop: '1rem',
                lineHeight: '1.7'
              }}
            >
              {message}
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div
            style={{
              color: '#e94560',
              padding: '2rem',
              background: 'rgba(233,69,96,0.08)',
              borderRadius: '14px',
              border: '1px solid rgba(233,69,96,0.25)'
            }}
          >
            <h2>Transmission Failed</h2>
            <p>Could not connect to AI server.</p>
          </div>
        )}
      </div>
    </div>
  );
}