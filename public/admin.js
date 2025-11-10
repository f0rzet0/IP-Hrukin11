// Админ-панель для управления заявками
let allCallbacks = [];
let filteredCallbacks = [];

// Загрузка заявок
async function loadCallbacks() {
  try {
    const response = await fetch('/api/callbacks');
    const result = await response.json();
    
    if (result.success) {
      allCallbacks = result.data;
      applyFilters();
      updateStats();
    } else {
      console.error('Ошибка при загрузке заявок:', result.error);
    }
  } catch (error) {
    console.error('Ошибка при загрузке заявок:', error);
    document.getElementById('callbacks-tbody').innerHTML = 
      '<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--error);">Ошибка при загрузке заявок</td></tr>';
  }
}

// Применение фильтров
function applyFilters() {
  const statusFilter = document.getElementById('filter-status').value;
  const searchFilter = document.getElementById('filter-search').value.toLowerCase();

  filteredCallbacks = allCallbacks.filter(cb => {
    const matchStatus = !statusFilter || cb.status === statusFilter;
    const matchSearch = !searchFilter || 
      cb.name.toLowerCase().includes(searchFilter) ||
      cb.phone.toLowerCase().includes(searchFilter) ||
      (cb.email && cb.email.toLowerCase().includes(searchFilter)) ||
      (cb.comment && cb.comment.toLowerCase().includes(searchFilter));
    
    return matchStatus && matchSearch;
  });

  renderCallbacks();
}

// Отображение заявок
function renderCallbacks() {
  const tbody = document.getElementById('callbacks-tbody');
  
  if (filteredCallbacks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 24px;">Заявки не найдены</td></tr>';
    return;
  }

  tbody.innerHTML = filteredCallbacks.map(cb => {
    const date = new Date(cb.date).toLocaleString('ru-RU');
    const statusClass = `status-${cb.status}`;
    const statusText = {
      'new': 'Новая',
      'in_progress': 'В работе',
      'completed': 'Завершено',
      'cancelled': 'Отменено'
    }[cb.status] || cb.status;

    return `
      <tr>
        <td>${date}</td>
        <td>${cb.name}</td>
        <td><a href="tel:${cb.phone}">${cb.phone}</a></td>
        <td>${cb.email || '-'}</td>
        <td>${cb.productType || '-'}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cb.comment || ''}">${cb.comment || '-'}</td>
        <td>${cb.file ? `<a href="${cb.file}" target="_blank" class="file-link">${cb.fileName}</a>` : '-'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td class="actions-cell">
          <button class="btn btn-small" onclick="editCallback('${cb.id}')">Изменить</button>
          <button class="btn btn-small" onclick="deleteCallback('${cb.id}')" style="background: var(--error);">Удалить</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Обновление статистики
function updateStats() {
  document.getElementById('stat-total').textContent = allCallbacks.length;
  document.getElementById('stat-new').textContent = allCallbacks.filter(cb => cb.status === 'new').length;
  document.getElementById('stat-in-progress').textContent = allCallbacks.filter(cb => cb.status === 'in_progress').length;
  document.getElementById('stat-completed').textContent = allCallbacks.filter(cb => cb.status === 'completed').length;
}

// Редактирование заявки
function editCallback(id) {
  const callback = allCallbacks.find(cb => cb.id === id);
  if (!callback) return;

  document.getElementById('edit-id').value = id;
  document.getElementById('edit-status').value = callback.status || 'new';
  document.getElementById('edit-note').value = callback.note || '';
  document.getElementById('edit-modal').showModal();
}

// Сохранение изменений
document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('edit-id').value;
  const status = document.getElementById('edit-status').value;
  const note = document.getElementById('edit-note').value;

  try {
    const response = await fetch(`/api/callbacks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note })
    });

    const result = await response.json();
    
    if (result.success) {
      document.getElementById('edit-modal').close();
      loadCallbacks();
    } else {
      alert('Ошибка при обновлении заявки: ' + result.error);
    }
  } catch (error) {
    console.error('Ошибка при обновлении заявки:', error);
    alert('Ошибка при обновлении заявки');
  }
});

// Удаление заявки
async function deleteCallback(id) {
  if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return;

  try {
    const response = await fetch(`/api/callbacks/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();
    
    if (result.success) {
      loadCallbacks();
    } else {
      alert('Ошибка при удалении заявки: ' + result.error);
    }
  } catch (error) {
    console.error('Ошибка при удалении заявки:', error);
    alert('Ошибка при удалении заявки');
  }
}

// Экспорт в CSV
function exportCSV() {
  window.location.href = '/api/callbacks/export/csv';
}

// Загрузка при открытии страницы
document.addEventListener('DOMContentLoaded', () => {
  loadCallbacks();
  // Автообновление каждые 30 секунд
  setInterval(loadCallbacks, 30000);
});

