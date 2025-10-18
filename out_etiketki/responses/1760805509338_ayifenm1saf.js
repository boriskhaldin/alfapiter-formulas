URL: https://alfapiter.ru/assets/template/js/calculator.default.plugin.js?v=104001102025
CT: text/javascript

import(pathImportForDefault)
  .then(({ countCalculation }) => {
    // Delegate change events on document for all input/select elements
    const calcul = document;

    function CalculatorTinyPlugin(options) {
      // UI Elements
      const sizeList = document.querySelector('.alcalc-size-list');
      const addSizeBtn = document.querySelector('#alcalc-add-size');

      // Calculation storage
      const calculationDefault = {};

      // Combined recalc function
      function recalc() {
        setDefaultData();
        countDefault();
        countCalculation(calculationDefault);
      }

      // Read form data
      function setDefaultData() {
        const blocks = Array.from(sizeList.querySelectorAll('.size-block'));
        let totalCirculation = 0;
        let totalVolumeCirculation = 0;
        let totalArea = 0;
        let totalVolumeArea = 0; // общая площадь для объемных наклеек с учетом запаса
        let totalAreaWD = 0;
        let totalPerimeter = 0;
        let totalTypes = 0;

        calculationDefault.sizes = blocks.map((block) => {
          // --- Новая логика чтения и проверки min/max для каждого блока ---
          // Сырые значения ширины и длины
          let rawW = Number(block.querySelector('input[name="width"]').value) || 0;
          let rawH = Number(block.querySelector('input[name="length"]').value) || 0;
        
          // Ограничения по размерам
          const maxWInput = block.querySelector('.alcalc-max-width');
          const maxHInput = block.querySelector('.alcalc-max-length');
          const minWInput = block.querySelector('.alcalc-min-width');
          const minHInput = block.querySelector('.alcalc-min-length');
        
          // Проверка max/min ширины
          if (maxWInput) {
            const maxW = Number(maxWInput.value);
            if (!isNaN(maxW) && rawW > maxW) {
              rawW = maxW;
              block.querySelector('input[name="width"]').value = rawW;
            }
          }
          if (minWInput) {
            const minW = Number(minWInput.value);
            if (!isNaN(minW) && rawW < minW) {
              rawW = minW;
              block.querySelector('input[name="width"]').value = rawW;
            }
          }
        
          // Проверка max/min длины
          if (maxHInput) {
            const maxH = Number(maxHInput.value);
            if (!isNaN(maxH) && rawH > maxH) {
              rawH = maxH;
              block.querySelector('input[name="length"]').value = rawH;
            }
          }
          if (minHInput) {
            const minH = Number(minHInput.value);
            if (!isNaN(minH) && rawH < minH) {
              rawH = minH;
              block.querySelector('input[name="length"]').value = rawH;
            }
          }
        
          // После корректировки берем окончательные w и h
          const w = rawW;
          const h = rawH;
          // ---------------------------------------------------------------
        
          const types = Number(block.querySelector('input[name="types"]').value) || 1;
          const circ = Number(block.querySelector('input[name="quantity"]').value) || 0;
        
          // --- Новый код для угла ---
          let angle = 1;
          let angleTitle = 'Простой';
          const checkAngle = block.querySelector('.alcalc-angle'); // чекбокс внутри блока
          if (checkAngle && checkAngle.checked) {
            angle = 1.5;
            angleTitle = 'Сложный';
          }
          // Авто-сложный если одна сторона < 20 мм
          if (w < 20 || h < 20) {
            angle = 1.5;
            angleTitle = 'Сложный (одна сторона <20мм)';
          }
        
          // --- расчёты ---
          const blockTotal = circ * types;
          const volumeTotal = blockTotal + 3; // запас для объемных
          const area = (w / 1000) * (h / 1000) * blockTotal;
          const volumeArea = (w / 1000) * (h / 1000) * volumeTotal;
          const areaWD = ((w + 6) / 1000) * ((h + 6) / 1000) * blockTotal;
          const perimeter = (w * 2 / 1000 + h * 2 / 1000) * blockTotal;
        
          // --- суммируем общие значения ---
          totalCirculation += blockTotal;
          totalVolumeCirculation += volumeTotal;
          totalArea += area;
          totalVolumeArea += volumeArea;
          totalAreaWD += areaWD;
          totalPerimeter += perimeter;
          totalTypes += types;
        
          // --- возвращаем объект по блоку ---
          return { 
            width: w, 
            length: h, 
            types, 
            circulation: circ, 
            total: blockTotal, 
            area, 
            areaWD,
            volumeArea,
            angle,
            angleTitle 
          };
        });


        calculationDefault.totalCirculation = totalCirculation;
        calculationDefault.totalVolumeCirculation = totalVolumeCirculation; // общий тираж для объемных наклеек
        calculationDefault.area = totalArea;
        calculationDefault.volumeArea = totalVolumeArea; // общая площадь для объемных наклеек
        calculationDefault.areaWD = totalAreaWD;
        calculationDefault.perimeter = totalPerimeter;
        calculationDefault.blocks = sizeList.querySelectorAll('.size-block').length;
        calculationDefault.types = totalTypes;

        // Backward compatibility: expose first block fields
        if (calculationDefault.sizes.length > 0) {
          const first = calculationDefault.sizes[0];
          calculationDefault.width = first.width;
          calculationDefault.length = first.length;
          calculationDefault.circulation = first.circulation;
        }

        // Other settings
        calculationDefault.timing = document.querySelector('.alcalc-timing .selected input').value;
        calculationDefault.usd = Number(document.querySelector('.calculator-usd')?.value) || 0;
        calculationDefault.eur = Number(document.querySelector('.calculator-eur')?.value) || 0;
        calculationDefault.discount = Number(document.querySelector('.alcalc-discount')?.value) || 0;
        
        // --- новые данные ---
        calculationDefault.laserCO2cuttingLength = Number(document.querySelector('input[name="laserCO2cuttingLength"]')?.value) || 0;
        calculationDefault.engravingWidth = Number(document.querySelector('input[name="engravingWidth"]')?.value) || 0;
        calculationDefault.engravingLength = Number(document.querySelector('input[name="engravingLength"]')?.value) || 0;
        // считаем площадь в см кв
        calculationDefault.laserCO2engraveArea = (calculationDefault.engravingWidth / 10) * (calculationDefault.engravingLength / 10) * calculationDefault.totalCirculation;


        // Update hidden form fields
        document.querySelector('.alcalc-form-width').value = calculationDefault.width || '';
        document.querySelector('.alcalc-form-length').value = calculationDefault.length || '';
        document.querySelector('.alcalc-form-circulation').value = calculationDefault.circulation || '';
        document.querySelector('.alcalc-form-types').value = calculationDefault.types || '';
        document.querySelector('.alcalc-form-usd').value = calculationDefault.usd;
        document.querySelector('.alcalc-form-eur').value = calculationDefault.eur;
        
      }

      // Stub for default count
      function countDefault() {}

      // Wrap raw blocks into .size-block
      function wrapExisting() {
        if (!sizeList) return;
        if (sizeList.querySelector('.size-block')) return;
        const raw = Array.from(sizeList.querySelectorAll('.calculator-form-block'));
        let wrapper;
        raw.forEach((el, idx) => {
          if (idx % 3 === 0) {
            wrapper = document.createElement('div');
            wrapper.className = 'size-block';
            sizeList.appendChild(wrapper);
          }
          wrapper.appendChild(el);
        });
      }
      wrapExisting();

      // Remove delete button from first block
      const initialBlocks = Array.from(sizeList.querySelectorAll('.size-block'));
      if (initialBlocks.length > 0) {
        const rmBtn = initialBlocks[0].querySelector('.remove-size-btn');
        if (rmBtn) rmBtn.remove();
      }
    
    function updateDescription(e) {
  if (e.target.dataset.description) {
    const block = e.target.closest('.calculator-form-block');
    const descEl = block?.querySelector('.material-description .description-text');
    if (descEl) {
      descEl.innerText = e.target.dataset.description;
    }
  }
}

function updateAllDescriptions() {
  document.querySelectorAll('.calculator-form-block').forEach(block => {
    const descEl = block.querySelector('.material-description .description-text');
    if (!descEl) return;

    const checkedRadio = block.querySelector('input[type="radio"]:checked[data-description]');
    const select = block.querySelector('select');
    if (checkedRadio) {
      descEl.innerText = checkedRadio.dataset.description || '';
    } else if (select) {
      const option = select.options[select.selectedIndex];
      descEl.innerText = option?.dataset.description || '';
    } else {
      descEl.innerText = '';
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  updateAllDescriptions();
  recalc();
});

document.addEventListener('change', e => {
  // Общая проверка: если событие произошло в пределах calculator-form
  const formBlock = e.target.closest('.calculator-form-block');
  if (!formBlock) return;

  updateDescription(e);
  recalc();
});

// Делегирование для кнопок
document.addEventListener('click', e => {
  if (e.target.classList.contains('add-sticker-size-btn')) {
    recalc();
  }

  if (e.target.classList.contains('remove-sticker-size-btn')) {
    recalc();
  }
});


      // Delegated click for delete
      sizeList.addEventListener('click', (e) => {
        const rem = e.target.closest('.remove-size-btn');
        if (rem) {
          const block = rem.closest('.size-block');
          if (block) {
            block.remove();
            recalc();
          }
        }
      });
    
        if (addSizeBtn) {
          // Add new size block
          addSizeBtn.addEventListener('click', () => {
            const blocks = Array.from(sizeList.querySelectorAll('.size-block'));
            const last = blocks[blocks.length - 1];
            const clone = last.cloneNode(true);
    
            // Copy input values
            clone.querySelectorAll('input[name]').forEach((inp) => {
              const src = last.querySelector(`input[name="${inp.name}"]`);
              inp.value = src ? src.value : '';
            });
            // Remove duplicate IDs
            clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
            // При копировании ограничения из первого блока скрытые поля (.alcalc-max-*) уже клонируются вместе с узлом
    
            // Ensure delete button
            if (!clone.querySelector('.remove-size-btn')) {
              const removeWrapper = document.createElement('div');
              removeWrapper.className = 'calculator-form-block remove-btn-wrap';
              removeWrapper.innerHTML = '<button type="button" class="remove-size-btn btn btn-link p-0 ms-auto">╳</button>';
              clone.prepend(removeWrapper);
            }
            sizeList.appendChild(clone);
            recalc();
          });
        }

      // Initial calculate
      recalc();
    }

    CalculatorTinyPlugin(calcul);
  })
  .catch((err) => console.error('error path import', err));

export function searchDataNames(name) {
  const dataNames = [];
  document.querySelectorAll(name).forEach((i) => dataNames.push(i.value));
  return dataNames;
}

function binarySearch(array, el) {
    let m = 0;
    let n = array?.length - 1;
    while (m <= n) {
        let k = (n + m) >> 1;
        let cmp = el - array[k];
        if (cmp > 0) {
            m = k + 1;
        } else if (cmp < 0) {
            n = k - 1;
        } else {
            return k;
        }
    }
    return n;
}
export function linear(area, dataArea, dataPrice) {
    let deltaArea
    let deltaPrice
    let range = binarySearch(dataArea, area);
    if (range < 0) {
        range = 0;
        deltaArea = dataArea[range + 1] - dataArea[range];
        deltaPrice = 0;
    } else if (range >= dataArea.length - 1) {
        range = dataArea.length - 1;
        deltaArea = dataArea[range] - dataArea[range - 1];
        deltaPrice = 0;
    } else {
        deltaArea = dataArea[range + 1] - dataArea[range];
        deltaPrice = dataPrice[range + 1] - dataPrice[range];
    }
    let res = Number(dataPrice[range]) + (area - Number(dataArea[range])) * deltaPrice / deltaArea;
    return res *= area;
}

export function linearExactly(total, dataArea, dataPrice) {
    let range = binarySearch(dataArea, total);
    const res = dataPrice[range];
    return res;
}

export function numberWithSpaces(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
