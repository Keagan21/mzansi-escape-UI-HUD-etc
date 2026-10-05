import { AuthProvider } from './AuthContext.jsx'
import { RoadScene } from './RoadScene.jsx'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <RoadScene />
    </AuthProvider>
  )
}

export default App
