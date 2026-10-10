# Локальный сервис оценки произношения на базе pronounce-assess

Этот сервис предназначен для работы **локально без интернета и облака** на компьютере музейного киоска (целевая конфигурация: Intel i5, 8 ГБ RAM).

Библиотека: [https://github.com/superasymmetry/pronounce-assess](https://github.com/superasymmetry/pronounce-assess)

---

## 1. Установка и запуск на Windows

1. Откройте терминал (PowerShell или Командная строка) в папке `python-backend`:
   ```bat
   cd python-backend
   ```
2. Создайте виртуальное окружение Python (рекомендуется Python 3.10):
   ```bat
   py -m venv .venv
   .venv\Scripts\activate
   python -m pip install --upgrade pip
   ```
3. Установите зависимости:
   ```bat
   pip install -r requirements.txt
   ```
4. Убедитесь, что установлен `ffmpeg` (добавлен в системную переменную PATH).
5. Запустите сервер:
   ```bat
   python server.py
   ```
   Сервер запустится на адресе: `http://127.0.0.1:8000`.

---

## 2. Установка и запуск на Linux / macOS

```bash
cd python-backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python server.py
```

---

## 3. Спецификация API

### `POST /recognize`
- **Запрос (`multipart/form-data`)**:
  - `audio`: аудиофайл (WebM/Opus, WAV, OGG)
  - `expected`: эталонный текст предложения (например, `"The quick brown fox jumps over the lazy dog."`)
- **Ответ (`JSON`)**:
  ```json
  {
    "expected": "The quick brown fox jumps over the lazy dog.",
    "score": 87,
    "phonemes": [
      { "phoneme": "DH", "score": 92, "label": "correct" },
      { "phoneme": "AH", "score": 85, "label": "correct" },
      { "phoneme": "K", "score": 78, "label": "minor_error" }
    ],
    "status": "ok",
    "processing_time_ms": 195.4,
    "audio_duration_sec": 3.8
  }
  ```

### `GET /status`
Возвращает информацию о готовности модели, времени первичной загрузки в память и диагностику.
