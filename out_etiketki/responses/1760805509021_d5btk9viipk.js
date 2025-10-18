URL: https://alfapiter.ru/assets/template/js/calculator.functions.plugin.js?v=104001102025
CT: text/javascript

const MATERIAL_WITH_CUTTER_LAM = 1.45;
const MATERIAL_WITH_CUTTER = 1.3;
const MATERIAL_WITHOUT_CUTTER = 1.2;
const CUTTER_COUNT_MIN = 100;
const PAPER_WIDTH_MAX = 440; // формат SRA3
const PAPER_LENGTH_MAX = 310; // формат SRA3
const PAPER_MARGIN = 4;
const LABELS_PRICE_MIN = 1000;
const MANUAL_CUTTER = 1.5;
const MANUAL_CUTTER_PRICE_MIN = 100;
const PRINT_DPI_HIGH = 1.25;
const PRINT_DPI_DEFAULT = 1;
const PRINT_AREA_MIN = 0.5;
const PREPARATION_LASER_MIN = 700;
const USD_30 = 30;
const VOLUME_PRICE_MIN = 2500;
const RESULT_PRICE_MIN = 1500;
const LASERCO2_ENGRAVE_PRICE_MIN = 1500;
const LASERCO2_CUTTING_PRICE_MIN = 1500;

// берём версию из глобальной переменной
const version = window.pluginVersion || Date.now();

// динамически импортируем модуль с версией
const { linear, numberWithSpaces, searchDataNames } =
    await import(`./calculator.default.plugin.js?${version}`);

let dataCalculation = {
    'dataPrintArea': '[name="dataPrintArea[]"]',
    'dataPrintPrice': '[name="dataPrintPrice[]"]',

    'dataCutterArea': '[name="dataCutterArea[]"]',
    'dataCutterPrice': '[name="dataCutterPrice[]"]',

    'dataLaminationArea': '[name="dataLaminationArea[]"]',
    'dataLaminationPrice': '[name="dataLaminationPrice[]"]',

    'dataLabelsArea': '[name="dataLabelsArea[]"]',
    'dataLabelsPrice': '[name="dataLabelsPrice[]"]',

    'dataVolumeArea': '[name="dataVolumeArea[]"]',
    'dataVolumePrice': '[name="dataVolumePrice[]"]',

    'dataLaserQty': '[name="dataLaserQty[]"]',
    'dataLaserPriceMetal': '[name="dataLaserPriceMetal[]"]',
    'dataLaserPriceLeather': '[name="dataLaserPriceLeather[]"]',
    'dataLaserPricePlastic': '[name="dataLaserPricePlastic[]"]',
    'dataLaserPriceGlass': '[name="dataLaserPriceGlass[]"]',

    'dataRollingArea': '[name="dataRollingArea[]"]',
    'dataRollingPrice': '[name="dataRollingPrice[]"]',

    'dataThermalQty': '[name="dataThermalArea[]"]',
    'dataThermalPrice': '[name="dataThermalPrice[]"]',

    'dataManualArea': '[name="dataManualArea[]"]',
    'dataManualPrice': '[name="dataManualPrice[]"]',
    
    'dataPreparationArea': '[name="dataPreparationArea[]"]',
    'dataPreparationPrice': '[name="dataPreparationPrice[]"]',
    
    'dataMountArea': '[name="dataMountArea[]"]',
    'dataMountPrice': '[name="dataMountPrice[]"]',
    
    'dataSelectionArea': '[name="dataSelectionArea[]"]',
    'dataSelectionPrice': '[name="dataSelectionPrice[]"]',
    
    'dataLaserCuttingArea': '[name="dataLaserCuttingArea[]"]',
    'dataLaserCuttingPrice': '[name="dataLaserCuttingPrice[]"]',
    
    'dataLaserEngravingArea': '[name="dataLaserEngravingArea[]"]',
    'dataLaserEngravingPrice': '[name="dataLaserEngravingPrice[]"]',
};


let calculation = {}; // добавляем объект "Расчет"
calculation.result = 0;

export function calculationMaterial(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};

    calculation.dataCutterArea = searchDataNames(dataCalculation.dataCutterArea); //[1,100];

    const selectMaterial = ".alcalc-material .radio.selected input" // выбор материала
    const infoMaterialInput = document.querySelector(selectMaterial);
    calculation.materialPrice = Number(infoMaterialInput?.value); // цена за ORAJET_3640 = 1.38 eur
    calculation.materialTitle = infoMaterialInput?.dataset.description; // название материала
    calculation.materialCurrency = infoMaterialInput?.dataset.currency; // валюта материала
    calculation.materialType = infoMaterialInput?.dataset.type; // тип материала
    calculation.materialCutting = infoMaterialInput?.dataset.cutting; // коэффициент резки
    calculation.materialEngraving = infoMaterialInput?.dataset.engraving; // коэффициент резки

    

    // проверяем валюту материала
    if (calculation.materialCurrency == 1) { // EUR
        calculation.materialPrintPrice = calculation.materialPrice * calculation.eur;
    } else if (calculation.materialCurrency == 2) { // USD
        calculation.materialPrintPrice = calculation.materialPrice * calculation.usd;
    } else {
        calculation.materialPrintPrice = calculation.materialPrice;
    }

    //calculation.materialPrintPrice = calculation.materialPrintPrice*1.2; // убрал 1.2 - хз что за коэффициент
    console.log('calculation.dataCutterArea', calculation.dataCutterArea);
    console.log('calculation.materialLam1Price', calculation.materialLam1Price);
    console.log('calculation.areaWD', calculation.areaWD);


    let materialArea = null;
    if (calculation.dataCutterArea?.length) {
        if (calculation.materialLam1Price) {
            materialArea = calculation.areaWD * MATERIAL_WITH_CUTTER_LAM; //1.45 - если печать с резкой и ламинацией
        } else {
            materialArea = calculation.areaWD * MATERIAL_WITH_CUTTER; //1.3 - если печать с резкой
        }
    } else {
        materialArea = calculation.areaWD * MATERIAL_WITHOUT_CUTTER; //1.2 - если без резки
    }


    if (!calculation.dataThermalQty?.length||!calculation.dataLaserCuttingArea?.length||!calculation.dataLaserEngravingArea?.length) { // проверяем страницу термотрансфер и отключаем минималку для нее
        if (materialArea <= 0.5) {
            materialArea = 0.5;
        }
    }


    calculation.materialArea = materialArea;
    calculation.countMaterialPrint = calculation.materialArea * calculation.materialPrintPrice;
    calculation.countMaterialPerM = calculation.countMaterialPrint / calculation.area;
    console.log('calculation.materialArea', calculation.materialArea);
    console.log('calculation.countMaterialPrint', calculation.countMaterialPrint);
    console.log('calculation.materialPrintPrice', calculation.materialPrintPrice);

    document.querySelector(".alcalc-form-material").value = calculation.materialTitle ?? '';

    if (calculation.countMaterialPrint) {
        calculation.result += calculation.countMaterialPrint;
        console.log(calculation.countMaterialPrint, "countMaterialPrint расчет стоимости материала для печати");
    }
}

