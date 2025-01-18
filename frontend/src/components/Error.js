import React, { useState } from 'react';

const ErrorWindow = () => {
    const [isVisible, setIsVisible] = useState(true); // Состояние для управления видимостью окна
    const handleClose = () => {
        setIsVisible(false); // Скрываем окно при нажатии на кнопку "Закрыть"
        document.querySelector('.ErrorSection').classList.remove('OnFlex');
    };

    if (!isVisible) {
        document.querySelector('.ErrorSection').classList.remove('OnFlex');
    }

    return(
        <section className='ErrorSection'>
            <div className="ErrorContainer">
                <h1 className="ErrorTitle">Ошибка</h1>
                <p className="ErrorMessage">Не хватает честного знака</p>
                <button className="RetryButton" onClick={handleClose}>
                    Закрыть
                </button>
            </div>
        </section>
    );
}

export default ErrorWindow