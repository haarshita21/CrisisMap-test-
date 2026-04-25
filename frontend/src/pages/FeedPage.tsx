import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import type { Incident } from '../types';

import {
  MapPin,
  AlertCircle,
  Users,
  Activity,
  ShieldAlert,
  Clock3,
  BrainCircuit
} from 'lucide-react';

export default function FeedPage() {

  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {

    const incidentsRef = ref(db, 'incidents');

    const unsubscribe = onValue(incidentsRef, (snapshot) => {

      const data = snapshot.val();

      if (data) {

        const parsed = Object.keys(data)
          .map(key => ({
            id: key,
            ...data[key]
          }))
          .filter(i => i.approved && i.status !== 'resolved');

        parsed.sort((a, b) => {

          const priorityRank = {
            P1: 1,
            P2: 2,
            P3: 3
          };

          const pa = priorityRank[a.priority as keyof typeof priorityRank];
          const pb = priorityRank[b.priority as keyof typeof priorityRank];

          if (pa !== pb) return pa - pb;

          return b.timestamp - a.timestamp;
        });

        setIncidents(parsed);

      } else {
        setIncidents([]);
      }

    });

    return () => unsubscribe();

  }, []);

  const getPriorityColor = (priority: string) => {

    if (priority === 'P1') return '#e94560';
    if (priority === 'P2') return '#f39c12';

    return '#00ffcc';
  };

  const getRelativeTime = (timestamp: number) => {

    const diff = Date.now() - timestamp;

    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;

    const hrs = Math.floor(mins / 60);

    return `${hrs} hr ago`;
  };

  return (
    <div
      className="container"
      style={{
        minHeight: '100vh',
        paddingTop: '3rem'
      }}
    >

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '3rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >

        <div>
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.7rem',
              marginBottom: '0.5rem'
            }}
          >
            <Activity color="#e94560" />
            LIVE INTELLIGENCE FEED
          </h2>

          <p
            style={{
              color: '#8b92a5',
              margin: 0
            }}
          >
            Real-time AI crisis monitoring network
          </p>
        </div>

        <div
          style={{
            background: 'rgba(233,69,96,0.08)',
            border: '1px solid rgba(233,69,96,0.2)',
            padding: '0.8rem 1.2rem',
            borderRadius: '12px'
          }}
        >
          <span style={{ color: '#e94560', fontWeight: 700 }}>
            {incidents.length}
          </span>

          <span style={{ color: '#a0a5ba', marginLeft: '8px' }}>
            Active Incidents
          </span>
        </div>
      </div>

      {/* Empty */}
      {incidents.length === 0 ? (

        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '4rem'
          }}
        >
          <ShieldAlert
            size={60}
            color="#555"
            style={{ marginBottom: '1rem' }}
          />

          <h3>No Active Signals</h3>

          <p style={{ color: '#8b92a5' }}>
            Intelligence network currently stable.
          </p>
        </div>

      ) : (

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >

          {incidents.map((incident) => (

            <div
              key={incident.id}
              className="card"
              style={{
                borderLeft: `5px solid ${getPriorityColor(incident.priority)}`,
                position: 'relative',
                overflow: 'hidden'
              }}
            >

              {/* Pulse */}
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: getPriorityColor(incident.priority),
                  boxShadow: `0 0 12px ${getPriorityColor(incident.priority)}`,
                  animation: 'pulse 1.5s infinite'
                }}
              />

              {/* Top */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}
              >

                <div>

                  <h3
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.8rem'
                    }}
                  >
                    <MapPin size={18} />
                    {incident.location_name}
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      gap: '0.6rem',
                      flexWrap: 'wrap'
                    }}
                  >

                    <span className={`badge badge-${incident.priority.toLowerCase()}`}>
                      {incident.priority}
                    </span>

                    <span
                      className="badge"
                      style={{
                        background: '#2c3e50'
                      }}
                    >
                      {incident.crisis_type}
                    </span>

                    <span
                      className="badge"
                      style={{
                        background:
                          incident.status === 'active'
                            ? '#e74c3c'
                            : '#3498db'
                      }}
                    >
                      {incident.status}
                    </span>

                  </div>
                </div>

                <div
                  style={{
                    textAlign: 'right',
                    color: '#8b92a5',
                    fontSize: '0.9rem'
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.4rem'
                    }}
                  >
                    <Users size={14} />
                    Reports: {incident.report_count || 1}
                  </div>

                  <div
                    style={{
                      marginTop: '6px'
                    }}
                  >
                    {new Date(incident.timestamp).toLocaleString()}
                  </div>

                </div>
              </div>

              {/* Summary */}
              <div
                style={{
                  marginBottom: '1rem'
                }}
              >

                <p
                  style={{
                    fontSize: '1.05rem',
                    lineHeight: '1.7',
                    color: '#d7dbe4'
                  }}
                >
                  {incident.summary}
                </p>

              </div>

              {/* Intelligence Row */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}
              >

                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <BrainCircuit size={16} color="#00ffcc" />

                  <span style={{ color: '#00ffcc' }}>
                    AI Confidence:
                  </span>

                  <strong>
                    {incident.ai_confidence || 90}%
                  </strong>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Clock3 size={16} color="#f39c12" />

                  <span style={{ color: '#f39c12' }}>
                    Age:
                  </span>

                  <strong>
                    {getRelativeTime(incident.timestamp)}
                  </strong>
                </div>

              </div>

              {/* Needs */}
              {incident.needs && incident.needs.length > 0 && (

                <div>

                  <h4
                    style={{
                      marginBottom: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#a0a5ba'
                    }}
                  >
                    <AlertCircle size={15} />
                    Immediate Needs
                  </h4>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.7rem'
                    }}
                  >

                    {incident.needs.map((need, idx) => (

                      <span
                        key={idx}
                        style={{
                          background: 'rgba(0,255,204,0.08)',
                          border: '1px solid rgba(0,255,204,0.15)',
                          padding: '0.45rem 0.8rem',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          color: '#00ffcc',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}
                      >
                        {need.replace('_', ' ')}
                      </span>

                    ))}

                  </div>

                </div>

              )}

            </div>

          ))}

        </div>

      )}
    </div>
  );
}