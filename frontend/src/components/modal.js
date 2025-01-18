import React from "react";
import PropTypes from 'prop-types';
import '../css/modal.css'

const Modal = ({ isOpen, onClose, successCount, failureCount }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Результаты печати</h2>
                <p>Успешно напечатано: {successCount}</p>
                <p>Не удалось напечатать: {failureCount}</p>
                <button onClick={onClose}>Закрыть</button>
            </div>
        </div>
    );
};

Modal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    successCount: PropTypes.number.isRequired,
    failureCount: PropTypes.number.isRequired,  
}

export default Modal;