# Sirius Backend

Простой бэкенд на Express.js для загрузки детских рисунков (изображения или PDF), сбора ответов на опроса и генерации психодиагностического отчёта в формате Markdown или PDF. Все данные хранятся в памяти (для демонстрации).

---

## Возможности

* **Загрузка файлов** (`POST /upload`)

  * Принимает ровно **3** файла рисунков (`image/jpeg`, `image/png`, `application/pdf`) через `multipart/form-data`.
  * Максимальный размер каждого файла — 5 МБ.
  * Возвращает UUID задачи:

    ```json
    { "task_id": "<uuid>" }
    ```

* **Отправка анкеты** (`POST /submit-survey`)

  * Сохраняет ответы: имя ребёнка, дата рождения, пол, имя родителя и ответы на вопросы.
  * Принимает JSON:

    ```json
    {
      "task_id": "<uuid>",
      "survey": {
        "childName": "Анна",
        "childDOB": "02.03.2018",
        "childGender": "female",
        "parentName": "Мария",
        "q1_1": "Часто",
        …
      }
    }
    ```
  * Возвращает подтверждение:

    ```json
    { "message": "Опросник принят", "task_id": "<uuid>" }
    ```

* **Проверка готовности отчёта** (`GET /report/:taskId`)

  * Если прошло <10 с с момента загрузки — возвращает 404.
  * После завершения обработки возвращает:

    ```json
    {
      "status": "ready",
      "report_md": "## 📚 Краткая сводка\n…",
      "pdf_url": "http://localhost:4000/report/<taskId>/pdf"
    }
    ```

* **Получение PDF-отчёта** (`GET /report/:taskId/pdf`)

  * Стримит PDF-файл (`Content-Type: application/pdf`) для скачивания под именем `report-<taskId>.pdf`.

* **CORS** и **статическая раздача**

  * Включён глобально (можно ограничить).
  * Раздаёт содержимое папки `public` (шрифты, ассеты).

---

## Требования

* Node.js **≥16**
* npm (или yarn)
* (Опционально) curl, Postman или любой HTTP-клиент для тестирования API

---

## Установка и запуск

1. Клонируйте репозиторий:

   ```bash
   git clone https://github.com/GulaliG/sirius-backend
   cd sirius-backend
   ```
2. Установите зависимости:

   ```bash
   npm install
   ```
3. По умолчанию сервер слушает порт **4000**. При необходимости задайте переменную окружения:

   ```bash
   export PORT=5000
   ```
4. Запустите сервер:

   ```bash
   npm start
   ```
5. В консоли появится:

   ```
   Бэкэнд работает на http://localhost:4000
   ```

---

## Эндпойнты

| Метод | URL                   | Описание                         |
| :---: | :-------------------- | :------------------------------- |
|  POST | `/upload`             | Загрузить 3 файла (JPEG/PNG/PDF) |
|  POST | `/submit-survey`      | Отправить ответы анкеты          |
|  GET  | `/report/:taskId`     | Проверить готовность отчёта      |
|  GET  | `/report/:taskId/pdf` | Скачать PDF-отчёт                |

---

## Структура проекта

```
.
├── server.j
├── package.json
├── /uploads
├── /public
└── README.md
```

* **`server.js`** — маршруты, хранение в памяти (`Map`), логика обработки.
* **`/uploads`** — папка для временного хранения загруженных файлов.
* **`/public`** — статические ресурсы (шрифты, изображения).

---

## Замечания

* Все данные хранятся **в памяти** и **сбрасываются** при перезапуске.
* Для продакшена требуется подключить БД, ограничить CORS, добавить аутентификацию и rate-limit.
* PDF генерируется на лету с помощью [PDFKit](https://github.com/foliojs/pdfkit).

---

Made by **GulaliG** © 2025