// считаем стоимость аксессуаров
export function calculationAccessories(calculationDefault) {
    // Расширяем calculation
    calculation = { ...calculation, ...calculationDefault };

    const selectAccessory = ".alcalc-accessories .radio.selected input";
    const infoAccessoryInput = document.querySelector(selectAccessory);

    // Инициализация полей
    calculation.accessoryPrice      = 0;
    calculation.accessoryTitle      = '';
    calculation.accessoryCurrency   = 0;
    calculation.accessoryUnitPrice  = 0;
    calculation.accessoryQtyPerItem = 0;
    calculation.accessoryTotalQty   = 0;
    calculation.countAccessories    = 0;

    if (!infoAccessoryInput) return;

    calculation.accessoryPrice    = Number(infoAccessoryInput.value) || 0;
    
    if (infoAccessoryInput) {
        const labelText = infoAccessoryInput.closest("label")?.querySelector(".radio-button-label")?.innerText.trim() || '';
        console.log("Название аксессуара:", labelText);
        calculation.accessoryShortTitle = labelText;
    }
    

    calculation.accessoryTitle    = infoAccessoryInput.dataset.description || '';
    calculation.accessoryCurrency = Number(infoAccessoryInput.dataset.currency || 3); // дефолтная валюта

    // Конвертация валюты
    if (calculation.accessoryCurrency === 1) {
        calculation.accessoryUnitPrice = calculation.accessoryPrice * calculation.eur;
    } else if (calculation.accessoryCurrency === 2) {
        calculation.accessoryUnitPrice = calculation.accessoryPrice * calculation.usd;
    } else {
        calculation.accessoryUnitPrice = calculation.accessoryPrice;
    }

    // Количество на изделие
    if (infoAccessoryInput.dataset.hasQuantity === "true") {
        const qtyInput = document.querySelector('input[name="accessory_qty"]');
        let val = Number(qtyInput?.value) || 1;

        const min  = Number(infoAccessoryInput.dataset.min)  || 1;
        const step = Number(infoAccessoryInput.dataset.step) || 1;

        if (val < min) val = min;
        if (step > 1) val = Math.ceil(val / step) * step;

        calculation.accessoryQtyPerItem = val;
    } else {
        calculation.accessoryQtyPerItem = calculation.accessoryUnitPrice > 0 ? 1 : 0;
    }

    // Общий тираж — totalCirculation из calculationDefault
    const totalRun = Number(calculation.totalCirculation) || 1;

    calculation.accessoryTotalQty = calculation.accessoryQtyPerItem * totalRun;
    calculation.countAccessories   = calculation.accessoryTotalQty * calculation.accessoryUnitPrice;

    // Сохраняем для формы
    const formAcc = document.querySelector(".alcalc-form-accessories");
    if (formAcc) formAcc.value = calculation.accessoryTitle ?? '';

    // Добавляем в общий результат
    if (calculation.countAccessories) {
        calculation.result += calculation.countAccessories;
        console.log(calculation.countAccessories, "countAccessories расчет стоимости аксессуаров");
    }

    // Отладка
    console.log('calculation.accessoryUnitPrice', calculation.accessoryUnitPrice);
    console.log('calculation.accessoryQtyPerItem', calculation.accessoryQtyPerItem);
    console.log('calculation.accessoryTotalQty', calculation.accessoryTotalQty);
    console.log('totalCirculation', totalRun);
}

// сложность контура
export function calculationCutter(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};

    const selectCutter = '.alcalc-cutter.selected input'; // выбор сложности резки

    // данные по плоттерной резке
    calculation.dataCutterArea = searchDataNames(dataCalculation.dataCutterArea); //[1,100];
    calculation.dataCutterPrice = searchDataNames(dataCalculation.dataCutterPrice); //[200,100];

    calculation.cutter = document.querySelector(selectCutter)?.value;

    // Берем коэффициент сложности плоттерной резки
    if (calculation.cutter == 1) {
        calculation.cutterTitle = "Простой";
    } else {
        calculation.cutterTitle = "Сложный";
    }


    let cutterPrice = linear(calculation.area, calculation.dataCutterArea, calculation.dataCutterPrice);

    calculation.cutterPrice = cutterPrice * calculation.usd;
    let countCutter = calculation.cutterPrice * calculation.cutter;

    if (countCutter < CUTTER_COUNT_MIN) {
        countCutter = CUTTER_COUNT_MIN;
    }

    if (calculation.materialLam1Price) { // добавляем расчет для ламинации
        countCutter += Math.ceil(calculation.areaWD / 0.5) * 50;
    }
    calculation.countCutter = countCutter;

    if (calculation.countCutter) {
        calculation.result += calculation.countCutter;
        console.log(calculation.countCutter, "countServiceCutter расчет стоимости плоттерной резки");
    }
    document.querySelector(".alcalc-form-cutter").value = calculation.cutter ?? '';
}

export function countServiceLabels(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};

    let maxPaperWidth = PAPER_WIDTH_MAX;
    let maxPaperLength = PAPER_LENGTH_MAX;
    let marginPaper = PAPER_MARGIN; // 4 мм Отступ между наклейками
    let pageArea = maxPaperWidth / 1000 * maxPaperLength / 1000;
    let countPaperS;
    let countPaperR;
    calculation.maxPaperWidth = maxPaperWidth;
    calculation.maxPaperLength = maxPaperLength;

    // Проверяем количество наклеек при обычном расположении
    if (calculation.width <= maxPaperWidth) {
        if (calculation.length <= maxPaperLength) {
            let countPaperSWidth = Math.floor((maxPaperWidth + marginPaper) / (calculation.width + marginPaper));
            let countPaperSLength = Math.floor((maxPaperLength + marginPaper) / (calculation.length + marginPaper));
            countPaperS = countPaperSWidth * countPaperSLength;
        } else {
            // пытаемся развернуть наклейку
            if (calculation.length <= maxPaperWidth) {
                if (calculation.width <= maxPaperLength) {
                    let countPaperRWidth = Math.floor((maxPaperLength + marginPaper) / (calculation.width + marginPaper));
                    let countPaperRLength = Math.floor((maxPaperWidth + marginPaper) / (calculation.length + marginPaper));
                    countPaperR = countPaperRWidth * countPaperRLength;
                    countPaperS = 0;
                } else {
                    countPaperS = 0;
                    // Ошибка задайте меньше width
                }
            } else {
                countPaperS = 0;
                // Ошибка задайте меньше length
            }
        }
    } else {
        countPaperS = 0;
        // Ошибка задайте меньше width
    }
    
    // Проверяем количество наклеек при повернутом расположении
    if (calculation.width <= maxPaperLength) {
        if (calculation.length <= maxPaperWidth) {
            let countPaperRWidth = Math.floor((maxPaperLength + marginPaper) / (calculation.width + marginPaper));
            let countPaperRLength = Math.floor((maxPaperWidth + marginPaper) / (calculation.length + marginPaper));
            countPaperR = countPaperRWidth * countPaperRLength;
        } else {
            countPaperR = 0;
            // Ошибка задайте меньше length
        }
    } else {
        countPaperR = 0;
        // Ошибка задайте меньше width
    }
    
    let countPaper;
    if (countPaperS >= countPaperR) {
        countPaper = countPaperS;
    } else {
        countPaper = countPaperR;
    }
    calculation.countPaperS = countPaperS;
    calculation.countPaperR = countPaperR;
    calculation.countPaper = countPaper;

    let pages = Math.ceil(calculation.circulation*calculation.types / countPaper);
    calculation.pages = pages;
    console.log("Всего страниц = " + pages);
    let allPagesArea = pageArea * calculation.pages;
    console.log("Площадь всех страниц  = " + allPagesArea);

    calculation.allPagesArea = allPagesArea;
    calculation.dataCutterArea = searchDataNames(dataCalculation.dataCutterArea); //[1,100];
    calculation.dataCutterPrice = searchDataNames(dataCalculation.dataCutterPrice); //[200,100];
    let cutterPagesPrice = linear(allPagesArea, calculation.dataCutterArea, calculation.dataCutterPrice) * calculation.usd * calculation.cutter;

    console.log("Количество при обычном расположении = " + calculation.countPaperS);
    console.log("Количество при повернутом расположении = " + calculation.countPaperR);
    console.log("Количество которое считаем = " + calculation.countPaper);

    calculation.cutterPagesPrice = cutterPagesPrice;
    let materialPages = calculation.materialPrice * calculation.pages;
    console.log("calculation.materialPrice = " + calculation.materialPrice);
    console.log("materialPages = " + materialPages);
    calculation.materialPages = materialPages;

    // данные по печати этикеток
    calculation.dataLabelsArea = searchDataNames(dataCalculation.dataLabelsArea);
    calculation.dataLabelsPrice = searchDataNames(dataCalculation.dataLabelsPrice);

    calculation.labelsPrice = linear(calculation.pages, calculation.dataLabelsArea, calculation.dataLabelsPrice);
    console.log("calculation.labelsPrice = " + calculation.labelsPrice);

    calculation.countLabels = calculation.labelsPrice + calculation.materialPages + calculation.cutterPagesPrice;
    console.log("calculation.countLabels = " + calculation.countLabels);


    // добавляем значения в форму отправки
    document.querySelector(".alcalc-form-labels-pages").value = calculation.pages ?? '';

    calculation.resultLabels = 0; // результат расчета для бумажных этикеток
    if (calculation.countLabels) {
        calculation.resultLabels += calculation.countLabels;
        console.log(calculation.countLabels, "countServiceLabels расчет стоимости бумажных наклеек (включен материал и резка)");


        if (calculation.resultLabels <= LABELS_PRICE_MIN) {
            calculation.resultLabels = LABELS_PRICE_MIN;
            // document.querySelector(".alcalc-min-result").style = 'block';
            document.querySelector(".alcalc-result").classList.add("minimum");
        }
    }
    console.log("calculation.countLabels = ", calculation.countLabels);
}

