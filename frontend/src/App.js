import React, { useEffect, useState } from 'react';
import './App.css';
import SignDisplay from './components/SignDisplay';
import AdminPanel from './components/AdminPanel';
import LoadScreen from './components/LoadScreen';
import ErrorWindow from './components/Error';

function App() {

    // const [data, setData] = useState(null);

    // useEffect(() => {
    //   fetch('http://localhost:5000/api')  // Отправляем запрос на бэкенд
    //     .then((response) => response.json())
    //     .then((data) => setData(data.message));
    // }, []);
  

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