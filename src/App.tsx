import './App.css';
import { Routes, Route, Link } from 'react-router-dom';
import Canvas from './components/Canvas';
import PathAnimation from './components/PathAnimation';

function App() {
    return (
        <div className="app-container">
            <h1>React Canvas Demo</h1>
            <nav>
                <Link to="/">Canvas</Link> | <Link to="/animation">Path Animation</Link>
            </nav>
            <Routes>
                <Route path="/" element={<Canvas />} />
                <Route path="/animation" element={<PathAnimation />} />
            </Routes>
        </div>
    );
}

export default App