export function calculationManual(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};
    calculation.dataManualArea = searchDataNames(dataCalculation.dataManualArea); //[1,100];
    calculation.dataManualPrice = searchDataNames(dataCalculation.dataManualPrice); //[200,100];

    const selectManual = document.querySelector('#alcalc-manual'); // выбор поштучной резки
    if (selectManual?.checked) {
        calculation.manual = 1;
    }

    if (selectManual?.checked) { // проверяем поштучную резку

        let manualPrice = linear(calculation.perimeter, calculation.dataManualArea, calculation.dataManualPrice);
        calculation.manualPrice = manualPrice;// считаем в рублях * calculation.usd;
        calculation.countManual = manualPrice;
    } else {
        calculation.countManual = "";
    }

    // Добавляем значение в форму отправки
    document.querySelector(".alcalc-form-manual").value = calculation.manual ?? '';

    if (calculation.countManual) {
        calculation.result += calculation.countManual;
        console.log(calculation.countManual, "countManualCutting расчет стоимости поштучной резки");
    }
}

export function calculationPerPiece(calculationDefault) {
    // 1. Перенос объемных наклеек
    // Стоимость приклеивания объемной наклейки на стикерпак
    // Тираж, Стоимость за штуку
    //[10,10][500,5]
    
    // 2. Поштучная упаковка
    const selectPiecepack = document.querySelector('#alcalc-piecepack'); // выбор поштучной упаковки
    if (selectPiecepack?.checked) {
        calculation.piecepack = 1.15;
        calculation.countPerPiece = calculation.result * (calculation.piecepack - 1);
        console.log(calculation.countPerPiece,"calculation.countPerPiece стоимость поштучной упаковки");
        calculation.result *= calculation.piecepack;
    } else {
        calculation.countPerPiece = 0;
        calculation.piecepack = 1;
    }
}

export function calculationVariable(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};

    const selectVariable = document.querySelector('#alcalc-variable'); // выбор переменные данные
    if (selectVariable?.checked) {
        calculation.variable = 1;
    }

    if (selectVariable?.checked) { // проверяем переменные данные
        calculation.countVariable = 2500;
    } else {
        calculation.countVariable = "";
    }

    // Добавляем значение в форму отправки
    document.querySelector(".alcalc-form-variable").value = calculation.variable ?? '';

    if (calculation.countVariable) {
        calculation.result += calculation.countVariable;
        console.log(calculation.countVariable, "countVariable расчет стоимости переменных данных");
    }
}

export function calculationAngle(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};

    const checkAngle = document.querySelector('#alcalc-angle'); // сложный контур для объемной печати

    if (checkAngle) {
        if (checkAngle?.checked) {
            calculation.angle = 1.5;
            calculation.angleTitle = 'Сложный';
        } else {
            calculation.angle = 1;
            calculation.angleTitle = 'Простой';
        }

        // устанавливаем принудительно сложность контура для объемных наклеек, если одна сторона <20мм
        if (calculation.width < 20 || calculation.length < 20) {
            calculation.angle = 1.5;
            calculation.angleTitle = 'Сложный (одна сторона <20мм)';
        }
    }

    document.querySelector(".alcalc-form-angle").value = calculation.angle ?? '';
}

export function calculationPrint(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};

    // данные по
    calculation.dataPrintArea = searchDataNames(dataCalculation.dataPrintArea); //[10,50,100,150];
    calculation.dataPrintPrice = searchDataNames(dataCalculation.dataPrintPrice); //[400,300,200,150];

    const selectDPI = document.querySelector('#alcalc-dpi'); // выбор DPI для печати
    
    let selectMaterial = ".alcalc-material .radio.selected input" // выбор материала
    let infoMaterialInput = document.querySelector(selectMaterial);
    calculation.materialType = infoMaterialInput?.dataset.type; // тип материала

    calculation.print = selectDPI?.value; // Берем DPI для печати

    if (selectDPI?.checked) {
        calculation.print = PRINT_DPI_HIGH;
        calculation.printTitle = 'Высокое';
    } else {
        calculation.print = PRINT_DPI_DEFAULT;
        calculation.printTitle = 'Обычное';
    }

    document.querySelector(".alcalc-form-dpi").value = calculation.print ?? '';

    let printPrice
    const switchPrint = document.querySelector('#alcalc-print'); // без печати
    console.log("Это тип материала",calculation.materialType);

    if (switchPrint?.checked||calculation.materialType == "thc") {
        calculation.countPrint = 0;
        calculation.countPrintPerM = 0;
        console.log('Считаем без печати');
    } else {
        printPrice = linear(calculation.area, calculation.dataPrintArea, calculation.dataPrintPrice);
        calculation.printPrice = printPrice * calculation.usd;
        calculation.countPrint = calculation.printPrice * calculation.print;

        // задел на расчет со скидкой
        if (calculation.discount) {
            calculation.countPrintDiscount = calculation.countPrint - calculation.countPrint * calculation.discount / 100;
        }

        if (calculation.area <= PRINT_AREA_MIN) {
            calculation.countPrintPerM = "min " + Math.ceil(calculation.countPrint);
        } else {
            calculation.countPrintPerM = Math.ceil(calculation.countPrint / calculation.area);
        }
        console.log('Считаем с печатью');
    }

    if (calculation.countPrint) {
        calculation.result += calculation.countPrint;
        console.log(calculation.countPrint, "countServicePrint расчет стоимости печати");
    }
}

