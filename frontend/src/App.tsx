import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VideoUpload from './components/VideoUpload';
import Processing from './components/Processing';
import Results from './components/Results';
import Footer from './components/Footer';
import './App.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<VideoUpload />} />
            <Route path="/processing/:fileId" element={<Processing />} />
            <Route path="/results/:fileId" element={<Results />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
