import React, { useState } from "react";
import PropTypes from "prop-types";
import "./style.css";
import socket from "../socket";

const ModalPrint = ({
  isOpen,
  onClose,
  info,
  type,
  brand,
  placePrint,
  fileName,
  onConfirm,
}) => {
  const [comment, setComment] = useState("");

  if (!isOpen) {
    return null;
  }

  // 🆕 Новый режим: Подтверждение загрузки
  if (type === "confirmUpload") {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Подтвердите загрузку Честного Знака</h2>

          <p>
            <strong>Фирма:</strong> {brand}
          </p>
          <p>
            <strong>Файл:</strong> {fileName}
          </p>

          <label htmlFor="comment">Комментарий:</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Например: Армбест 04.06 Маркет"
            rows={3}
            style={{ width: "100%", marginTop: "0.5em", marginBottom: "1em" }}
          />

          <div className="modal-footer">
            <button onClick={onClose} className="close-button-modal">
              Отмена
            </button>
            <button
              onClick={() => {
                onConfirm(comment);
                setComment("");
              }}
              className="confirm-button-modal"
            >
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isOpen && type == "statusUploadSigns") {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h1>{info.message}</h1>
          <h2>
            Загрузка честного знака на {brand} в {placePrint}.
          </h2>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${info.progress}%` }}
            ></div>
          </div>
          {/* Вывод добавленных моделей */}
          <div className="models-list">
            <h3>Добавленные модели:</h3>
            {info.arrayAddingModels &&
            Object.keys(info.arrayAddingModels).length > 0 ? (
              <ul className="model-sizes">
                {Object.entries(info.arrayAddingModels).map(([model, data]) => (
                  <li key={model}>
                    <strong>{model}</strong>: {data.count} шт.
                    <ul className="model-grid">
                      {Object.entries(data.sizes).map(([size, count]) => (
                        <li className="model-element" key={size}>
                          <span className="model-element-size">{size}:</span>{" "}
                          {count} шт.
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
            <button onClick={onClose} className="close-button-modal">
              Закрыть
            </button>
            <button
              onClick={() => {
                console.log("СТОП — socket.id:", socket.id);
                socket.emit("stopUpload");
                onClose();
              }}
              className="close-button-modal"
            >
              Стоп
            </button>
          </div>
        </div>
      </div>
    );
  } else if (isOpen && type == "printedSigns") {
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
                    <p>
                      Напечатано: <strong>{element.available}</strong> шт.
                    </p>
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
                    <p>
                      Требовалось: <strong>{element.required}</strong>, в
                      наличии: <strong>{element.available}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button onClick={onClose} className="close-button">
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }
};

ModalPrint.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  info: PropTypes.object,
  type: PropTypes.string.isRequired,
  brand: PropTypes.string,
  placePrint: PropTypes.string,
  fileName: PropTypes.string,
  onConfirm: PropTypes.func,
};

export default ModalPrint;