export function calculationLamination(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};

    const selectLamination1 = '.alcalc-lamination-1 .radio.selected input'; // ламинация базовая
    const selectLamination2 = '.alcalc-lamination-2 .radio.selected input'; // ламинация 2


    // данные по ламинации
    calculation.dataLaminationArea = searchDataNames(dataCalculation.dataLaminationArea);
    calculation.dataLaminationPrice = searchDataNames(dataCalculation.dataLaminationPrice);

    // проверяем включена ли ламинация
    let infoLaminationInput = document.querySelector(selectLamination1);

    if (infoLaminationInput) {
        calculation.materialLam1Price = infoLaminationInput.value; // цена за ORAJET_3640 = 1.38 eur
        calculation.materialLam1Title = infoLaminationInput.dataset.description; // название материала
        calculation.materialLam1Currency = infoLaminationInput.dataset.currency; // валюта материала
    }

    // проверяем включена ли дополнительная ламинация
    let infoLaminationInput2 = document.querySelector(selectLamination2);
    if (infoLaminationInput2) {
        calculation.materialLam2Price = infoLaminationInput2.value; // цена за ORAJET_3640 = 1.38 eur
        calculation.materialLam2Title = infoLaminationInput2.dataset.description; // название материала
        calculation.materialLam2Currency = infoLaminationInput2.dataset.currency; // валюта материала
    }
    console.log('calculation.materialLam2Price', calculation.materialLam2Price)

    // считаем материал для ламинации
    let materialLam1Area

    // проверяем валюту материала
    if (calculation.materialLam1Currency == 1) { // EUR
        calculation.materialLam1Price = calculation.materialLam1Price * calculation.eur;
    } else if (calculation.materialLam1Currency == 2) { // USD
        calculation.materialLam1Price = calculation.materialLam1Price * calculation.usd;
    }
    calculation.dataCutterArea = searchDataNames(dataCalculation.dataCutterArea); //[1,100];
    calculation.dataPrintArea = searchDataNames(dataCalculation.dataPrintArea); //[10,50,100,150];

    calculation.materialLam1Price = calculation.materialLam1Price * 1.2; // 1.2 - хз что за коэффициент
    if (calculation.dataCutterArea.length && calculation.dataPrintArea.length) {
        materialLam1Area = calculation.areaWD * MATERIAL_WITH_CUTTER_LAM + 1.5; // 1.45 - если печать с резкой
    } else {
        materialLam1Area = calculation.areaWD * MATERIAL_WITH_CUTTER + 1.5; //1.3 - если без резки
    }
    if (materialLam1Area <= 0.5) {
        materialLam1Area = 2;
    }
    calculation.materialLam1Area = materialLam1Area;
    calculation.countMaterialLam1 = calculation.materialLam1Area * calculation.materialLam1Price;
    calculation.countMaterialLam1PerM = calculation.countMaterialLam1 / calculation.area;
    console.log("calculation.materialLam1Area ", calculation.materialLam1Area);
    console.log("calculation.countMaterialLam1 ", calculation.countMaterialLam1);

    // считаем стоимость ламинации
    let laminationPrice = linear(calculation.areaWD, calculation.dataLaminationArea, calculation.dataLaminationPrice);
    calculation.laminationPrice = laminationPrice * calculation.usd;
    calculation.countLamination = calculation.laminationPrice;


    // считаем материал для второй ламинации
    if (calculation.materialLam2Price) {
        let materialLam2Area;
        if (calculation.materialLam2Currency == 1) { // EUR
            calculation.materialLam2Price = calculation.materialLam2Price * calculation.eur;
        } else if (calculation.materialLam2Currency == 2) { // USD
            calculation.materialLam2Price = calculation.materialLam2Price * calculation.usd;
        }

        calculation.materialLam2Price = calculation.materialLam2Price * 1.2; // 1.2 - хз что за коэффициент

        if (calculation.dataCutterArea.length && calculation.dataPrintArea.length) {
            materialLam2Area = calculation.areaWD * MATERIAL_WITH_CUTTER_LAM + 1.5; //1.45 - если печать с резкой
        } else {
            materialLam2Area = calculation.areaWD * MATERIAL_WITH_CUTTER + 1.5; //1.3 - если без резки
        }
        if (materialLam2Area <= 0.5) {
            materialLam2Area = 2;
        }

        calculation.materialLam2Area = materialLam2Area;
        calculation.countMaterialLam2 = calculation.materialLam2Area * calculation.materialLam2Price;
        calculation.countMaterialLam2PerM = calculation.countMaterialLam2 / calculation.area;
    }

    // добавляем значения в форму отправки
    document.querySelector(".alcalc-form-material-lamination-1").value = calculation.materialLam1Title ?? '';

    if (calculation.materialLam1Price) {
        calculation.result += calculation.countLamination + calculation.countMaterialLam1;
        console.log(calculation.countLamination, "countServiceLamination расчет стоимости ламинации");
        console.log(calculation.countMaterialLam1, "countMaterialLamination расчет стоимости материала для ламинации");
        if (calculation.materialLam2Price) {
            calculation.result += calculation.countLamination + calculation.countMaterialLam2;
            console.log(calculation.countLamination, "countServiceLamination2 расчет стоимости ламинации");
            console.log(calculation.countMaterialLam2, "countMaterialLamination2 расчет стоимости материала для ламинации");
        }
    }
}


export function countPreparation(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};
    calculation.dataPreparationArea = searchDataNames(dataCalculation.dataPreparationArea); //[1,100];
    calculation.dataPreparationPrice = searchDataNames(dataCalculation.dataPreparationPrice); //[200,100];
    let preparationLayouts = linear(calculation.types, calculation.dataPreparationArea, calculation.dataPreparationPrice);

    //let preparationLayouts;

    // Добавить данные в таблицу и переписать на linear
    /*
    if (calculation.types < 20) {
        preparationLayouts = -50 / 19 * (calculation.types - 1) + 100;
    } else if (calculation.types < 100) {
        preparationLayouts = -0.25 * (calculation.types - 20) + 50;
    } else {
        preparationLayouts = 30;
    }*/
    calculation.countPreparation = preparationLayouts; // возможно округление стоит добавить сюда Math.round(

    if (calculation.materialLaser) {
        calculation.countPreparation = PREPARATION_LASER_MIN;
    }

    // заготовка для скидки
    if (calculation.discount) {
        calculation.countPreparationDiscount = calculation.countPreparation - calculation.countPreparation * calculation.discount / 100;
    }

    if (calculation.countPreparation) {
        calculation.result += calculation.countPreparation;
        console.log(calculation.countPreparation, "countPreparation расчет стоимости подготовки макета");
    }
}

export function countMount(calculationDefault) { // считаем монтажку и перенос на неё

    calculation = {...calculation, ...calculationDefault};
    calculation.dataMountArea = searchDataNames(dataCalculation.dataMountArea); //[1,100];
    calculation.dataMountPrice = searchDataNames(dataCalculation.dataMountPrice); //[200,100];
    
    const selectMount = document.querySelector('#alcalc-mount'); // выбор перенос на монтажку
    if (selectMount?.checked) {
        calculation.mount = 1;
    }

    if (selectMount?.checked) { // проверяем поштучную резку
        let mountprice = linear(calculation.areaWD, calculation.dataMountArea, calculation.dataMountPrice);
        calculation.mountprice = mountprice * calculation.usd / USD_30;
        
        // Данные брать из таблицы материалов
        let mountMaterial = 101.1; // МОНТАЖКА_Oratape_MT95
        calculation.countMountMaterial = mountMaterial * calculation.areaWD * 1.15;
        calculation.countMount = calculation.mountprice;
    } else {
        calculation.countMountMaterial = "";
        calculation.countMount = "";
    }

    // Добавляем значение в форму отправки
    document.querySelector(".alcalc-form-mount").value = calculation.mount ?? '';

    if (calculation.countMount) {
        calculation.result += calculation.countMount + calculation.countMountMaterial;
        console.log(calculation.countMount, "countMount расчет стоимости монтажки");
        console.log(calculation.countMountMaterial, "countMountMaterial расчет стоимости материала монтажки");
    }
}

