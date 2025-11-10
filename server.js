const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');
const CALLBACKS_FILE = path.join(DATA_DIR, 'callbacks.json');

// Убедимся, что папки существуют
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Инициализируем файл callbacks.json, если его нет
if (!fs.existsSync(CALLBACKS_FILE)) {
  fs.writeFileSync(CALLBACKS_FILE, JSON.stringify([], null, 2));
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|dwg|dxf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'));
    }
  }
});

// Middleware для парсинга JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Статические файлы из папки uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Вспомогательная функция для чтения заявок
function readCallbacks() {
  try {
    const data = fs.readFileSync(CALLBACKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Вспомогательная функция для записи заявок
function writeCallbacks(callbacks) {
  fs.writeFileSync(CALLBACKS_FILE, JSON.stringify(callbacks, null, 2), 'utf8');
}

// API endpoint для сохранения заявок на обратный звонок
app.post('/api/callback', upload.single('file'), (req, res, next) => {
  try {
    const { name, phone, comment, email, productType } = req.body;

    // Валидация
    if (!name || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Имя и телефон обязательны для заполнения' 
      });
    }

    // Читаем существующие заявки
    const callbacks = readCallbacks();

    // Добавляем новую заявку
    const newCallback = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      comment: comment ? comment.trim() : '',
      productType: productType ? productType.trim() : '',
      file: req.file ? `/uploads/${req.file.filename}` : null,
      fileName: req.file ? req.file.originalname : null,
      status: 'new', // new, in_progress, completed, cancelled
      date: new Date().toISOString()
    };

    callbacks.push(newCallback);
    writeCallbacks(callbacks);

    res.json({ 
      success: true, 
      message: 'Заявка успешно отправлена',
      id: newCallback.id
    });
  } catch (error) {
    console.error('Ошибка при сохранении заявки:', error);
    next(error);
  }
});

// API endpoint для получения всех заявок (админ-панель)
app.get('/api/callbacks', (req, res) => {
  try {
    const callbacks = readCallbacks();
    // Сортировка по дате (новые сначала)
    callbacks.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, data: callbacks });
  } catch (error) {
    console.error('Ошибка при получении заявок:', error);
    res.status(500).json({ success: false, error: 'Ошибка при получении заявок' });
  }
});

// API endpoint для обновления статуса заявки
app.put('/api/callbacks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const callbacks = readCallbacks();
    const index = callbacks.findIndex(cb => cb.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Заявка не найдена' });
    }

    if (status) {
      callbacks[index].status = status;
    }
    if (note !== undefined) {
      callbacks[index].note = note;
    }
    callbacks[index].updatedAt = new Date().toISOString();

    writeCallbacks(callbacks);

    res.json({ success: true, data: callbacks[index] });
  } catch (error) {
    console.error('Ошибка при обновлении заявки:', error);
    res.status(500).json({ success: false, error: 'Ошибка при обновлении заявки' });
  }
});

// API endpoint для удаления заявки
app.delete('/api/callbacks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const callbacks = readCallbacks();
    const index = callbacks.findIndex(cb => cb.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Заявка не найдена' });
    }

    // Удаляем файл, если есть
    if (callbacks[index].file) {
      const filePath = path.join(__dirname, callbacks[index].file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    callbacks.splice(index, 1);
    writeCallbacks(callbacks);

    res.json({ success: true, message: 'Заявка удалена' });
  } catch (error) {
    console.error('Ошибка при удалении заявки:', error);
    res.status(500).json({ success: false, error: 'Ошибка при удалении заявки' });
  }
});

// API endpoint для экспорта заявок в CSV
app.get('/api/callbacks/export/csv', (req, res) => {
  try {
    const callbacks = readCallbacks();
    
    // Заголовки CSV
    const headers = ['ID', 'Дата', 'Имя', 'Телефон', 'Email', 'Тип продукции', 'Комментарий', 'Статус', 'Файл'];
    const rows = callbacks.map(cb => [
      cb.id,
      new Date(cb.date).toLocaleString('ru-RU'),
      cb.name,
      cb.phone,
      cb.email || '',
      cb.productType || '',
      (cb.comment || '').replace(/\n/g, ' ').replace(/,/g, ';'),
      cb.status || 'new',
      cb.fileName || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=callbacks-' + new Date().toISOString().split('T')[0] + '.csv');
    res.send('\ufeff' + csv); // BOM для корректного отображения кириллицы в Excel
  } catch (error) {
    console.error('Ошибка при экспорте CSV:', error);
    res.status(500).json({ success: false, error: 'Ошибка при экспорте CSV' });
  }
});

// API endpoint для калькулятора стоимости
app.post('/api/calculate', (req, res) => {
  try {
    const { productType, weight, complexity, coating } = req.body;

    // Базовая стоимость за тонну
    const basePrice = 50000; // руб/тонна
    let totalPrice = 0;

    if (weight && weight > 0) {
      totalPrice = weight * basePrice;

      // Коэффициенты сложности
      if (complexity === 'simple') {
        totalPrice *= 1.0;
      } else if (complexity === 'medium') {
        totalPrice *= 1.2;
      } else if (complexity === 'complex') {
        totalPrice *= 1.5;
      }

      // Доплата за покрытие
      if (coating === 'zinc') {
        totalPrice += weight * 15000; // оцинковка
      } else if (coating === 'paint') {
        totalPrice += weight * 8000; // покраска
      }

      // Минимальная стоимость
      if (totalPrice < 50000) {
        totalPrice = 50000;
      }
    }

    res.json({
      success: true,
      price: Math.round(totalPrice),
      currency: 'RUB'
    });
  } catch (error) {
    console.error('Ошибка при расчете:', error);
    res.status(500).json({ success: false, error: 'Ошибка при расчете стоимости' });
  }
});

// Обработка ошибок (должен быть после всех маршрутов)
app.use((error, req, res, next) => {
  console.error('Ошибка:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'Размер файла превышает 10 МБ' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      error: 'Ошибка при загрузке файла: ' + error.message 
    });
  }
  
  if (error) {
    return res.status(error.status || 500).json({ 
      success: false, 
      error: error.message || 'Произошла ошибка на сервере' 
    });
  }
  
  next();
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});


