import { useState } from "react";
import '../css/CompareFiles.css';

function CompareFiles({ selectedCompany, placePrint }) {
    // Состояния для хранения выбранного файла заказа и результатов сравнения
    const [orderFile, setOrderFile] = useState(null);
    const [comparisonResult, setComparisonResult] = useState(null);

    // Обработчик выбора файла
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setOrderFile(file);
        }
    };

    // Обработчик кнопки "Сравнить"
    const handleCompare = async () => {
        // Проверка: выбран ли файл
        if (!orderFile) {
            alert("Пожалуйста, выберите файл заказа.");
            return;
        }
    
        // Проверка: выбран ли бренд
        if (!selectedCompany) {
            alert("Пожалуйста, выберите бренд перед сравнением.");
            return;
        }
    
        // Проверка: выбрано ли место 
        if (!placePrint) {
            alert("Пожалуйста, выберите место перед сравнением.");
            return;
        }
    
        // Формирование данных для отправки на сервер
        const formData = new FormData();
        formData.append('file', orderFile); // Добавляем файл
        formData.append('brand', selectedCompany); // Добавляем название бренда
        formData.append('placePrint', placePrint); // Добавляем название места
    
        try {
            // URL для отправки запроса
            const url = `http://localhost:6501/api/compare`;
    
            // Отправка POST-запроса на сервер
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });
    
            // Проверка статуса ответа
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка при сравнении: ${errorText}`);
            }
    
            // Проверяем, является ли ответ файлом
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
                // Если это файл, скачиваем его
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comparison_${selectedCompany}.xlsx`; // Имя файла для скачивания
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                // Если это JSON, обрабатываем как обычно
                const result = await response.json();
                setComparisonResult(result.message || "Сравнение завершено успешно.");
            }
        } catch (error) {
            console.error("[ERROR]", error);
            setComparisonResult("Произошла ошибка при сравнении.");
        }
    };
    
    return (
        <div className="compare-files">
            <h2 className="admin-title">
                Сравнение заказа <br />
                с базой данных
            </h2>

            {/* Поле для выбора файла */}
            <label className="label-block">Заказ</label>
            <input
                type="file"
                accept="application/xlsx"
                id="compare-order"
                onChange={handleFileChange}
            />

            {/* Кнопка для запуска сравнения */}
            <button className="btn-submit" onClick={handleCompare} disabled={!orderFile}>
                Сравнить
            </button>

            {/* Отображение результата сравнения */}
            {comparisonResult && (
                <div className="comparison-result">
                    <p>{comparisonResult}</p>
                </div>
            )}
        </div>
    );
}

export default CompareFiles;