export function countSelection(calculationDefault) { // считаем выборку
    calculation = {...calculation, ...calculationDefault};
    const selectCutter = '.alcalc-cutter.selected input'; // выбор сложности резки
    calculation.dataSelectionArea = searchDataNames(dataCalculation.dataSelectionArea); //[1,100];
    calculation.dataSelectionPrice = searchDataNames(dataCalculation.dataSelectionPrice); //[200,100];
   
    if (calculation.area) { // проверяем есть ли площадь
        let selectionPrice = linear(calculation.area, calculation.dataSelectionArea, calculation.dataSelectionPrice);
        calculation.cutter = document.querySelector(selectCutter)?.value;
        let selection = 1;
        // Берем коэффициент сложности плоттерной резки
        if (calculation.cutter == 1.5) {
            selection = 2; // коэффициент
            if (calculation.width<=20 || calculation.length<=20) {
                selection = 4; // для сложной выборки меньше 20 мм
            }
        } else if (calculation.cutter == 0) { // без резки
            selection = 0;
        }
        if (calculation.countMount) {
            calculation.selectionPrice = selectionPrice * calculation.usd / USD_30;
            calculation.countSelection = calculation.selectionPrice * calculation.area / calculation.area + calculation.selectionPrice * calculation.area / calculation.area * (1 / (calculation.width / 1000 * calculation.length / 1000) / 1000);
            calculation.countSelection *= selection;
            if (calculation.countSelection < 100) {
                calculation.countSelection = 100;
            }
        } else {
            calculation.countSelection = "";
        }
        
        if (calculation.countSelection) { // считаем выборку
            calculation.result += calculation.countSelection;
            console.log(calculation.countSelection, "countSelection расчет стоимости выборки");
        }
    }
}

export function countServiceVolume(calculationDefault) {
    calculation = { ...calculation, ...calculationDefault };
    calculation.dataVolumeArea = searchDataNames(dataCalculation.dataVolumeArea);
    calculation.dataVolumePrice = searchDataNames(dataCalculation.dataVolumePrice);

    calculation.volume = 1; // коэффициент для объемных наклеек

    let totalCountVolume = 0;

    // перебор всех блоков (каждый размер)
    if (Array.isArray(calculation.sizes)) {
        calculation.sizes.forEach(size => {
            // Берем volumeArea для блока (с учетом запасных наклеек)
            const blockVolumePrice = linear(size.volumeArea, calculation.dataVolumeArea, calculation.dataVolumePrice);
            const blockPriceRub = blockVolumePrice * calculation.usd;
            console.log("size.volumeArea",calculation.volumeArea);
            console.log("size.angle",size.angle);
            // теперь используем индивидуальный угол для блока
            const blockCountVolume = blockPriceRub * calculation.volume * size.angle;

            totalCountVolume += blockCountVolume;
        });
    }

    calculation.countVolume = totalCountVolume;

    // добавляем в общий результат
    calculation.result += calculation.countVolume;

    // минимальная стоимость
    if (calculation.result <= VOLUME_PRICE_MIN) {
        calculation.result = VOLUME_PRICE_MIN;
        document.querySelector(".calculator-result_digit")?.classList.add("minimum");
    }
}

export function countMaterialLaser(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};
    const selectMaterialLaser = '.alcalc-material-laser .radio.selected input'; // ламинация базовая
    const selectMaterialLaserCO2 = 'alcalc-material-co2'; // выбор материала для лазерной резки у материала две цены, сам материал и стоимость резки data-laser-price
    const selectCO2Width = '#alcalc-laser-width'; // длина лазерного реза
    const selectWidthCO2 = '#alcalc-width-co2'; // поле для ввода ширины материала для резки
    const selectLengthCO2 = '#alcalc-length-co2'; // поле для ввода длины материала для резки
    const checkCO2material = document.querySelector('#alcalc-laser-material-switch'); // чекбокс выбора нашего материала для резки лазером
    let infoMaterialLaserInput = document.querySelector(selectMaterialLaser);
    let infoMaterialLaserCO2Input = document.querySelector(selectMaterialLaserCO2);
    let infoCO2WidthInput = document.querySelector(selectCO2Width);
    let infoWidthCO2Input = document.querySelector(selectWidthCO2);
    let infoLengthCO2Input = document.querySelector(selectLengthCO2);


    if (infoMaterialLaserInput) {
        calculation.materialLaser = infoMaterialLaserInput.value;
    }

// проверяем есть ли материал для лазерной резки
    if (infoMaterialLaserCO2Input) {
        calculation.laserCO2Width = Number(infoCO2WidthInput?.value); // записываем значение из поля длина в п.м.
        calculation.materialCO2 = infoMaterialLaserCO2Input?.value;
        calculation.materialCO2Title = infoMaterialLaserCO2Input?.value?.dataset.description; // название материала
        calculation.materialCO2Currency = infoMaterialLaserCO2Input?.value?.dataset.currency; // валюта материала
        calculation.laserCO2Price = infoMaterialLaserCO2Input?.value?.dataset.laserPrice; // стоимость реза материала
        calculation.laserCO2Currency = infoMaterialLaserCO2Input?.value?.dataset.laserCurrency; // валюта цены реза
    }

    // проверяем выбран ли наш материал для резки лазером
    if (checkCO2material?.length) {
        if (checkCO2material?.checked) {
            calculation.widthCO2 = Number(infoWidthCO2Input?.value); // записываем значение из поля ШИРИНА и делаем тип число
            calculation.lengthCO2 = Number(infoLengthCO2Input?.value); // записываем значение из поля ДЛИНА и делаем тип число
            calculation.areaCO2 = calculation.widthCO2 / 1000 * calculation.lengthCO2 / 1000; // площадь материала
        }
    }

    let dataLaserPrice = {
        metal: [], leather: [], plastic: [], glass: [],
    };

    calculation.dataLaserQty = searchDataNames(dataCalculation.dataLaserQty);
    dataLaserPrice.metal = searchDataNames(dataCalculation.dataLaserPriceMetal);
    dataLaserPrice.leather = searchDataNames(dataCalculation.dataLaserPriceLeather);
    dataLaserPrice.plastic = searchDataNames(dataCalculation.dataLaserPricePlastic);
    dataLaserPrice.glass = searchDataNames(dataCalculation.dataLaserPriceGlass);

    calculation.dataLaserPrice = {...dataLaserPrice}


    if (calculation.materialLaser) {
        const total = calculation.circulation * calculation.types;
        let name = calculation.materialLaser;
        let laserPrice = linear(total, calculation.dataLaserQty, calculation.dataLaserPrice[name]) / total;
        console.log("laserPrice", laserPrice);

        let laserWidth;
        if (calculation.width < 10) {
            laserWidth = 10;
        } else {
            laserWidth = calculation.width;
        }

        let laserLength;
        if (calculation.length < 10) {
            laserLength = 10;
        } else {
            laserLength = calculation.length;
        }
        const oneArea = laserWidth / 10 * laserLength / 10;
        if (oneArea > 10) {
            laserPrice = parseInt(laserPrice) + 1;
        }
        calculation.laserPrice = laserPrice;
        const laserArea = laserWidth / 1000 * laserLength / 1000 * calculation.totalCirculation;
        console.log("laserArea", laserArea);
        const countLaser = calculation.laserPrice * laserArea * 10000;

        const selectCylinder = document.querySelector('#alcalc-laser-cylinder'); // выбор DPI для печати


        if (selectCylinder?.checked) { // проверяем нанесение на цилиндр
            calculation.countLaser = countLaser * 2;
        } else {
            calculation.countLaser = countLaser;
        }

    }

    let CO2Material = 0;
    let laserCO2Price;
    if (calculation.laserCO2Currency == 1) { // EUR
        laserCO2Price = calculation.laserCO2Price * calculation.eur;
    } else if (calculation.laserCO2Currency == 2) { // USD
        laserCO2Price = calculation.laserCO2Price * calculation.usd;
    } else {
        laserCO2Price = calculation.laserCO2Price;
    }

    const CO2Price = calculation.laserCO2Width * laserCO2Price;
    let laserCO2Material;
    if (checkCO2material?.checked) { // проверяем какой выбран ли наш материал
        if (calculation.materialCO2Currency == 1) { // EUR
            laserCO2Material = calculation.materialCO2 * calculation.eur;
        } else if (calculation.materialCO2Currency == 2) { // USD
            laserCO2Material = calculation.materialCO2 * calculation.usd;
        } else {
            laserCO2Material = calculation.materialCO2;
        }
        CO2Material = laserCO2Material * calculation.areaCO2;
    }
    calculation.countLaserCO2 = CO2Price + CO2Material;
    if (calculation.countLaser) { // считаем гравировку
        calculation.result += calculation.countLaser;
        console.log(calculation.countLaser, "countLaser расчет стоимости гравировки");
    }
    if (calculation.countLaserCO2) { // считаем гравировку
        calculation.result += calculation.countLaserCO2;
        console.log(calculation.countLaserCO2, "countLaserCO2 расчет стоимости лазерной резки");
    }
}

