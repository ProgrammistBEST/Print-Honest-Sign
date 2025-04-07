import React, { useState, useEffect } from 'react';
import '../css/AdminPanel.css';
import ReportGenerator from './ReportGenerator';
import ModalPrint from './modal/modal';
import { useLocation } from 'react-router-dom';
import CompareFiles from './CompareFiles';
import {
    Modal,
    Box,
    Typography,
    TextField,
    Select,
    MenuItem,
    Button,
    IconButton,
    Stack,
    Snackbar,
    Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Socket
const socket = io(`http://localhost:6502`);

const AdminPanel = () => {
    const [username, setUsernameAdminPanel] = useState('');
    const [brend, setBrend] = useState('');
    const [printerForHonestSign, setprinterForHonestSign] = useState('');
    const [printerForBarcode, setPrinterForBarcode] = useState('');
    const [password, setPasswordAdminPanel] = useState('');
    const [error, setError] = useState('');
    const [pdfFile, setPdfFile] = useState(null);
    const [windowAdmin, setWindowAdmin] = useState(false);
    const [addMultiModel, setAddMultiModel] = useState(false);
    const location = useLocation();
    let [filteredItems, setFilteredItems] = useState([]);
    useEffect(() => {
        if (location.pathname === '/admin') {
            setWindowAdmin(true);
        } else {
            setWindowAdmin(false)
        }
    }, [location]);

    const [CheckStatus, setStatusAdmin] = useState(false)
    // доступные принтеры и места печати
    const [places, setPlaces] = useState(["Лермонтово", "Пятигорск", "Тест"]);
    const [placePrint, setPlacePrint] = useState('');
    const [printItems, setPrintItems] = useState([]);

    // Фильтрация напечатанных знаков 
    const [brandFilter, setBrandFilter] = useState('');
    const [modelFilter, setModelFilter] = useState('');
    const [sizeFilter, setSizeFilter] = useState('');
    const [deliveryFilter, setDeliveryFilter] = useState('');

    // Статус загрузки честного знака
    const [statusUploadSign, setStatusUploadSign] = useState('');
    const [isModalInfoOpen, setIsModalInfoOpen] = useState(false);
    const handleCloseModalInfo = () => setIsModalInfoOpen(false);
    const handleOpenModalInfo = () => setIsModalInfoOpen(true);;

    // Модальное окно
    const [models, setModels] = useState([{ article: '', size: '', brand: 'bestshoes' }]);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "success" });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleInputChange = (index, field, value) => {
        const updatedModels = [...models];
        updatedModels[index][field] = value;
        setModels(updatedModels);
    };
    
    // Добавление нового элемента в список
    const addModel = () => {
        setModels([...models, { article: "", size: "", brand: "bestshoes" }]);
    };

    const handleCheckboxClick = () => {
        setAddMultiModel((prev) => !prev); // Переключаем состояние
    };
    
    // Удаление элемента из списка
    const removeModel = (index) => {
        const updatedModels = models.filter((_, i) => i !== index);
        setModels(updatedModels);
    };

    // Отправка данных (например, сохранение в базу данных)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Эмуляция отправки данных на сервер
            const response = await fetch("http://localhost:6501/api/models/add", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(models),
            });
      
            if (!response.ok) {
              throw new Error("Ошибка при добавлении моделей");
            }
      
            // Очистка состояния и закрытие модального окна
            setModels([{ article: "", size: "", brand: "bestshoes" }]);
            setIsModalOpen(false);
      
            // Показ уведомления об успехе
            setSnackbar({ open: true, message: "Модели успешно добавлены", type: "success" });
        } catch (error) {
          // Показ уведомления об ошибке
          setSnackbar({ open: true, message: "Ошибка добавления моделей", type: "error" });
        }
    };
  
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };
    
    socket.on('upload_status', ({ progress, message, placePrint, arrayAddingModels }) => {
        let status = { progress, message, placePrint, arrayAddingModels };
        setStatusUploadSign(status);
    });

    filteredItems = printItems.filter(item => {
        // Проверка для каждого фильтра: если фильтр пустой или undefined, пропускаем его
        const isBrandMatch = !brandFilter || item.Brand.toLowerCase().includes(brandFilter.toLowerCase());
        const isModelMatch = !modelFilter || item.Model.toLowerCase().includes(modelFilter.toLowerCase());
        const isSizeMatch = !sizeFilter || item.Size.toLowerCase().includes(sizeFilter.toLowerCase());
        const isDeliveryMatch = !deliveryFilter || item.deliverynumber.toLowerCase().includes(deliveryFilter.toLowerCase());
        // Возвращаем true только если все активные фильтры совпадают
        return isBrandMatch && isModelMatch && isSizeMatch && isDeliveryMatch;
    }).sort((a, b) => {
        const parseDate = (dateString) => {
            const [dayMonth, time] = dateString.split(" ");
            const [day, month] = dayMonth.split(".");
            const [hours, minutes, seconds] = time.split(":");
    
            const date = new Date();
            date.setDate(parseInt(day));
            date.setMonth(parseInt(month) - 1);
            date.setHours(parseInt(hours));
            date.setMinutes(parseInt(minutes));
            date.setSeconds(parseInt(seconds) || 0);
            return date;
        };
    
        return parseDate(b.date) - parseDate(a.date);
    });
    
    // Загружаем значение из Local Storage при загрузке компонента
    useEffect(() => {
        const savedPlace = localStorage.getItem('placePrint');
        if (savedPlace) {
            setPlacePrint(savedPlace);
        }
        const printerForHonestSign = localStorage.getItem('printerForHonestSign');

        if (printerForHonestSign) {
            setprinterForHonestSign(printerForHonestSign);
        }
        const printerForBarcode = localStorage.getItem('printerForBarcode');
        if (printerForBarcode) {
            setPrinterForBarcode(printerForBarcode);
        }
    }, []);

    const OpenWindowAdmin = (e) => {
        setWindowAdmin(prevState => !prevState);
    }

    const handleFileChange = (e) => {
        setPdfFile(e.target.files[0]);
    };

    const toggleBrandinfoaddreturn = () => {
        
        const url1 = new URL(`http://localhost:6501/api/printedHonestSign`);
        url1.searchParams.append('placePrint', localStorage.getItem('placePrint'));
        fetch(url1)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Ошибка сети!');
                }
                return response.json();
            })
            .then((data) => {
                setPrintItems(data)
            })
            .catch((error) => console.error('Ошибка при получении данных:', error));

        const url = new URL(`http://localhost:6501/api/InfoAboutAllHonestSign`);
        url.searchParams.append('placePrint', localStorage.getItem('placePrint'));
        url.searchParams.append('brand', brend);

        fetch(url)
        .then((response) => {
                if (!response.ok) {
                    throw new Error('Ошибка сети');
                }
                return response.json();
        })
        .then((data) => {
            const brandGet = {};
            data.forEach(item => {
                console.log(item)
                if (!brandGet[item.Brand]) {
                    brandGet[item.Brand] = { totalQuantity: 0, models: [] };
                }
                brandGet[item.Brand].totalQuantity += item.quantity;
                brandGet[item.Brand].models.push({
                    model: item.Model,
                    size: item.Size,
                    quantity: item.quantity,
                });
            });
            setInfoAboutHonestSing(brandGet);
        })
        .catch((error) => console.error('Ошибка при получении данных:', error));
    }
    
    const handleLogin = (e) => {
        e.preventDefault();
        if (username === 'best' && password === 'best') {
            setError('')
            setStatusAdmin(prevState => !prevState);
        } else {
            setError('Неправильный логин или пароль');
        }
    };

    const addNewKyz = async (e) => {
        e.preventDefault();
        setError('')
        let question;
        if (brend === 'Armbest' || brend === 'BestShoes' || brend === 'Best26' || brend === 'OZON') {
            console.log('brend:', brend)
            question = confirm(`Согласны добавить КИЗ на, ${brend}`); // , в поставку №, ${deliveryNumber}
        } else if (brend == '') {
            alert('Выберите фирму на которую хотите добавить честный знак и попробуйте еще раз.')
            return;
        }
        if (question == false) {
            return;
        }
        if (!pdfFile) {
            setError('Пожалуйста, выберите PDF-файл');
            return;
        }

        const formData = new FormData();
        formData.append('file', pdfFile);
        console.log(brend)
        formData.append('brandData', JSON.stringify(brend));
        formData.append('placePrint', JSON.stringify(placePrint));
        formData.append('MultiModel', JSON.stringify(addMultiModel));
        
        setIsModalInfoOpen(true);

        try {
            const response = await fetch(`http://localhost:6501/uploadNewKyz`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                alert('PDF успешно загружен');
            } else {
                alert('Ошибка при загрузке PDF');
            }
        } catch (err) {
            console.error('Ошибка:', err);
        }
    };

    const handlePlacePrint = (event) => {
        localStorage.setItem('placePrint', event.target.value);
        setPlacePrint(event.target.value);
    };

    const handlePrinterForBarcode = (event) => {
        localStorage.setItem('printerForBarcode', event.target.value);
        setPrinterForBarcode(event.target.value);
    };

    const handleprinterForHonestSign = (event) => {
        localStorage.setItem('printerForHonestSign', event.target.value);
        setprinterForHonestSign(event.target.value);
    };

    const handleRowButtonClick = async (item, index) => {
        const conf = confirm("Вы точно хотите вернуть ЧЗ: ", item);
        if (!conf) {
            return;
        }
        const { Brand, user, Model, Size, date } = item;
        try {
            const response = await fetch(`http://localhost:6501/api/returnKyz`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    Brand,
                    user,
                    placePrint,
                    date,
                    Model,
                    Size
                }),
            });
            const data = await response.json();
            if (response.ok) {
                const row = document.getElementById(`row-${index}`);
                if (row) {
                    // Шаг 1: Подсветить строку красным
                    row.classList.add("highlight-red");
        
                    // Шаг 2: Через 500 мс начать исчезновение
                    setTimeout(() => {
                        row.classList.add("fade-out");
                    }, 500);
        
                    // Шаг 3: Через 1000 мс полностью скрыть строку и удалить из состояния
                    setTimeout(() => {
                        row.classList.add("hidden");
        
                        // Удаляем элемент из массива
                        // const updatedItems = filteredItems.filter((_, i) => i !== index);
                        // setFilteredItems(updatedItems);
                    }, 1000);
                }        
            } else {
                console.error('Ошибка обновления:', data.message);
            }
        } catch (err) {
            console.error('Ошибка:', err);
        }
    };

    const [activeTab, setActiveTab] = useState('remaining-signs');
    const [InfoAboutHonestSing, setInfoAboutHonestSing] = useState([]);
    const [expandedBrand, setExpandedBrand] = useState(null);

    const toggleBrand = (brend) => {
        setExpandedBrand(expandedBrand === brend ? null : brend);
    };

    // Фильтрация не напечатанных знаков 
    const [modelFilterWaiting, setModelFilterWaiting] = useState('');
    const [sizeFilterWaiting, setSizeFilterWaiting] = useState('');
    const [deliveryNumberWaiting, setdeliveryNumberWaiting] = useState();

    const filteredDataWaiting = Object.entries(InfoAboutHonestSing).reduce((acc, [brand, data]) => {
        const filteredModelsWaiting = data.models.filter(model =>
            (!modelFilterWaiting || model.model.toLowerCase().includes(modelFilterWaiting.toLowerCase())) &&
            (!sizeFilterWaiting || model.size.toLowerCase().includes(sizeFilterWaiting.toLowerCase())) &&
            (!deliveryNumberWaiting || model.deliverynumber?.toLowerCase().includes(deliveryNumberWaiting.toLowerCase()))
        );

        if (filteredModelsWaiting.length > 0) {
            acc[brand] = { ...data, models: filteredModelsWaiting };
        }
        return acc;
    }, {});

    // const checkDelivery = async () => {
    //     if (!deliveryNumber.trim()) {
    //         setDeliveryMessage('Введите номер поставки.');
    //         return;
    //     }
    //     try {
    //         console.log(deliveryNumber)

    //         const response = await fetch(`http://${window.location.hostname}:6501/api/checkDelivery`, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //             body: JSON.stringify({ deliverynumber: Number(deliveryNumber) }),
    //         });

    //         if (response.ok) {
    //             const result = await response.json();
    //             if (result.exists) {
    //                 setDeliveryMessage(`Поставка с номером ${deliveryNumber} уже существует.`);
    //                 setConfirmCreateDelivery(false); // Скрыть кнопку подтверждения
    //             } else {
    //                 setDeliveryMessage(`Поставка с номером ${deliveryNumber} не найдена. Вы хотите её создать?`);
    //                 setConfirmCreateDelivery(true); // Показать кнопку подтверждения
    //             }
    //         } else {
    //             throw new Error('Ошибка проверки номера поставки.');
    //         }
    //     } catch (error) {
    //         setDeliveryMessage('Ошибка проверки номера поставки.');
    //         console.error(error);
    //     }
    // };

    // const createDelivery = async () => {
    //     try {
    //         const response = await fetch(`http://${window.location.hostname}:6501/addDelivery`, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //             body: JSON.stringify({ deliverynumber: Number(deliveryNumber) }),
    //         });

    //         if (response.ok) {
    //             setDeliveryMessage(`Поставка с номером ${deliveryNumber} успешно создана.`);
    //             setConfirmCreateDelivery(false); // Скрыть кнопку подтверждения
    //         } else {
    //             throw new Error('Ошибка создания новой поставки. Не правильно введены данные');
    //         }
    //     } catch (error) {
    //         setDeliveryMessage('Ошибка создания новой поставки. Не удалось подключится к серверу');
    //         console.error(error);
    //     }
    // };

    const handleCompanySelection = (company) => {
        console.log(`[INFO] Выбрана компания: ${company}`);
        setBrend(company);  // Устанавливаем компанию в стейт родительского компонента
    };


    return (
        <div className="admin-wrapper">

            <button className='OpenPanelAmin open-panel-admin btn-submit' onClick={OpenWindowAdmin}>Панель администратора</button>
            <div className={`admin-container ${windowAdmin ? 'panelOn' : 'panelOff'}`}>

                <section className={CheckStatus ? "Admin" : "NonAdmin"} style={{
                    width: '400px',
                    padding: '20px',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    backgroundColor: '#f9f9f9',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    fontFamily: 'Arial, sans-serif'
                }}>
                    <div className="category-block">
                        <div className="tabs">
                            <button
                                className={`tab-button active`}
                                onClick={() => setActiveTab('remaining-signs')}
                            >
                                Количество оставшихся знаков
                            </button>
                            <button
                                className={`tab-button`}
                                onClick={() => toggleBrandinfoaddreturn()}
                            >
                                Обновить список
                            </button>
                        </div>

                        {activeTab === 'remaining-signs' && (
                            <div className="content">
                                <div className="filters" style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Модель"
                                        value={modelFilterWaiting}
                                        onChange={(e) => setModelFilterWaiting(e.target.value)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '5px',
                                            border: '1px solid #ccc',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                            width: '100px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'border-color 0.2s ease-in-out',
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Размер"
                                        value={sizeFilterWaiting}
                                        onChange={(e) => setSizeFilterWaiting(e.target.value)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '5px',
                                            border: '1px solid #ccc',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                            width: '100px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'border-color 0.2s ease-in-out',
                                        }}

                                    />
                                    <input
                                        type="text"
                                        placeholder="Поставка"
                                        value={deliveryNumberWaiting}
                                        onChange={(e) => setdeliveryNumberWaiting(e.target.value)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '5px',
                                            border: '1px solid #ccc',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                            width: '100px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'border-color 0.2s ease-in-out',
                                        }}
                                    />
                                </div>
                                <ul className="firm-list">
                                    {Object.entries(filteredDataWaiting).map(([brand, data]) => (
                                        <li key={brand}>
                                            <div onClick={() => toggleBrand(brand)}>
                                                {brand} <span>Всего: {data.totalQuantity} шт.</span>
                                            </div>
                                            {expandedBrand === brand && (
                                                <ul className="model-list">
                                                    {data.models.map((model, index) => (
                                                        <li key={index}>
                                                            <span>{model.model}</span>
                                                            <span>{model.size}</span>
                                                            <span>{model.quantity} шт.</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>

                {/* Модуль вывода информации о печати честного знака */}
                <ModalPrint
                    isOpen={isModalInfoOpen}
                    onClose={handleCloseModalInfo}
                    info={statusUploadSign}
                    type={'statusUploadSigns'}
                    brand={brend}
                    placePrint={placePrint}
                />

                <div className={CheckStatus ? "Admin" : "NonAdmin"} style={{
                    width: '470px',
                    padding: '20px',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    backgroundColor: '#f9f9f9',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    fontFamily: 'Arial, sans-serif'
                }}>

                    <label htmlFor="placePrint" style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                        Выберите место:
                    </label>
                    <select
                        className='placePrintValue'
                        id="placePrint"
                        value={placePrint}
                        onChange={handlePlacePrint}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            marginBottom: '15px',
                            cursor: 'pointer'
                        }}
                    >
                        {places.map((place, index) => (
                            <option key={index} value={place}>{place}</option>
                        ))}
                    </select>
                    {placePrint && <p style={{ color: 'green', marginTop: '-10px', marginBottom: '15px' }}>Вы выбрали: {placePrint}</p>}

                    <label htmlFor="printerForBarcode" style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                        Выберите принтер для баркодов:
                    </label>
                    <select
                        className='printForBarcode'
                        id="printerForBarcode"
                        value={printerForBarcode}
                        onChange={handlePrinterForBarcode}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            marginBottom: '15px',
                            cursor: 'pointer'
                        }}
                    >
                    <option value="Баркод">Баркод</option>
                    <option value="EPSON2AF3CE (L3250 Series)">EPSON2AF3CE (L3250 Series)</option>
                    </select>
                    {printerForBarcode && <p style={{ color: 'green', marginTop: '-10px', marginBottom: '15px' }}>Вы выбрали: {printerForBarcode}</p>}
                    <label htmlFor="printerForHonestSign" style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                        Выберите принтер для честного знака:
                    </label>
                    <select
                        className='printForHonestSign'
                        id="printerForHonestSign"
                        value={printerForHonestSign}
                        onChange={handleprinterForHonestSign}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            marginBottom: '15px',
                            cursor: 'pointer'
                        }}
                    >
                    <option value="Баркод">Баркод</option>
                    <option value="EPSON2AF3CE (L3250 Series)">EPSON2AF3CE (L3250 Series)</option>
                    <option value="ChestniZnak">ChestniZnak</option>
                    </select>
                    {printerForHonestSign && <p style={{ color: 'green', marginTop: '-10px' }}>Вы выбрали: {printerForHonestSign}</p>}

                    {/* Фильтры */}
                    <label htmlFor="placePrint" style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                        Фильтр:
                    </label>

                    <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Бренд"
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '5px',
                                border: '1px solid #ccc',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                width: '100px',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s ease-in-out',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Модель"
                            value={modelFilter}
                            onChange={(e) => setModelFilter(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '5px',
                                border: '1px solid #ccc',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                width: '100px',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s ease-in-out',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Размер"
                            value={sizeFilter}
                            onChange={(e) => setSizeFilter(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '5px',
                                border: '1px solid #ccc',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                width: '100px',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s ease-in-out',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Поставка"
                            value={deliveryFilter}
                            onChange={(e) => setDeliveryFilter(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '5px',
                                border: '1px solid #ccc',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                width: '100px',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s ease-in-out',
                            }}
                        />
                    </div>

                    <div style={{
                        maxHeight: '510px', // Фиксированная высота для контейнера с таблицей
                        overflowY: 'auto',  // Прокрутка по вертикали при превышении высоты
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginTop: '15px'
                    }}>

                        <h3 style={{
                            paddingLeft: '15px',
                            paddingTop: '15px'
                        }}>Список печати</h3>

                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginTop: '15px',
                            textAlign: 'left',
                        }}>
                            <thead>
                                <tr>
                                    <th style={tableHeaderStyle}>Бренд</th>
                                    <th style={tableHeaderStyle}>Мод.</th>
                                    <th style={tableHeaderStyle}>Раз.</th>
                                    <th style={tableHeaderStyle}>Шт.</th>
                                    <th style={tableHeaderStyle}>Время</th>
                                    <th style={tableHeaderStyle}>Отв.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item, index) => (
                                    <tr
                                        key={index}
                                        id={`row-${index}`}
                                        className="fade-out-row"
                                        >
                                        <td style={tableCellStyle}>{item.Brand}</td>
                                        <td style={tableCellStyle}>{item.Model}</td>
                                        <td style={tableCellStyle}>{item.Size}</td>
                                        <td style={tableCellStyle}>{item.quantity}</td>
                                        <td style={tableCellStyle}>{item.date}</td>
                                        <td style={tableCellStyle}>{item.user}</td>
                                        <td style={tableCellStyle}>
                                            <button
                                                className="buttonReturnSign"
                                                onClick={() => handleRowButtonClick(item, index)}
                                            >
                                                X
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                </div>

                {/* Секция входа на AdminPanel */}
                <section className='admin-panel'>
                    <h2 className="admin-title">Вход в панель администратора</h2>
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username" style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                                Логин
                            </label>
                            <input
                                id="username" // Уникальный id
                                type="text"
                                value={username}
                                placeholder="Введите логин"
                                onChange={(e) => setUsernameAdminPanel(e.target.value)}
                                autoComplete="username" // Используется camelCase
                            />

                        </div>
                        <div className="form-group">
                            <label htmlFor="password" style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
                                Пароль
                            </label>
                            <input
                                id="password" // Уникальный id
                                type="password"
                                value={password}
                                placeholder="Введите пароль"
                                autoComplete="current-password" // Используется camelCase
                                onChange={(e) => setPasswordAdminPanel(e.target.value)}
                            />

                        </div>
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                        <button type="submit" className="btn-submit">Войти</button>
                    </form>
                    <div className={`${CheckStatus ? 'Admin' : 'NonAdmin'} admin-functions`}>
                        <article className="add-section">
                            <h2 className="admin-title">Добавление честного знака</h2>
                            <Button variant="contained" onClick={() => setIsModalOpen(true)}>
                                Добавить модели
                            </Button>

                            <div className={`${CheckStatus ? 'Admin' : 'NonAdmin'} admin-functions`}>
                                <article className="add-section">
                                    <h2 className="admin-title">Добавление честного знака</h2>
                                    <ReportGenerator setSelectedCompany={handleCompanySelection} />
                                    {/* Кнопка для открытия модального окна */}
                                    <button className="btn-submit" onClick={handleOpenModalInfo}>
                                        Показать модальное окно
                                    </button>
                                    <div
                                        style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginTop: '10px',
                                        cursor: 'pointer',
                                        }}
                                        onClick={handleCheckboxClick} // Обработчик клика
                                    >
                                        <span style={{ marginRight: '8px', fontSize: '18px' }}>
                                        {addMultiModel ? '✔' : '✗'} {/* Показываем галочку или крестик */}
                                        </span>
                                        <span>{addMultiModel ? 'Добавятся как мультимодели' : 'Добавятся помодельно'}</span>
                                    </div>
                                    <form onSubmit={addNewKyz} className="upload-form">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileChange}
                                        />

                                        {error && <p style={{ color: 'red' }}>{error}</p>}

                                        <button type="submit" className="btn-submit">Загрузить честный знак</button>
                                    </form>
                                        {/* <input
                                            type="number"
                                            value={deliveryNumber}
                                            onChange={(e) => setDeliveryNumber(e.target.value)}
                                            placeholder="Введите номер поставки"
                                        />
                                        <button onClick={checkDelivery}>Проверить</button>
                                        {deliveryMessage && <p>{deliveryMessage}</p>}

                                        {confirmCreateDelivery && (
                                            <button onClick={createDelivery}>
                                                Создать поставку {deliveryNumber}
                                            </button>
                                        )}   */}
                                    <CompareFiles selectedCompany={brend} placePrint={placePrint}/>
                                </article>
                            </div>
                        </article>
                    </div>
                </section>
            </div>
            {/* Модальное окно */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <Box
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 600,
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 3,
                    borderRadius: 2,
                    maxHeight: "80vh",
                    overflowY: "auto",
                }}
                >
                <IconButton
                    aria-label="close"
                    onClick={() => setIsModalOpen(false)}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
                <Typography variant="h6" gutterBottom>
                    Добавление моделей
                </Typography>
                <form onSubmit={handleSubmit}>
                    {models.map((model, index) => (
                    <Stack
                        key={index}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 1 }}
                    >
                        <TextField
                        label="Артикул"
                        value={model.article}
                        onChange={(e) =>
                            handleInputChange(index, "article", e.target.value)
                        }
                        size="small"
                        sx={{ flex: 1 }}
                        />
                        <TextField
                        label="Размер"
                        value={model.size}
                        onChange={(e) =>
                            handleInputChange(index, "size", e.target.value)
                        }
                        size="small"
                        sx={{ width: 100 }}
                        />
                        <Select
                        value={model.brand}
                        onChange={(e) =>
                            handleInputChange(index, "brand", e.target.value)
                        }
                        size="small"
                        sx={{ width: 150 }}
                        >
                        <MenuItem value="bestshoes">BestShoes</MenuItem>
                        <MenuItem value="best26">Best26</MenuItem>
                        <MenuItem value="armbest">Armbest</MenuItem>
                        </Select>
                        <Button
                        variant="outlined"
                        color="error"
                        onClick={() => removeModel(index)}
                        disabled={models.length === 1}
                        size="small"
                        >
                        Удалить
                        </Button>
                    </Stack>
                    ))}
                    <Button
                    variant="contained"
                    onClick={addModel}
                    size="small"
                    sx={{ mb: 2 }}
                    >
                    Добавить модель
                    </Button>
                    <Stack direction="row" spacing={2}>
                    <Button variant="contained" type="submit" size="small">
                        Сохранить
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => setIsModalOpen(false)}
                        size="small"
                    >
                        Отмена
                    </Button>
                    </Stack>
                </form>
                </Box>
            </Modal>

            {/* Уведомления */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                onClose={handleCloseSnackbar}
                severity={snackbar.type}
                sx={{ width: "100%" }}
                >
                {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
}

const tableHeaderStyle = {
    padding: '9px',
    borderBottom: '2px solid #ddd',
    fontWeight: 'bold',
    fontSize: '13px',
    textAlign: 'center',
};

const tableCellStyle = {
    textAlign: 'center',
    padding: '1px',
    fontSize: '10px',
    borderBottom: '1px solid #ddd',
};


export default AdminPanel;