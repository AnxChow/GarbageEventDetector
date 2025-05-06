import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VideoUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
    }
  };

  const handleDelete = () => {
    setSelectedFile(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('video', selectedFile);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        navigate(`/processing/${data.fileId}`);
      } else {
        console.error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-2xl">
        <div
          className={`p-8 rounded-lg border-2 border-dashed ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Garbage Collection Event Detector</h1>
            <h2 className="text-2xl font-bold mb-4">Upload Your Video</h2>
            {!selectedFile ? (
              <>
                <p className="text-gray-600 mb-4">
                  Drag and drop your video file here, or click to select
                </p>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  id="fileInput"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="fileInput"
                  className="cursor-pointer inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Select Video
                </label>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm flex justify-center">
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span className="text-gray-700">{selectedFile.name}</span>
                    <button
                      onClick={handleDelete}
                      className="p-1 ml-2 rounded-full hover:bg-red-100 transition-colors"
                      title="Remove video"
                      aria-label="Delete video"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg width="22" height="22" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAnalyze}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Analyze Video
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUpload; 