// считаем материал для основы лазерной рзеки/гравировки CO2
export function countMaterialLaserCO2(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};
}

// считаем стоимость гравировки CO2
export function countServiceLaserCO2Engrave(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};
    
    const isLaserEngravingChecked = document.querySelector('input[name="alcalc-laser-engraving"]')?.checked || false;
    if (isLaserEngravingChecked) {
        console.warn("Галочка лазерной гравировки выбрана");
    } else {
        calculation.countLaserCO2Engrave = "";
        console.warn("Галочка лазерной гравировки НЕ выбрана");
        return;
    }
    
    // Проверяем, есть ли длина реза и она больше нуля
    if (!calculation.laserCO2engraveArea || calculation.laserCO2engraveArea <= 0) {
        console.warn("countServiceLaserCO2Engrave: laserCO2engraveArea not set or zero");
        return;
    }
    console.log(calculation.laserCO2engraveArea,"calculation.laserCO2engraveArea площадь гравировки");
    calculation.dataLaserCO2EngraveArea = searchDataNames(dataCalculation.dataLaserEngravingArea);
    calculation.dataLaserCO2EngravePrice = searchDataNames(dataCalculation.dataLaserEngravingPrice); 
    const total = calculation.circulation * calculation.types;
    const laserCO2EngravePrice = linear(total, calculation.dataLaserCO2EngraveArea, calculation.dataLaserCO2EngravePrice);
    console.log(laserCO2EngravePrice,"laserCO2EngravePrice цена за см кв");
    console.log(total,"total тираж");
    calculation.laserCO2EngravePrice = laserCO2EngravePrice/total;
    
    console.log("calculation.laserCO2EngravePrice ",calculation.laserCO2EngravePrice,"calculation.laserCO2engraveArea ",calculation.laserCO2engraveArea);
    const countLaserCO2Engrave = calculation.laserCO2EngravePrice * calculation.laserCO2engraveArea;

    calculation.countLaserCO2Engrave = countLaserCO2Engrave * calculation.materialEngraving;

    calculation.result += calculation.countLaserCO2Engrave;

    if (calculation.result <= LASERCO2_ENGRAVE_PRICE_MIN) {
        calculation.result = LASERCO2_ENGRAVE_PRICE_MIN;
        document.querySelector(".calculator-result_digit")?.classList.add("minimum");
    }
    console.log(calculation.countLaserCO2Engrave, "countLaserCO2Engrave расчет стоимости лазерной гравировки CO2");
    console.log(calculation.materialEngraving, "calculation.materialEngraving коэффициент гравировки");
}

// считаем стоимость резки CO2
export function countServiceLaserCO2Cutting(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};
    
    const isLaserCutChecked = document.querySelector('input[name="alcalc-laser-cut"]')?.checked || false;
    if (isLaserCutChecked) {
        console.warn("Галочка лазерной резки выбрана");
    } else {
        calculation.countLaserCO2Cutting = "";
        console.warn("Галочка лазерной резки НЕ выбрана");
        return;
    }
    
    // Проверяем, есть ли длина реза и она больше нуля
    if (!calculation.laserCO2cuttingLength || calculation.laserCO2cuttingLength <= 0) {
        console.warn("countServiceLaserCO2Cutting: laserCO2cuttingLength not set or zero");
        return;
    }
    
    calculation.dataLaserCO2CuttingArea = searchDataNames(dataCalculation.dataLaserCuttingArea);
    calculation.dataLaserCO2CuttingPrice = searchDataNames(dataCalculation.dataLaserCuttingPrice);
    const totalLength = calculation.circulation * calculation.types * calculation.laserCO2cuttingLength;
    calculation.totalLength = totalLength;
    const laserCO2CuttingPrice = linear(calculation.totalLength, calculation.dataLaserCO2CuttingArea, calculation.dataLaserCO2CuttingPrice);
    calculation.laserCO2CuttingPrice = laserCO2CuttingPrice;
    
    const countLaserCO2Cutting = calculation.laserCO2CuttingPrice * calculation.materialCutting;

    calculation.countLaserCO2Cutting = countLaserCO2Cutting;

    calculation.result += calculation.countLaserCO2Cutting;

    if (calculation.result <= LASERCO2_CUTTING_PRICE_MIN) {
        calculation.result = LASERCO2_CUTTING_PRICE_MIN;
        document.querySelector(".calculator-result_digit")?.classList.add("minimum");
    }
    console.log(calculation.countLaserCO2Cutting, "countLaserCO2Cutting расчет стоимости лазерной гравировки CO2");
    console.log(calculation.materialCutting, "calculation.materialCutting коэффициент резки");
}

// Расчёт одной объемной наклейки по стандартной логике
// Можно перенести в другое место
// Например в default
function calculateExtraSticker(sticker, globalDefaults) {
    const local = {
        ...globalDefaults,
        ...sticker,
        area: (sticker.width / 1000) * (sticker.height / 1000),
        areaWD: (sticker.width / 1000) * (sticker.height / 1000),
        circulation: sticker.circulation ?? 1,
        types: sticker.types ?? 1,
        angle: sticker.angle ?? 1,
    };
    console.log("LOCAL ",local);

    // Выполняем расчёт по пайплайну
    
    countServiceVolume(local);    // Объемная заливка

    console.log("local.result =",local.result);
    console.log("local.dataVolumeArea =",local.dataVolumeArea);
    console.log("local.dataVolumePrice =",local.dataVolumePrice);
    console.log("local.countVolume =",local.countVolume);
    return local.result;
}

// Функция сбора данных с DOM
// Можно перенести в другое место
// Например в default
function collectExtraStickers(sizeBlock) {
    const stickers = sizeBlock.querySelectorAll(".sticker-card");
    const extraStickers = [];

    stickers.forEach(sticker => {
        const width = parseFloat(sticker.querySelector(".sticker-width")?.value || 0);
        const height = parseFloat(sticker.querySelector(".sticker-height")?.value || 0);
        const count = parseInt(sticker.querySelector(".sticker-count")?.value || 0);

        if (width > 0 && height > 0 && count > 0) {
            extraStickers.push({
                width,
                height,
                circulation: count,
                types: 1,
                angle: 1
            });
        }
    });

    console.log("Данные по наклейкам собраны", extraStickers);
    return extraStickers;
}

export function calculateExtraStickers(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};
    console.log("START:", calculation.result);
    let sizeBlock = document.querySelector(".size-block");
    if (!sizeBlock) return;

    calculation.extraStickers = collectExtraStickers(sizeBlock);

    if (!Array.isArray(calculation.extraStickers) || calculation.extraStickers.length === 0) return;

    calculation.extraResult = 0;

    for (const sticker of calculation.extraStickers) {
        const result = calculateExtraSticker(sticker, calculation);
        calculation.extraResult += result;
    }

    
    calculation.result += calculation.extraResult;
    console.log("EXTRA:", calculation.extraResult);
    console.log("FINAL:", calculation.result);
}

