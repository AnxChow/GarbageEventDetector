import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  timestamp: string;
  eventType: string;
  location: string;
  driver: string;
  thumbnailUrl: string;
}

const Results = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const { fileId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!fileId) return;

    const fetchResults = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/results/${fileId}`);
        const data = await response.json();
        setEvents(data.events);
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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Video Analysis Results</h2>
        <button
          onClick={handleClear}
          disabled={isClearing}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {isClearing ? 'Clearing...' : 'Clear & Back'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 text-lg py-12">
            No events to report
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={`${import.meta.env.VITE_API_URL}/${event.thumbnailUrl}`}
                alt={`Event at ${event.timestamp}`}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <p className="text-sm text-gray-500">{event.timestamp}</p>
                <h3 className="font-semibold mt-1">{event.eventType}</h3>
                <p className="text-sm text-gray-600 mt-1">Location: {event.location}</p>
                <p className="text-sm text-gray-600">Driver: {event.driver}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Results; 