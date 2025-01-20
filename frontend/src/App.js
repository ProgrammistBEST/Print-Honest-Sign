import './App.css';
import SignDisplay from './components/SignDisplay';
import AdminPanel from './components/AdminPanel';
import LoadScreen from './components/LoadScreen';
import ErrorWindow from './components/Error';

function App() {
    return (
        <div className="App">
            <header className="App-header">
                {/* <h1>Приложение Честного Знака</h1> */}
                <SignDisplay />
                <LoadScreen />
            </header>
                {/* <h1>{data ? data : 'Loading...'}</h1> */}
                <AdminPanel />
                <ErrorWindow />
                
        </div>
    );
}

export default App;