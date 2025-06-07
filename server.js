// server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import "colors";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", true);
const upload = multer({ dest: "uploads/" });
//task created
const tasks = new Map();


//middlewares
app.use(cors());
app.use(express.json());
//optional
app.use(express.static(path.resolve(__dirname, "public")));


//static analys
const drawingAnalysis = {
    home: {
        label: "Дом",
        desc: "Уютный, с окнами, дымом, забором",
        conclusion: "Потребность в безопасности, семья важна",
    },
    tree: {
        label: "Дерево",
        desc: "С корнями, пышная крона",
        conclusion: "Устойчивость, рост, жизненная энергия",
    },
    human: {
        label: "Человек",
        desc: "Маленький, руки прижаты, без эмоций",
        conclusion: "Скромность, неуверенность, сдержанность",
    },
    animal: {
        qualities: [
            "Фантастическое или символическое существо (например, лиса с крыльями)",
            "Большие глаза, уши — важность наблюдения, осторожность",
            "Мирное выражение, сидячая поза — доброжелательность",
        ],
        conclusion:
            "У ребёнка хорошо развито воображение, он склонен к рефлексии и наблюдательности. Может сдерживать активные эмоции, предпочитая анализ.",
    },
    selfPortrait: {
        details: [
            "Маленький — возможна заниженная самооценка",
            "Нейтральное или отсутствует — сдержанность",
            "Нет фона или вторичных образов — неуверенность в социуме",
        ],
        conclusion:
            "Ребёнок ориентирован на внешнюю оценку, нуждается в поддержке, особенно эмоциональной и словесной.",
    },
};

//frequency 1-5
const freqMap = {
    "Очень редко": 1,
    Редко: 2,
    Иногда: 3,
    Часто: 4,
    Всегда: 5,
};

//img upload
app.post("/upload", upload.array("files"), (req, res) => {
    const files = req.files;
    if (!files || files.length !== 3) {
        return res.status(400).json({ error: "3 resim yükleyiniz." });
    }
    const taskId = uuidv4();
    tasks.set(taskId, { created: Date.now(), files, survey: null });
    res.json({ task_id: taskId });
});

//form submit
app.post("/submit-survey", (req, res) => {
    const { task_id, survey } = req.body;
    if (!tasks.has(task_id)) {
        return res.status(404).json({ error: "Böyle bir task_id yok." });
    }
    const entry = tasks.get(task_id);
    entry.survey = survey;
    res.json({ message: "Опросник принят", task_id });
});

