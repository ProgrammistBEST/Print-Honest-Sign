import React from "react";
import PropTypes from 'prop-types';
import './style.css'

const Modal = ({ isOpen, onClose, info }) => {
    if (!isOpen) return null;
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



Modal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
}

export default Modal;