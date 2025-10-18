export async function countCalculation(calculationDefault) {
    const version = window.pluginVersion || Date.now();

    const {
        calculationCutter,
        calculationMaterial,
        calculationPrint,
        countMount,
        countPreparation,
        countServiceLabels,
        calculationVariable,
        showResultCalculation
    } = await import(`./calculator.functions.plugin.js?${version}`);

    countMount(calculationDefault);              // считаем монтажку и перенос на неё
    calculationPrint(calculationDefault);        // считаем печать
    calculationMaterial(calculationDefault);     // считаем Материал
    countPreparation(calculationDefault);        // подготовка макетов
    calculationCutter(calculationDefault);       // считаем Сложность контура
    countServiceLabels(calculationDefault);
    calculationVariable(calculationDefault);     // расчет стоимости переменных данных
    showResultCalculation(calculationDefault);   // считаем Результат
}