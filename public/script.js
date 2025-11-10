// Обработка модального окна обратного звонка
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('callback-modal');
  const form = document.getElementById('callback-form');
  const openButtons = document.querySelectorAll('[data-open-callback]');
  const closeButtons = document.querySelectorAll('[data-close-callback]');
  const successDiv = document.getElementById('cb-success');
  const errorDiv = document.getElementById('cb-error');

  // Открытие модального окна
  openButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (modal) {
        modal.showModal();
        // Очистка формы и сообщений
        form.reset();
        if (successDiv) successDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
      }
    });
  });

  // Закрытие модального окна
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (modal) modal.close();
    });
  });

  // Закрытие по клику на backdrop
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.close();
      }
    });
  }

  // Обработка отправки формы
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Скрываем предыдущие сообщения
      if (successDiv) successDiv.style.display = 'none';
      if (errorDiv) errorDiv.style.display = 'none';

      // Создаём FormData для поддержки загрузки файлов
      const formData = new FormData();
      formData.append('name', document.getElementById('cb-name')?.value || '');
      formData.append('phone', document.getElementById('cb-phone')?.value || '');
      formData.append('email', document.getElementById('cb-email')?.value || '');
      formData.append('productType', document.getElementById('cb-product-type')?.value || '');
      formData.append('comment', document.getElementById('cb-comment')?.value || '');
      
      const fileInput = document.getElementById('cb-file');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        // Проверка размера файла (10 МБ)
        if (fileInput.files[0].size > 10 * 1024 * 1024) {
          if (errorDiv) {
            errorDiv.textContent = 'Размер файла не должен превышать 10 МБ';
            errorDiv.style.display = 'block';
          }
          return;
        }
        formData.append('file', fileInput.files[0]);
      }

      try {
        const response = await fetch('/api/callback', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          // Показываем сообщение об успехе
          if (successDiv) {
            successDiv.textContent = result.message || 'Заявка успешно отправлена!';
            successDiv.style.display = 'block';
          }
          // Очищаем форму
          form.reset();
          // Закрываем модальное окно через 2 секунды
          setTimeout(() => {
            if (modal) modal.close();
          }, 2000);
        } else {
          // Показываем ошибку
          if (errorDiv) {
            errorDiv.textContent = result.error || 'Произошла ошибка';
            errorDiv.style.display = 'block';
          }
        }
      } catch (error) {
        console.error('Ошибка при отправке формы:', error);
        if (errorDiv) {
          errorDiv.textContent = 'Ошибка соединения. Попробуйте позже.';
          errorDiv.style.display = 'block';
        }
      }
    });
  }

  // Автозаполнение типа продукции при клике на кнопку "Запросить расчёт" в каталоге
  document.querySelectorAll('[data-product]').forEach(btn => {
    btn.addEventListener('click', () => {
      const productType = btn.getAttribute('data-product');
      const productTypeInput = document.getElementById('cb-product-type');
      if (productTypeInput) {
        productTypeInput.value = productType;
      }
    });
  });
});

// Фильтрация каталога
function filterCatalog() {
  const searchInput = document.getElementById('catalog-search');
  const categorySelect = document.getElementById('catalog-category');
  const catalogGrid = document.getElementById('catalog-grid');

  if (!catalogGrid) return;

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedCategory = categorySelect ? categorySelect.value : '';

  const cards = catalogGrid.querySelectorAll('.card');

  cards.forEach(card => {
    const cardCategory = card.getAttribute('data-category');
    const cardText = card.textContent.toLowerCase();

    const matchesCategory = !selectedCategory || cardCategory === selectedCategory;
    const matchesSearch = !searchTerm || cardText.includes(searchTerm);

    if (matchesCategory && matchesSearch) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// Калькулятор стоимости
async function calculatePrice() {
  const weight = parseFloat(document.getElementById('calc-weight')?.value);
  const complexity = document.getElementById('calc-complexity')?.value || 'medium';
  const coating = document.getElementById('calc-coating')?.value || 'none';
  const resultDiv = document.getElementById('calc-result');
  const priceDiv = document.getElementById('calc-price');

  if (!weight || weight <= 0) {
    alert('Введите вес в тоннах');
    return;
  }

  try {
    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ weight, complexity, coating })
    });

    const result = await response.json();

    if (result.success) {
      const price = result.price.toLocaleString('ru-RU');
      priceDiv.textContent = price + ' ₽';
      resultDiv.style.display = 'block';
    } else {
      alert('Ошибка при расчёте: ' + result.error);
    }
  } catch (error) {
    console.error('Ошибка при расчёте:', error);
    alert('Ошибка соединения. Попробуйте позже.');
  }
}


