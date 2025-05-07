import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const Processing = () => {
  const [status, setStatus] = useState<string>('Processing video...');
  const { fileId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!fileId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/status/${fileId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          navigate(`/results/${fileId}`);
        } else if (data.status === 'failed') {
          navigate('/');
        } else {
          setStatus(data.message || 'Processing video...');
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Error checking status:', error);
        navigate('/');
      }
    };

    checkStatus();
  }, [fileId, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8 mb-24">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold mb-4">Processing Video</h2>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
};

export default Processing; 