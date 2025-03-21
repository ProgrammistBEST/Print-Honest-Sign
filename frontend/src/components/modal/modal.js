import React from "react";
import PropTypes from 'prop-types';
import './style.css'

const ModalPrint = ({ isOpen, onClose, info, type, brand, placePrint}) => {
    if (!isOpen) { return null };
    
    if (isOpen && type == 'statusUploadSigns') {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h1>{info.message}</h1>
                    <h2>Загрузка честного знака на {brand} в {placePrint}.</h2>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${info.progress}%` }}></div>
                    </div>
                    {/* Вывод добавленных моделей */}
                    <div className="models-list">
                        <h3>Добавленные модели:</h3>
                        {info.arrayAddingModels && Object.keys(info.arrayAddingModels).length > 0 ? (
                            <ul className="model-sizes">
                                {Object.entries(info.arrayAddingModels).map(([model, data]) => (
                                    <li key={model}>
                                        <strong>{model}</strong>: {data.count} шт.
                                        <ul className="model-grid">
                                            {Object.entries(data.sizes).map(([size, count]) => (
                                                <li className="model-element" key={size}>
                                                    {size}: {count} шт.
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>Модели еще не добавлены.</p>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button onClick={onClose} className="close-button-modal">Закрыть</button>
                    </div>
                </div>
            </div>
        )
    } else if (isOpen && type == 'printedSigns') {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2 className="modal-title">Результаты печати</h2>

                    <div className="modal-grid">
                        {/* Успешно напечатано */}
                        <div>
                            <h3 className="success-title">Успешно напечатано</h3>
                            <div className="result-list">
                                {info.successfulSign.map((element, index) => (
                                    <div key={index} className="result-card success">
                                        <h4>Модель: {element.model}</h4>
                                        <p>Размер: {element.size}</p>
                                        <p>Напечатано: <strong>{element.available}</strong> шт.</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Не удалось напечатать */}
                        <div>
                            <h3 className="failure-title">Не удалось напечатать</h3>
                            <div className="result-list">
                                {info.shortageInfo.map((element, index) => (
                                    <div key={index} className="result-card failure">
                                        <h4>Модель: {element.model}</h4>
                                        <p>Размер: {element.size}</p>
                                        <p>Требовалось: <strong>{element.required}</strong>, в наличии: <strong>{element.available}</strong></p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button onClick={onClose} className="close-button">Закрыть</button>
                    </div>
                </div>
            </div>
        );
    };
}



ModalPrint.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
}

export default ModalPrint;