export function countServiceRolling(calculationDefault) { // Расчет стоимости прикатки
    calculation = {...calculation, ...calculationDefault};

    calculation.dataRollingArea = searchDataNames(dataCalculation.dataRollingArea); //[1,100];
    calculation.dataRollingPrice = searchDataNames(dataCalculation.dataRollingPrice); //[200,100];
    const rollingPrice = linear(calculation.area, calculation.dataRollingArea, calculation.dataRollingPrice);
    calculation.rollingPrice = rollingPrice * calculation.usd;
    calculation.countRolling = calculation.rollingPrice;

    if (calculation.countRolling) { // считаем таблички
        calculation.result += calculation.countRolling;
        console.log(calculation.countRolling, "countRolling расчет стоимости прикатки");
    }
}

export function countMaterialTable(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};
// проверяем есть ли в форме материал для табличек

    const selectMaterialTable = '.alcalc-material-table .radio.selected input' // выбор материала
    const infoMaterialInputTable = document.querySelector(selectMaterialTable);
    calculation.materialTablePrice = Number(infoMaterialInputTable?.value); // цена за ORAJET_3640 = 1.38 eur
    calculation.materialTableTitle = infoMaterialInputTable?.dataset.description; // название материала
    calculation.materialTableCurrency = infoMaterialInputTable?.dataset.currency; // валюта материала
    
    document.querySelector(".alcalc-form-material-table").value = calculation.materialTableTitle ?? '';


    // проверяем валюту материала
    if (calculation.materialTableCurrency == 1) { // EUR
        calculation.materialTablePrice = calculation.materialTablePrice * calculation.eur;
    } else if (calculation.materialTableCurrency == 2) { // USD
        calculation.materialTablePrice = calculation.materialTablePrice * calculation.usd;
    }
    calculation.materialTablePrice = calculation.materialTablePrice * 1.2;
    calculation.materialTableArea = calculation.area * 1.3;
    console.log("obj.materialTableArea ", calculation.materialTableArea);
    console.log("obj.materialTablePrice ", calculation.materialTablePrice);
    calculation.countMaterialTable = calculation.materialTableArea * calculation.materialTablePrice;
    calculation.countMaterialTablePerM = calculation.countMaterialTable / calculation.area;

    if (calculation.countMaterialTable) { // считаем таблички
        calculation.result += calculation.countMaterialTable;
        console.log(calculation.countMaterialTable, "countMaterialTable расчет стоимости материала для табличек");
    }
}

export function countServiceThermal(calculationDefault) { // считаем стоимость одного удара термотрансфера
    calculation = {...calculation, ...calculationDefault};

    // данные по
    calculation.dataThermalQty = searchDataNames(dataCalculation.dataThermalQty); //[10,50,100,150];
    calculation.dataThermalPrice = searchDataNames(dataCalculation.dataThermalPrice); //[400,300,200,150];

    const total = calculation.circulation * calculation.types;
    calculation.thermalPrice = linear(total, calculation.dataThermalQty, calculation.dataThermalPrice);
    calculation.countThermal = calculation.thermalPrice;

    if (calculation.countThermal) { // считаем термоперенос (термотрансфер)
        calculation.result += calculation.countThermal;
        console.log(calculation.countThermal, "countThermal расчет стоимости термопереноса (термотрансфера)");
    }
}

