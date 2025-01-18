import React, { useState } from 'react';
import ExcelJS from 'exceljs';

const ReportGenerator = () => {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCompanySelection = (company) => {
    console.log(`[INFO] Выбрана компания: ${company}`);
    setSelectedCompany(company);
  };

  const generateReport = async () => {
    if (!selectedCompany) {
      alert('Выберите компанию!');
      console.warn('[WARN] Попытка сформировать отчет без выбора компании');
      return;
    }

    console.log(`[INFO] Начато формирование отчета для компании: ${selectedCompany}`);
    setIsLoading(true);

    const url = `http://localhost:6501/api/report?brand=${encodeURIComponent(selectedCompany)}`;
    console.log(`[INFO] Отправка запроса на сервер: ${url}`);

    try {
      const response = await fetch(url);
      console.log(`[INFO] Ответ от сервера: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ERROR] Сервер вернул ошибку: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Ошибка при получении данных: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[INFO] Получены данные от сервера:`, data);

      // Создание отчета Excel
      const workbook = new ExcelJS.Workbook();
      const worksheetThereIs = workbook.addWorksheet('Есть');
      const worksheetShortage = workbook.addWorksheet('Нехватка');

      worksheetThereIs.columns = [
        { header: 'Размер', key: 'Size', width: 20 },
        { header: 'Модель', key: 'Model', width: 20 },
        { header: 'Поставка', key: 'DeliveryNumber', width: 20 }, // Добавляем колонку для поставки
        { header: 'Количество', key: 'Quantity', width: 20 },
      ];
      worksheetShortage.columns = worksheetThereIs.columns;

      // Логика для добавления данных в листы и чередования цветов с границами
      data.forEach((row, rowIndex) => {
        const newRowData = {
          Size: row.Size,
          Model: row.Model,
          DeliveryNumber: row.deliverynumber, // Добавляем поставку
          Quantity: row.Quantity
        };

        // Обрабатываем лист "Нехватка" (если количество меньше 10)
        if (row.Quantity < 10) {
          const newRow = worksheetShortage.addRow(newRowData);

          // Если количество меньше 5, выделяем строку красным цветом
          if (row.Quantity < 5) {
            newRow.eachCell((cell) => {
              cell.font = { bold: true };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'f71105' }, // Красный цвет
              };
              // Добавляем границы ко всем ячейкам
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              };
            });
          } else {
            // Чередуем цвета на основе чётности индекса строки
            const fillColor = (rowIndex % 2 === 0) ? 'D3D3D3' : 'A9A9A9'; // Серый и темно-серый
            newRow.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: fillColor },
              };
              // Добавляем границы ко всем ячейкам
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              };
            });
          }
        } else {
          // Добавляем данные в лист "Есть" (если количество больше или равно 10)
          const newRow = worksheetThereIs.addRow(newRowData);

          // Чередуем цвета на основе чётности индекса строки
          const fillColor = (rowIndex % 2 === 0) ? 'D3D3D3' : 'A9A9A9'; // Серый и темно-серый
          newRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: fillColor },
            };
            // Добавляем границы ко всем ячейкам
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });
        }
      });

      // Применяем стиль к заголовкам на листе "Есть"
      const headerRowThereIs = worksheetThereIs.getRow(1);
      headerRowThereIs.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Центрирование текста
        cell.font = { bold: true }; // Жирный шрифт
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }, // Белый цвет для фона
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Применяем стиль к заголовкам на листе "Нехватка"
      const headerRowShortage = worksheetShortage.getRow(1);
      headerRowShortage.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Центрирование текста
        cell.font = { bold: true }; // Жирный шрифт
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }, // Белый цвет для фона
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      console.log('[INFO] Отчет сформирован, начинается загрузка файла');

      // Скачивание Excel файла
      const excelBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedCompany}_Report.xlsx`;
      link.click();

      console.log('[INFO] Файл успешно загружен');
    } catch (error) {
      console.error('[ERROR] Ошибка при формировании отчета:', error);
      alert('Не удалось сформировать отчет');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="button-group">
        {['Armbest', 'BestShoes', 'Best26', 'Ozon Armbest', 'Ozon BestShoes'].map((company) => (
          <button
            key={company}
            onClick={() => handleCompanySelection(company)}
            className={`btn-company ${selectedCompany === company ? 'active' : ''}`}
          >
            {company}
          </button>
        ))}
      </div>
      <button
        onClick={generateReport}
        className="btn-generate-report"
        disabled={isLoading}
      >
        {isLoading ? 'Формируется...' : 'Сформировать отчет'}
      </button>
    </div>
  );
};

export default ReportGenerator;