//json polling
app.get("/report/:taskId", (req, res) => {
    const entry = tasks.get(req.params.taskId);
    if (!entry) return res.status(404).send("Not found");

    const elapsed = Date.now() - entry.created;
    const PROCESSING_TIME_MS = 10_000;
    if (elapsed < PROCESSING_TIME_MS) {
        return res.status(404).send("Отчет еще не готов");
    }

    const survey = entry.survey || {};

    //form areas
    const sections = {
        "Эмоциональная устойчивость": ["q1_1", "q1_2", "q1_3", "q1_4"],
        "Социальная адаптация": ["q2_1", "q2_2", "q2_3", "q2_4"],
        "Саморегуляция": ["q3_1", "q3_2", "q3_3", "q3_4"],
        "Самооценка": ["q4_1", "q4_2", "q4_3", "q4_4"],
        "Коммуникативность": ["q5_1", "q5_2", "q5_3", "q5_4", "q5_5"],
    };

    //calculate points
    const scores = {};
    for (const [label, keys] of Object.entries(sections)) {
        scores[label] = keys.reduce(
            (sum, k) => sum + (freqMap[survey[k]] || 0),
            0
        );
    }

    let ageText = "—";
    if (survey.childDOB) {
        const [dd, mm, yyyy] = survey.childDOB.split(".");
        const dob = new Date(+yyyy, +mm - 1, +dd);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const hadBirthdayThisYear =
            today.getMonth() > dob.getMonth() ||
            (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
        if (!hadBirthdayThisYear) age--;
        ageText =
            age === 1
                ? "1 год"
                : age > 1 && age < 5
                    ? `${age} года`
                    : `${age} лет`;
    }

    //markdow report
    let md = "";

    md += `**Психологический отчёт о ребёнке ${ageText}**\n\n\n`;
    md += "## 📚 Краткая сводка\n\n";
    md += `* **Имя ребёнка:** ${survey.childName || "[Имя]"}\n`;
    md += `* **Дата рождения:** ${survey.childDOB || "—"}\n`;
    md += `* **Пол:** ${survey.childGender === "male" ? "Мужской" : "Женский"
        }\n\n`;
    md += `* **Главное качество (Дом):** ${drawingAnalysis.home.conclusion}\n`;
    md += `* **Основная черта (Животное):** ${drawingAnalysis.animal.conclusion}\n`;
    md += `* **Самооценка (автопортрет):** ${drawingAnalysis.selfPortrait.conclusion
        }\n\n`;
    md += "\n\n\n";
    md += "## 🔍 Развёрнутые разделы\n\n";
    md += "### 1. Дом-Дерево-Человек: ключевые наблюдения\n\n";
    md +=
        "| Элемент | Особенности рисунка | Психологический вывод |\n";
    md +=
        "| ------- | -------------- | --------------------------- |\n";
    ["home", "tree", "human"].forEach((key) => {
        const d = drawingAnalysis[key];
        md += `| ${d.label}
                | ${d.desc}
                | ${d.conclusion}
                |\n\n`;
    });
    md +=
        "\n**Общий вывод:** Ребёнок чувствует себя в семье защищённо, но может быть сдержан в выражении эмоций и чувствовать неуверенность в социальной среде.\n\n";
    md += "\n\n\n";
    md += "### 2. Животное: детали и фантазия\n\n";
    drawingAnalysis.animal.qualities.forEach((q) => {
        const [title, rest] = q.split("—").map((s) => s.trim());
        md += `* **${title}**: ${rest}\n`;
    });
    md += `\n**Вывод:** ${drawingAnalysis.animal.conclusion}\n\n`;
    md += "\n\n\n";
    md += "### 3. Автопортрет: особенности самовосприятия\n\n";
    drawingAnalysis.selfPortrait.details.forEach((d) => {
        const [title, rest] = d.split("—").map((s) => s.trim());
        md += `* **${title}**: ${rest}\n`;
    });
    md += `\n**Вывод:** ${drawingAnalysis.selfPortrait.conclusion}\n\n`;
    md += "\n\n\n";
    md += "### 4. Опросник: суммарные баллы и профиль\n\n";
    md += "| Шкала                                        | Баллы |\n";
    md += "| ----------- |:-----:|\n";
    for (const [label, pts] of Object.entries(scores)) {
        md += `| ${label} |  ${pts}   |\n`;
    }
    md += "\n#### Визуальный профиль:\n\n```\n";
    for (const [label, pts] of Object.entries(scores)) {
        const len = sections[label].length * 5;
        const filled = Math.round((pts / len) * 10);
        const bar = "■".repeat(filled) + "□".repeat(10 - filled);
        md += ` ■ ${label} [${bar}]\n`;
    }
    md += "```\n\n";
    md += "\n\n\n";
    md += "## 📖 Рекомендации для родителей\n\n";
    [
        "Чаще хвалите ребёнка за конкретные действия, а не только за результат",
        'Помогайте называть чувства: "Ты расстроился, потому что..."',
        "Поддерживайте инициативу, даже если ребёнок ошибается",
        "Создавайте спокойную и предсказуемую атмосферу дома",
        "Поощряйте фантазию — сказки, рисунки, игры по ролям",
    ].forEach((line) => {
        md += `* ${line}\n`;
    });
    md += "\n---\n\n\n";
    md +=
        "*Отчёт составлен на основе проектных методик и наблюдений. Является ориентиром для мягкой поддержки ребёнка в развитии.*\n";

    //pdf url
    const forwarded = req.headers["x-forwarded-proto"];
    let protoHeader = "";

    if (Array.isArray(forwarded)) {
        protoHeader = forwarded[0];
    }
    else if (typeof forwarded === "string") {
        protoHeader = forwarded;
    }

    const protocol = req.secure
        ? "https"
        : (protoHeader.split(",")[0] || "http");

    const pdfUrl = `${protocol}://${req.get("host")}/report/${req.params.taskId}/pdf`;
    res.json({ status: "ready", report_md: md, pdf_url: pdfUrl });
});

//dynamic pdf creation
app.get("/report/:taskId/pdf", (req, res) => {
    const entry = tasks.get(req.params.taskId);
    if (!entry) return res.status(404).send("Not found");

    const elapsed = Date.now() - entry.created;
    const PROCESSING_TIME_MS = 10_000;
    if (elapsed < PROCESSING_TIME_MS) {
        return res.status(404).send("Рапор еще не готов");
    }

    //same markdown
    const survey = entry.survey || {};
    const sections = {
        "Эмоциональная устойчивость": ["q1_1", "q1_2", "q1_3", "q1_4"],
        "Социальная адаптация": ["q2_1", "q2_2", "q2_3", "q2_4"],
        "Саморегуляция": ["q3_1", "q3_2", "q3_3", "q3_4"],
        "Самооценка": ["q4_1", "q4_2", "q4_3", "q4_4"],
        "Коммуникативность": ["q5_1", "q5_2", "q5_3", "q5_4", "q5_5"],
    };
    const scores = {};
    for (const [label, keys] of Object.entries(sections)) {
        scores[label] = keys.reduce(
            (sum, k) => sum + (freqMap[survey[k]] || 0),
            0
        );
    }

    let md = "";

    //pdfkit stream
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=report-${req.params.taskId}.pdf`
    );
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    const fontPath = path.resolve(__dirname, "public/fonts/DejaVuSans.ttf");
    doc.registerFont("DejaVu", fontPath);
    doc.font("DejaVu");

    doc.fontSize(18).text("Психодиагностический отчёт", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Задача: ${req.params.taskId}`);
    doc.moveDown();
    doc.fontSize(12).text("Краткая сводка:");
    doc.moveDown();

    doc.text(`Имя ребёнка: ${survey.childName || "[Имя]"}`);
    doc.text(`Дата рождения: ${survey.childDOB || "—"}`);
    doc.text(
        `Пол: ${survey.childGender === "male" ? "Мужской" : "Женский"}`
    );
    doc.moveDown();

    //scoreboard
    doc.text("Опросник: суммарные баллы", { underline: true });
    Object.entries(scores).forEach(([label, pts]) => {
        doc.text(`• ${label}: ${pts} / ${sections[label].length * 5}`);
    });

    doc.end();
});

//start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(
        "Бэкэнд работает на".green + " " + `http://localhost:${PORT}`.blue
    );
});
