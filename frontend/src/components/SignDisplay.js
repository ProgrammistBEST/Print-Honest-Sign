import { useEffect, useRef, useState } from "react";
import "../css/CheckboxStyles.css";
import Modal from "./modal/modal.js";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";

const SignDisplay = () => {
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedModels, setSelectedModels] = useState([]);
  // const [combinedData, setCombinedData] = useState([]);
  const [showSizes, setShowSizes] = useState(false);
  const [brands, setBrands] = useState([]);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(true);
  // const [numberdelivery, setNumberDelivery] = useState('');
  // const [numbersdeliveries, setNumbersDeliveries] = useState('');
  const [warning, setWarning] = useState("");
  const [isInfoPrintedSigns, setInfoPrintedSigns] = useState("");
  // Модальное окно информации
  const [isModalInfoOpen, setIsModalInfoOpen] = useState(false);
  const handleCloseModalInfo = () => setIsModalInfoOpen(false);
  const isDataFetched = useRef(false);
  const [isAccess, setSetAccess] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(true);

  //   useEffect(() => {
  //     if (!isDataFetched.current) {
  //       const password = prompt("Введите пароль администратора");
  //       if (password == "15793") {
  //         fetchAndCombineData();
  //         isDataFetched.current = true;
  //       } else {
  //         return;
  //       }
  //     }
  //   }, []);

  const handleConfirm = () => {
    if (password === "15793") {
      setAccessGranted(true);
      setOpen(false);
      fetchAndCombineData();
    } else {
      alert("Неверный пароль");
    }
  };

  // Загрузка данных
  const fetchAndCombineData = async () => {
    try {
      // Шаг 1: Получаем список брендов
      const brandsResponse = await fetch(
        `http://${window.location.hostname}:6501/getBrands`
      );
      const brandsData = await brandsResponse.json();

      // Преобразуем бренды в нужную структуру
      const formattedBrands = await Promise.all(
        brandsData.map(async (brand) => {
          const modelsResponse = await fetch(
            `http://${
              window.location.hostname
            }:6501/getModels?brand=${encodeURIComponent(brand.brand)}`
          );
          const modelsData = await modelsResponse.json();

          // Форматируем модели
          const formattedModels = modelsData.map((model, index) => ({
            name: model.article,
            sizes: model.sizes.map(String),
            id: index,
            brand: brand.brand,
          }));

          return {
            nameBrand: brand.brand,
            models: formattedModels,
          };
        })
      );

      // Устанавливаем бренды в состояние
      setBrands(formattedBrands);
    } catch (error) {
      console.error("Ошибка получения данных:", error);
    }
  };

  // Выбор бренда
  const chooseBrand = (brandName) => {
    const brand = brands.find((b) => b.nameBrand === brandName);
    if (brand) {
      setSelectedBrand(brand); // Устанавливаем выбранный бренд
      setSelectedModels([]); // Очищаем выбранные модели
      setShowSizes(false); // Скрываем размеры
    }
  };

  // Изменение чекбоксов моделей
  const handleCheckboxChange = (modelId) => {
    setSelectedModels((prevSelectedModels) => {
      const safePrevSelectedModels = Array.isArray(prevSelectedModels)
        ? prevSelectedModels
        : [];

      if (safePrevSelectedModels.includes(modelId)) {
        return safePrevSelectedModels.filter((id) => id !== modelId);
      } else {
        return [...safePrevSelectedModels, modelId];
      }
    });
  };
  const exitUser = () => {
    setIsModalOpen(false);
    window.location.reload();
    setUser("");
  };

  const handleLogin = async () => {
    if (user.trim() !== "") {
      // if (numberdelivery.trim() == '') {
      //     setWarning('Ошибка: Не введен номер поставки.');
      //     return
      // }
      setWarning("");
      try {
        const response = await fetch(
          `http://${window.location.hostname}:6501/api/CheckUser`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user: user,
              // numberdelivery: numberdelivery
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.log(errorData);
          throw new Error("Соединение сброшено");
        }

        const data = await response.json();
        // if (numbersdeliveries.includes(Number(numberdelivery))) {
        setIsModalOpen(false);
        setUser(data[0].name);
        // } else {
        //     document.querySelector('.ErrorSection').classList.add('OnFlex')
        //     console.log('Такой поставки нет', numberdelivery, numbersdeliveries)
        //     document.querySelector('.ErrorMessage').textContent = 'Вы ввели неправильный номер поставки'
        // }
      } catch (error) {
        document.querySelector(".ErrorSection").classList.add("OnFlex");
        console.log("Вы ввели неправильный номер");
        document.querySelector(".ErrorMessage").textContent =
          "Вы ввели неправильный номер упаковщика";
      }
    } else {
      setWarning("Поле ввода не должно быть пустым!");
    }
  };

  const [inputValues, setInputValues] = useState({});
  // Функция для обновления состояния при изменении значения в input
  const handleInputChange = (modelId, size, value) => {
    setInputValues((prevValues) => ({
      ...prevValues,
      [modelId]: {
        ...prevValues[modelId],
        [size]: value,
      },
    }));
  };

  // Отображение размеров
  const handleNextClick = () => {
    setShowSizes(true);
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 1);
  };

  // Печать выбранных размеров
  const buttonPrint = async (e) => {
    document.querySelector(".modal-background-loader").style.display = "flex";

    const inputs = document.querySelectorAll(".SizeForArticleMainPrint");
    const filledInputs = [];
    const model = e.target.getAttribute("model");

    inputs.forEach((input) => {
      if (input.value) {
        filledInputs.push({
          size: input.placeholder,
          model: input.getAttribute("model"),
          value: input.value,
        });
        input.value = "";
      }
    });

    sendRequest(filledInputs);
    setInputValues([]);
  };

  // Получение кизов
  const sendRequest = async (inputData) => {
    try {
      console.log(selectedBrand);

      const response = await fetch(
        `http://${window.location.hostname}:6501/kyz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedBrand: selectedBrand.nameBrand,
            selectedModels: selectedModels,
            filledInputs: inputData,
            user: user,
            placePrint: document.querySelector(".placePrintValue").value,
            printerForHonestSign: document.querySelector(".printForHonestSign")
              .value,
            printerForBarcode: document.querySelector(".printForBarcode").value,
            // numberdelivery: numberdelivery,
          }),
        }
      );
      console.log("Статус ответа:", response.status);

      // Ответ с результатом запроса на печать честных знаков.
      if (!response.ok) {
        document.querySelector(".ErrorSection").classList.add("OnFlex");
        console.log("Ошиибка");
        throw new Error("Network response was not ok");
      }
      const result = await response.json();
      console.log(result);
      if (result.success) {
        // Открытие файла в новой вкладке
        console.log("Данные с сервера2:", result);
      } else {
        console.log("Ошибка при создании PDF");
      }
      console.log("Данные с сервера2:", result);

      setIsModalInfoOpen(true);
      setInfoPrintedSigns(result.data);
      setTimeout(() => {
        document.querySelector(".modal-background-loader").style.display =
          "none";
      }, 2000);
    } catch (error) {
      setTimeout(() => {
        console.log("Error: ", error);
        document.querySelector(".modal-background-loader").style.display =
          "none";
      }, 2000);
    }
  };
  // Фильтрация моделей
  const filteredModels =
    selectedBrand?.models.filter((model) =>
      model.name.toLowerCase().startsWith(query.toLowerCase())
    ) || [];
  return (
    <main>
      <form autoComplete="off">
        <Dialog open={!accessGranted} disableEscapeKeyDown>
          <DialogTitle>Введите пароль администратора</DialogTitle>
          <DialogContent>
            <input type="text" name="fakeuser" style={{ display: "none" }} />
            <input
              type="password"
              name="fakepass"
              style={{ display: "none" }}
            />

            <TextField
              autoComplete="off"
              autoFocus
              margin="dense"
              label="Пароль"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirm}>Войти</Button>
          </DialogActions>
        </Dialog>
      </form>

      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Введите номер упаковщика"
              style={inputStyle}
            />
            {/*
                            <input
                                type="number"
                                value={numberdelivery}
                                onChange={(e) => setNumberDelivery(e.target.value)}
                                placeholder="Введите номер поставки"
                                style={inputStyle}
                                className="placeHolderNumberDelivery"
                            />
                        */}
            {warning && <p style={{ color: "red" }}>{warning}</p>}
            <button
              onClick={handleLogin}
              style={buttonStyle}
              className="loginButton"
            >
              Войти
            </button>
          </div>
        </div>
      )}
      {/* Модуль вывода информации о печати честного знака */}
      <Modal
        isOpen={isModalInfoOpen}
        onClose={handleCloseModalInfo}
        info={isInfoPrintedSigns}
        type={"printedSigns"}
      />
      <h1>{user}</h1>
      {/* <h2>Номер поставки: {numberdelivery}</h2> */}
      <h2>Выберите бренд</h2>
      <div className="brand-select">
        {brands.map((brand) => (
          <button
            key={brand.nameBrand} // Используем nameBrand как уникальный ключ
            onClick={() => chooseBrand(brand.nameBrand)}
            className={
              selectedBrand?.nameBrand === brand.nameBrand ? "active-brand" : ""
            }
          >
            {brand.nameBrand}
          </button>
        ))}
        <button onClick={exitUser} className="exitUserButton">
          Выйти
        </button>
      </div>
      {selectedBrand && (
        <div>
          <h3 className="headerForChooseSizeArea">
            Выберите модели обуви из бренда {selectedBrand.brand}
          </h3>
          <input
            className="inputChooseModels"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите название модели..."
            style={{
              width: "400px",
              height: "50px",
              fontSize: "29px",
              padding: "20px",
              marginBottom: "40px",
            }}
          />
          <div className="Modelslist">
            {filteredModels
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((model) => (
                <div key={model.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`model-${model.id}`}
                    checked={selectedModels.includes(model.id)}
                    onChange={() => handleCheckboxChange(model.id)}
                  />
                  <label
                    htmlFor={`model-${model.id}`}
                    className="custom-checkbox"
                  >
                    {model.name}
                  </label>
                </div>
              ))}
          </div>
          {selectedModels.length > 0 && (
            <button onClick={handleNextClick} className="next-button">
              Далее
            </button>
          )}

          {showSizes && (
            <div>
              <h3
                style={{
                  marginTop: "50px",
                  marginBottom: "20px",
                }}
              >
                Доступные размеры для выбранных моделей
              </h3>
              {selectedModels.map((modelId) => {
                const model = selectedBrand.models.find(
                  (m) => m.id === modelId
                );
                return (
                  <div key={model.id} className="model-grid">
                    <h4 className="model-name">{model.name}</h4>
                    <ul className="size-list">
                      {model.sizes
                        .sort((a, b) => parseFloat(a) - parseFloat(b))
                        .map((size) => (
                          <div key={size} className="size-input">
                            {/* Показываем label с размером, если введено значение */}
                            {inputValues[modelId]?.[size] && (
                              <label className="size-label">{size}</label>
                            )}
                            <input
                              type="number"
                              className="size-item SizeForArticleMainPrint"
                              placeholder={size}
                              model={model.name}
                              value={inputValues[modelId]?.[size] || ""}
                              onChange={(e) =>
                                handleInputChange(modelId, size, e.target.value)
                              }
                            />
                          </div>
                        ))}
                    </ul>
                  </div>
                );
              })}
              <button onClick={buttonPrint} className="next-button">
                Печать
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "black",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContentStyle = {
  backgroundColor: "#fff",
  padding: "40px",
  borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
  textAlign: "center",
  flexDirection: "column",
  display: "flex",
};

const inputStyle = {
  width: "400px",
  height: "50px",
  fontSize: "25px",
  padding: "20px",
  marginBottom: "10px",
  textAlign: "center",
};

const buttonStyle = {
  width: "400px",
  height: "50px",
  backgroundColor: "#f0f0f0",
  marginBottom: "15px",
  border: "1px solid #ccc",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "30px",
};

export default SignDisplay;
