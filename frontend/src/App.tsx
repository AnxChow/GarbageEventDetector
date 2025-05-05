import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VideoUpload from './components/VideoUpload';
import Processing from './components/Processing';
import Results from './components/Results';
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VideoUpload />} />
        <Route path="/processing/:fileId" element={<Processing />} />
        <Route path="/results/:fileId" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
