import React, {useState, useEffect} from 'react';

const LoadScreen = () => {

    const [imageSrc, setImageSrc] = useState('');

    useEffect(() => {
        // Выбираем случайное изображение
        const chooseImage = Math.floor(Math.random() * 4) + 1;
        
        if (chooseImage === 1 || chooseImage === 2) {
            setImageSrc('/img/spinerLoader.png');
        } else if (chooseImage === 3) {
            setImageSrc('/img/gostLoader.png');
        } else if (chooseImage === 4) {
            setImageSrc('/img/catLoader.gif');
        }
    }, []); // Пустой массив зависимостей, чтобы код выполнился один раз при монтировании компонента


    return(
        <div>
            <div className="modal-background"></div>
            <div className="modal-background-loader" style={{ backgroundColor: '#202020' }}>
                <img className="modal-background-loaderImage" src={imageSrc} alt="Loading..." style={{
                    width: "100px",
                    }}/>
                <br/>
                <p className="textLoader">Не выключайте программу, идет печать честного знака.</p>
            </div>
        </div>
    )
}

export default LoadScreen;