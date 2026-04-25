import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../firebase';
import type { Incident } from '../types';

import {
  Shield,
  BrainCircuit,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin
} from 'lucide-react';

export default function AdminPage() {

  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'queue' | 'active' | 'briefing'
  >('queue');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [briefing, setBriefing] = useState('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  // ======================
  // FIREBASE LIVE LISTENER
  // ======================
  useEffect(() => {

    if (!isAuthenticated) return;

    const incidentsRef = ref(db, 'incidents');

    console.log('ADMIN LISTENER STARTED');

    const unsubscribe = onValue(
      incidentsRef,
      (snapshot) => {

        const data = snapshot.val();

        console.log('RAW FIREBASE DATA:', data);

        if (!data) {
          setIncidents([]);
          return;
        }

        const parsed: Incident[] = Object.entries(data).map(
          ([key, value]: any) => {

            const incident = value || {};

            return {
              id: key,
              approved: incident.approved === true,
              timestamp: incident.timestamp || Date.now(),
              location_name:
                incident.location_name || 'Unknown Location',
              crisis_type:
                incident.crisis_type || 'Unknown',
              summary:
                incident.summary || 'No summary',
              priority:
                incident.priority || 'P3',
              status:
                incident.status || 'active',
              report_count:
                incident.report_count || 1,
              needs:
                incident.needs || [],
              raw_text:
                incident.raw_text || '',
              ...incident
            };
          }
        );

        parsed.sort(
          (a, b) =>
            (b.timestamp || 0) - (a.timestamp || 0)
        );

        console.log('PARSED INCIDENTS:', parsed);

        setIncidents(parsed);
      },
      (error) => {
        console.error('FIREBASE ERROR:', error);
      }
    );

    return () => {
      unsubscribe();
    };

  }, [isAuthenticated]);

  // ======================
  // LOGIN
  // ======================
  const handleLogin = (e: React.FormEvent) => {

    e.preventDefault();

    if (password === 'crisismap2024') {

      setIsAuthenticated(true);

    } else {

      alert('Invalid password');
    }
  };

  // ======================
  // APPROVE
  // ======================
  const handleApprove = async (id: string) => {

    try {

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/approve/${id}`
      );

      alert('Incident Approved');

    } catch (err) {

      console.error(err);
      alert('Approval failed');
    }
  };

  // ======================
  // REJECT
  // ======================
  const handleReject = async (id: string) => {

    try {

      await remove(ref(db, `incidents/${id}`));

      alert('Incident Removed');

    } catch (err) {

      console.error(err);
    }
  };

  // ======================
  // UPDATE STATUS
  // ======================
  const handleUpdateStatus = async (
    id: string,
    status: string
  ) => {

    try {

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/update-status/${id}`,
        { status }
      );

    } catch (err) {

      console.error(err);
    }
  };

  // ======================
  // UPDATE PRIORITY
  // ======================
  const handleUpdatePriority = async (
    id: string,
    priority: string
  ) => {

    try {

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/update-priority/${id}`,
        { priority }
      );

    } catch (err) {

      console.error(err);
    }
  };

  // ======================
  // BRIEFING
  // ======================
  const generateBriefing = async () => {

    setLoadingBriefing(true);

    try {

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/briefing`
      );

      setBriefing(res.data.briefing);

    } catch {

      setBriefing('Unable to generate briefing.');
    }

    setLoadingBriefing(false);
  };

  // ======================
  // FILTERS
  // ======================
  const queue = incidents.filter(
    (i) => i.approved !== true
  );

  const active = incidents.filter(
    (i) =>
      i.approved === true &&
      i.status !== 'resolved'
  );

  // ======================
  // LOGIN PAGE
  // ======================
  if (!isAuthenticated) {

    return (
      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <div
          className="card"
          style={{
            width: '420px',
            textAlign: 'center'
          }}
        >

          <Shield
            size={52}
            color="#e94560"
            style={{ marginBottom: '1rem' }}
          />

          <h2>Admin Control Center</h2>

          <form onSubmit={handleLogin}>

            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <button
              className="btn-primary"
              style={{ width: '100%' }}
            >
              Access Dashboard
            </button>

          </form>

        </div>
      </div>
    );
  }

  // ======================
  // MAIN UI
  // ======================
  return (
    <div className="container">

      <div
        style={{
          color: '#00ffcc',
          marginBottom: '1rem'
        }}
      >
        Total Incidents: {incidents.length}
      </div>

      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >

        <div>

          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Activity color="#e94560" />
            AI CONTROL CENTER
          </h2>

          <p style={{ color: '#8b92a5' }}>
            Incident Intelligence + Moderation
          </p>

        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>

          <div className="card">
            <strong>{queue.length}</strong>
            <div style={{ color: '#8b92a5' }}>
              Queue
            </div>
          </div>

          <div className="card">
            <strong>{active.length}</strong>
            <div style={{ color: '#8b92a5' }}>
              Active
            </div>
          </div>

        </div>

      </div>

      {/* TABS */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >

        {['queue', 'active', 'briefing'].map(tab => (

          <button
            key={tab}
            onClick={() =>
              setActiveTab(tab as any)
            }
            style={{
              background:
                activeTab === tab
                  ? '#e94560'
                  : 'rgba(255,255,255,0.05)',
              color: 'white'
            }}
          >
            {tab.toUpperCase()}
          </button>

        ))}

      </div>

      {/* QUEUE */}
      {activeTab === 'queue' && (

        <div>

          {queue.length === 0 ? (

            <div className="card">

              <AlertTriangle color="#f39c12" />

              <p>No incidents awaiting approval.</p>

            </div>

          ) : (

            queue.map(i => (

              <div
                key={i.id}
                className="card"
                style={{
                  marginBottom: '1.5rem',
                  borderLeft: `5px solid ${
                    i.priority === 'P1'
                      ? '#e94560'
                      : i.priority === 'P2'
                      ? '#f39c12'
                      : '#00ffcc'
                  }`
                }}
              >

                <h3>{i.location_name}</h3>

                <p>{i.summary}</p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginTop: '1rem',
                    color: '#a0a5ba'
                  }}
                >

                  <span>
                    <MapPin size={14} /> {i.crisis_type}
                  </span>

                  <span>
                    <Clock size={14} />
                    {' '}
                    {new Date(i.timestamp).toLocaleString()}
                  </span>

                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    marginTop: '1.5rem'
                  }}
                >

                  <button
                    onClick={() =>
                      handleApprove(i.id)
                    }
                    style={{
                      background: '#2ecc71',
                      color: 'white'
                    }}
                  >
                    Approve
                  </button>

                  <button
                    onClick={() =>
                      handleReject(i.id)
                    }
                    style={{
                      background: '#e74c3c',
                      color: 'white'
                    }}
                  >
                    Reject
                  </button>

                </div>

              </div>

            ))

          )}

        </div>

      )}

      {/* ACTIVE */}
      {activeTab === 'active' && (

        <div>

          {active.length === 0 ? (

            <div className="card">

              <CheckCircle2 color="#00ffcc" />

              <p>No active incidents.</p>

            </div>

          ) : (

            active.map(i => (

              <div
                key={i.id}
                className="card"
                style={{ marginBottom: '1.5rem' }}
              >

                <h3>{i.location_name}</h3>

                <p>{i.summary}</p>

                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}
                >

                  <select
                    value={i.priority}
                    onChange={(e) =>
                      handleUpdatePriority(
                        i.id,
                        e.target.value
                      )
                    }
                  >
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>

                  <select
                    value={i.status}
                    onChange={(e) =>
                      handleUpdateStatus(
                        i.id,
                        e.target.value
                      )
                    }
                  >
                    <option value="active">
                      Active
                    </option>
                    <option value="responding">
                      Responding
                    </option>
                    <option value="resolved">
                      Resolved
                    </option>
                  </select>

                </div>

              </div>

            ))

          )}

        </div>

      )}

      {/* BRIEFING */}
      {activeTab === 'briefing' && (

        <div className="card">

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >

            <BrainCircuit color="#00ffcc" />

            <h3>AI Briefing</h3>

          </div>

          <button
            className="btn-primary"
            onClick={generateBriefing}
            disabled={loadingBriefing}
          >
            {loadingBriefing
              ? 'Generating...'
              : 'Generate Briefing'}
          </button>

          {briefing && (

            <div
              style={{
                marginTop: '1.5rem',
                background:
                  'rgba(255,255,255,0.03)',
                padding: '1.5rem',
                borderRadius: '12px',
                lineHeight: '1.8'
              }}
            >
              {briefing}
            </div>

          )}

        </div>

      )}

    </div>
  );
}