export function showResultCalculation(calculationDefault) {
    calculation = {...calculation, ...calculationDefault};

    let dataCalculation = {
        // Поля ввода данных INPUT, SELECT
        'checkAngle': document.querySelector('#alcalc-angle'), // сложный контур для объемной печати
        'outputResult': document.querySelector('#alcalc-result'), // поле для вывода рассчитанной цены
        'outputLabelsResult': document.querySelector('#alcalc-result-labels'), // поле для вывода рассчитанной цены
        'selectMaterialLaserCO2': 'alcalc-material-co2', // выбор материала для лазерной резки у материала две цены, сам материал и стоимость резки data-laser-price

        'blockResultData': 'calculator-result_data',
        'blockResultOrder': 'calculator-result_order',
        'blockResultTotal': 'calculator-result_total',
        
        'blockManagerData': 'calculator-manager_data', // блок для вывода технических данных расчета
    };

    document.querySelector('.' + dataCalculation.blockResultData).style.display = 'none'; // скрываем блок с данными расчета
    document.querySelector('.' + dataCalculation.blockResultTotal).style.display = 'none'; // скрываем блок итого

    document.querySelector(".calculator-result_digit")?.classList.remove("minimum");
    //calculation.countPrint + calculation.countMaterialPrint + calculation.countPreparation + calculation.countCutter;


    if (calculation.result <= RESULT_PRICE_MIN) {
        calculation.result = RESULT_PRICE_MIN;
        document.querySelector(".calculator-result_digit")?.classList.add("minimum");
    }


    if (calculation.discount) {
        calculation.resultDiscount = calculation.countPrintDiscount + calculation.countMaterialPrint + calculation.countPreparationDiscount;
        calculation.resultDiscount = Math.round(calculation.resultDiscount);
        calculation.countDiscount = Math.round(calculation.result - calculation.resultDiscount);
    } else {
        calculation.resultDiscount = " ";
        calculation.countDiscount = " ";
    }
    if (calculation.timing) { // если срочность задана - добавляем её в расчеты
        calculation.result *= calculation.timing;
    }
    let result = Math.round(calculation.result);
    let resultFormat = numberWithSpaces(result);

    dataCalculation.outputResult.innerHTML = resultFormat;


    function resultDataAppend(title, value, measure) {

        measure = typeof measure !== 'undefined' ? measure : '';
        const div = document.createElement('div');
        div.className = 'calculator-result_data_block';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'calculator-result_data_param';
        titleDiv.textContent = title;

        const valueDiv = document.createElement('div');
        valueDiv.className = 'calculator-result_data_value';
        valueDiv.innerHTML = value + measure;

        div.appendChild(titleDiv);
        div.appendChild(valueDiv);

        const resultContainer = document.querySelector('.' + dataCalculation.blockResultData);
        if (resultContainer) {
            resultContainer.appendChild(div);
        }
    }
    function managerDataAppend(title, value, measure) { // МОЖНО УДАЛИТЬ ЕСЛИ РАБОТАЕТ СОРТИРОВКА 0 ЗНАЧЕНИЙ
        measure = typeof measure !== 'undefined' ? measure : '';
        const div = document.createElement('div');
        div.className = 'calculator-manager_data_block';
    
        const titleDiv = document.createElement('div');
        titleDiv.className = 'calculator-manager_data_param';
        titleDiv.textContent = title;
    
        const valueDiv = document.createElement('div');
        valueDiv.className = 'calculator-manager_data_value';
        valueDiv.innerHTML = value + measure;
    
        div.appendChild(titleDiv);
        div.appendChild(valueDiv);
    
        const managerContainer = document.querySelector('.' + dataCalculation.blockManagerData);
        if (managerContainer) {
            managerContainer.appendChild(div);
        }
    }
    
    const managerDataItems = []; // глобальный массив

    function managerDataCollect(title, value, measure) {
        value = Number(value);
        managerDataItems.push({ title, value, measure });
    }
    
    function renderManagerData() {
        const container = document.querySelector('.' + dataCalculation.blockManagerData);
        if (!container) return;
    
        container.innerHTML = '';
    
        const nonZero = managerDataItems.filter(item => item.value !== 0);
        const zero = managerDataItems.filter(item => item.value === 0);
    
        const renderBlock = (parent, items) => {
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'calculator-manager_data_block';
    
                const titleDiv = document.createElement('div');
                titleDiv.className = 'calculator-manager_data_param';
                titleDiv.textContent = item.title;
    
                const valueDiv = document.createElement('div');
                valueDiv.className = 'calculator-manager_data_value';
                valueDiv.innerHTML = item.value.toFixed(2) + item.measure;
    
                div.appendChild(titleDiv);
                div.appendChild(valueDiv);
                parent.appendChild(div);
            });
        };
    
        // отображаем значимые
        renderBlock(container, nonZero);
    
        if (zero.length > 0) {
            const details = document.createElement('details');
            const summary = document.createElement('summary');
            summary.textContent = 'Показать нулевые';
            details.appendChild(summary);
            renderBlock(details, zero);
            container.appendChild(details);
        }
    }



    document.querySelector('.' + dataCalculation.blockResultData).style = 'block'; // показываем блок с данными расчета
    document.querySelector('.' + dataCalculation.blockResultData).innerHTML = '';

    if (document.querySelector('.' + dataCalculation.blockResultData)) {
        console.log('calculation.area', calculation.area)
        if (document.querySelector('.' + dataCalculation.selectMaterialLaserCO2)?.length) {
            resultDataAppend("Цена за п.м.", (result / calculation.laserCO2Width).toFixed(2), " руб.");
        } else {
            resultDataAppend("Площадь тиража", (calculation.area).toFixed(2), " м<sup>2</sup>");
            if (dataCalculation.checkAngle) {
                resultDataAppend("Суммарный тираж", calculation.totalCirculation - calculation.types, " шт");
                resultDataAppend("Цена за штуку", (result / (calculation.totalCirculation - calculation.types)).toFixed(2), " руб.");
            } else {
                resultDataAppend("Суммарный тираж", calculation.totalCirculation, " шт");
                resultDataAppend("Цена за штуку", (result / calculation.totalCirculation).toFixed(2), " руб.");
            }
        }
    }
    
    if (document.querySelector('.' + dataCalculation.blockManagerData)) {
            document.querySelector('.' + dataCalculation.blockManagerData).style = 'block'; // показываем блок с данными расчета
            document.querySelector('.' + dataCalculation.blockManagerData).innerHTML = '';
            managerDataCollect("Стоимость печати", (Number(calculation.countPrint) || 0).toFixed(2), " руб");
            let finalMaterialPrice;
            if (calculation.countMaterialTable){
                finalMaterialPrice = calculation.countMaterialPrint+calculation.countMaterialTable;
            } else {
                finalMaterialPrice = calculation.countMaterialPrint;
            }
            managerDataCollect("Стоимость материала", (Number(finalMaterialPrice) || 0).toFixed(2), " руб");
            managerDataCollect("Стоимость резки", (Number(calculation.countCutter) || 0).toFixed(2), " руб");
            managerDataCollect("Стоимость поштучной резки", (Number(calculation.countManual) || 0).toFixed(2), " руб");
            managerDataCollect("Стоимость переменных данных", (Number(calculation.countVariable) || 0).toFixed(2), " руб");
            managerDataCollect("Стоимость объемной заливки", (Number(calculation.countVolume) || 0).toFixed(2), " руб");
            managerDataCollect("Стоимость лазерной резки CO2", (Number(calculation.countLaserCO2Cutting) || 0).toFixed(2), " руб");
            managerDataCollect("Полная длина лазерной резки CO2", (Number(calculation.totalLength) || 0).toFixed(2), " п.м.");
            managerDataCollect("Коэффициент резки материала", (Number(calculation.materialCutting) || 0).toFixed(2), "");
            managerDataCollect("Коэффициент гравировки материала", (Number(calculation.materialEngraving) || 0).toFixed(2), "");
            managerDataCollect("Стоимость лазерной гравировки CO2", (Number(calculation.countLaserCO2Engrave) || 0).toFixed(2), "&nbsp;руб");
            // Если countMaterialLam1 есть, показываем countLamination, иначе — 0
            managerDataCollect(
                "Стоимость ламинации 1", 
                (Number(calculation.countMaterialLam1) ? Number(calculation.countLamination) : 0).toFixed(2), 
                " руб"
            );
            
            managerDataCollect(
                "Материал ламинации 1", 
                (Number(calculation.countMaterialLam1) || 0).toFixed(2), 
                " руб"
            );
            
            managerDataCollect(
                "Стоимость ламинации 2", 
                (Number(calculation.countMaterialLam2) ? Number(calculation.countLamination) : 0).toFixed(2), 
                " руб"
            );
            
            managerDataCollect(
                "Материал ламинации 2", 
                (Number(calculation.countMaterialLam2) || 0).toFixed(2), 
                " руб"
            );
            managerDataCollect("Выборка", (Number(calculation.countSelection) || 0).toFixed(2), " руб");
            managerDataCollect("Переноса на монтажку", (Number(calculation.countMount) || 0).toFixed(2), " руб");
            managerDataCollect("Материал монтажки", (Number(calculation.countMountMaterial) || 0).toFixed(2), " руб");
            managerDataCollect("Подготовка макета", (Number(calculation.countPreparation) || 0).toFixed(2), " руб");
            managerDataCollect("Поштучная упаковка", (Number(calculation.countPerPiece) || 0).toFixed(2), " руб");
            // --- Аксессуары ---
            if (calculation.countAccessories && calculation.countAccessories > 0) {
                managerDataCollect("Аксессуар", Math.round(Number(calculation.accessoryQtyPerItem) || 0), " "+calculation.accessoryShortTitle);
                managerDataCollect("Цена за единицу (аксессуар)", (Number(calculation.accessoryUnitPrice) || 0).toFixed(2), "&nbsp;руб");
                managerDataCollect("Кол-во на изделие", calculation.accessoryQtyPerItem, "&nbsp;шт");
                managerDataCollect("Общее кол-во аксессуаров", calculation.accessoryTotalQty, "&nbsp;шт");
                managerDataCollect("Стоимость аксессуаров", (Number(calculation.countAccessories) || 0).toFixed(2), "&nbsp;руб");
            }
            if (calculation.countVolume) {
                managerDataCollect("Площадь тиража (объемные)", (calculation.volumeArea).toFixed(2), " м<sup>2</sup>");
                managerDataCollect("Суммарный тираж (объемные)", calculation.totalVolumeCirculation, " шт");
                managerDataCollect("Цена за штуку (объемные)", (result / calculation.totalVolumeCirculation).toFixed(2), " руб.");
            }
            if (calculation.countThermal) { // выводим данные для проверки расчета термотрансфера
                managerDataCollect("Стоимость ударов", (calculation.countThermal).toFixed(2), " руб");
                managerDataCollect("Стоимость одного удара", (calculation.countThermal / calculation.totalCirculation).toFixed(2), " руб");
            }
            renderManagerData();
            
            // добавляем в конец тех данных
            resultDataAppend("Цена за метр", (result / calculation.area).toFixed(2), " руб.");
            resultDataAppend('Срочность', calculation.timing ?? 'нет', '');
            resultDataAppend('Результат (точный)', calculation.result.toFixed(2), ' ₽');
            resultDataAppend('Периметр', calculation.perimeter.toFixed(2), ' м.п.');
        }

    document.querySelector('.' + dataCalculation.blockResultTotal).style.display = 'flex'; // показываем блок итого
    document.querySelector('#alcalc-result_total').innerHTML = resultFormat;
    if (calculation.countLabels) {
        resultDataAppend("Количество листов", calculation.pages, " шт");
        resultDataAppend("Наклеек на листе", calculation.countPaper, " шт");
    }

    if (document.querySelector(".alcalc-form-price")) {
        document.querySelector(".alcalc-form-price").value = resultFormat;
    }

    calculation.result = 0;
}