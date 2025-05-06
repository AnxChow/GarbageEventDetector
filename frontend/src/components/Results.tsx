import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  timestamp: string;
  eventType: string;
  location: string;
  driver: string;
  thumbnailUrl: string;
  humanFeedback?: string;
}

interface Frame {
  id: string;
  timestamp: string;
  thumbnailUrl: string;
  eventType?: string;
  reason?: string;
  location?: string;
  humanFeedback?: string;
}

const Results = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [modalFrame, setModalFrame] = useState<Frame | null>(null);
  const [eventModal, setEventModal] = useState<Event | null>(null);
  const { fileId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!fileId) return;

    const fetchResults = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/results/${fileId}`);
        const data = await response.json();
        console.log('Backend response:', data); // Debug log
        setEvents(data.events);
        setFrames(data.frames || []);
      } catch (error) {
        console.error('Error fetching results:', error);
      }
    };

    fetchResults();
  }, [fileId]);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/clear`, {
        method: 'POST',
      });
      navigate('/');
    } catch (error) {
      console.error('Error clearing uploads:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Feedback handler
  const handleFeedback = async (frame: Frame, feedback: string) => {
    if (!fileId) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/feedback/${fileId}/${frame.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ humanFeedback: feedback }),
      });
      // Update frame in state
      setFrames((prev) =>
        prev.map((f) =>
          f.id === frame.id ? { ...f, humanFeedback: feedback } : f
        )
      );
      setModalFrame(null);
    } catch (err) {
      alert('Failed to save feedback');
    }
  };

  // Event feedback handler
  const handleEventFeedback = async (event: Event, feedback: string) => {
    if (!fileId) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/event-feedback/${fileId}/${event.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ humanFeedback: feedback }),
      });
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id ? { ...e, humanFeedback: feedback } : e
        )
      );
      setEventModal(null);
    } catch (err) {
      alert('Failed to save event feedback');
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Sidebar with frame thumbnails */}
      <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 256, background: '#f3f4f6', boxShadow: '0 0 10px #e5e7eb', overflowY: 'auto', zIndex: 10 }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ fontWeight: 600, color: '#374151' }}>All Frames</h3>
        </div>
        <div style={{ padding: 8 }}>
          {frames.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 14, padding: '16px 0' }}>
              No frames available
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {frames.map((frame) => (
                <div
                  key={frame.id}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: selectedFrame === frame.id ? '2px solid #3b82f6' : '2px solid transparent',
                    position: 'relative',
                  }}
                  onClick={() => { setSelectedFrame(frame.id); setModalFrame(frame); }}
                >
                  <img
                    src={`${import.meta.env.VITE_API_URL}/${frame.thumbnailUrl}`}
                    alt={`Frame at ${frame.timestamp}`}
                    style={{ width: '100%', height: 128, objectFit: 'cover' }}
                  />
                  {/* Exclaim icon chip if humanFeedback exists */}
                  {frame.humanFeedback && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: '#fbbf24',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 16,
                        boxShadow: '0 1px 4px #e5e7eb',
                        cursor: 'pointer',
                      }}
                      title={`human feedback: ${frame.humanFeedback}`}
                    >
                      !
                    </div>
                  )}
                  <div style={{ padding: 8, background: '#f9fafb' }}>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>{frame.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Modal for frame details */}
      {modalFrame && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
            padding: 32,
            minWidth: 320,
            maxWidth: 400,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <button
              onClick={() => setModalFrame(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'transparent',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                color: '#888',
              }}
              aria-label="Close"
            >
              ×
            </button>
            {/* Large thumbnail */}
            <img
              src={`${import.meta.env.VITE_API_URL}/${modalFrame.thumbnailUrl}`}
              alt={`Frame at ${modalFrame.timestamp}`}
              style={{ width: 280, height: 180, objectFit: 'cover', borderRadius: 8, marginBottom: 24 }}
            />
            {/* Feedback buttons */}
            <div style={{ width: '100%', marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>Mark Event:</div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button
                  onClick={() => handleFeedback(modalFrame, 'inaccessible')}
                  style={{
                    padding: '10px 18px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                >
                  Inaccessible
                </button>
                <button
                  onClick={() => handleFeedback(modalFrame, 'overflowing')}
                  style={{
                    padding: '10px 18px',
                    background: '#f87171',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                >
                  Overflowing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main style={{ marginLeft: 256, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 32, minHeight: '100vh' }}>
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700 }}>Video Analysis Results</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <button
              onClick={handleClear}
              disabled={isClearing}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                borderRadius: 8,
                transition: 'background 0.2s',
                opacity: isClearing ? 0.5 : 1,
                border: 'none',
                cursor: isClearing ? 'not-allowed' : 'pointer',
              }}
            >
              {isClearing ? 'Clearing...' : 'Clear & Back'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {events.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#6b7280', fontSize: 18, padding: '48px 0' }}>
                No events to report
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 4px #e5e7eb', overflow: 'hidden', position: 'relative' }}>
                  {/* Flag icon for feedback */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 2,
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.85)',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 4px #e5e7eb',
                    }}
                    title="Flag incorrect event"
                    onClick={() => setEventModal(event)}
                  >
                    <span role="img" aria-label="flag" style={{ color: '#f59e42', fontSize: 18 }}>🚩</span>
                  </div>
                  {/* Exclaim icon if humanFeedback exists */}
                  {event.humanFeedback && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: '#fbbf24',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 16,
                        boxShadow: '0 1px 4px #e5e7eb',
                        cursor: 'pointer',
                      }}
                      title={`human feedback: ${event.humanFeedback}`}
                    >
                      !
                    </div>
                  )}
                  <img
                    src={`${import.meta.env.VITE_API_URL}/${event.thumbnailUrl}`}
                    alt={`Event at ${event.timestamp}`}
                    style={{ width: '100%', height: 192, objectFit: 'cover' }}
                  />
                  <div style={{ padding: 16 }}>
                    <p style={{ fontSize: 14, color: '#6b7280' }}>{event.timestamp}</p>
                    <h3 style={{ fontWeight: 600, marginTop: 4 }}>{event.eventType}</h3>
                    <p style={{ fontSize: 14, color: '#4b5563', marginTop: 4 }}>Location: {event.location}</p>
                    <p style={{ fontSize: 14, color: '#4b5563' }}>Driver: {event.driver}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modal for event feedback */}
      {eventModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
            padding: 32,
            minWidth: 320,
            maxWidth: 400,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <button
              onClick={() => setEventModal(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'transparent',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                color: '#888',
              }}
              aria-label="Close"
            >
              ×
            </button>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Flag incorrect event?</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <button
                onClick={() => handleEventFeedback(eventModal, 'wrong event type')}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                Wrong event type
              </button>
              <button
                onClick={() => handleEventFeedback(eventModal, 'no event')}
                style={{
                  padding: '10px 18px',
                  background: '#f87171',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                No event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results; 