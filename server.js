const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// إعدادات الـ CORS للسماح بالوصول من جميع المصادر
app.use(cors());

// لتفسير البيانات الواردة بتنسيق JSON
app.use(express.json());

// تقديم الملفات الثابتة (HTML, CSS, JS) من الجذر مباشرة
app.use(express.static(path.join(__dirname)));

// مسار لعرض صفحة index.html عند الوصول إلى الجذر
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// دالة لقراءة الروابط من ملف data.json
const readLinks = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data.json'));
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

// دالة لكتابة الروابط إلى ملف data.json
const writeLinks = (links) => {
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(links, null, 2));
};

// مسار GET لتحميل الروابط
app.get('/links', (req, res) => {
    const links = readLinks();
    res.json(links);
});

// مسار POST لإضافة رابط جديد
const isLinkDuplicate = (link) => {
    const links = readLinks();
    return links.includes(link);
};

// تعديل مسار POST لإضافة رابط جديد
app.post('/links', (req, res) => {
    const newLink = req.body.url;
    if (!newLink) {
        return res.status(400).send('رابط غير صالح');
    }

    // التحقق من أن الرابط غير مكرر
    if (isLinkDuplicate(newLink)) {
        return res.status(400).send('الرابط مكرر بالفعل');
    }

    const links = readLinks();
    links.push(newLink);
    writeLinks(links);

    io.emit('allLinks', links);  // نشر جميع الروابط لجميع المتصلين

    res.json({ message: 'تم إضافة الرابط بنجاح' });
});

// مسار DELETE لحذف رابط من data.json
app.delete('/links/:index', (req, res) => {
    const index = parseInt(req.params.index, 10);
    const links = readLinks();

    console.log('الروابط الحالية:', links);
    console.log('الفهرس المرسل:', index);

    if (isNaN(index) || index < 0 || index >= links.length) {
        return res.status(404).json({ message: 'رابط غير موجود' });
    }

    const deletedLink = links.splice(index, 1)[0]; // حذف الرابط المحدد

    writeLinks(links);

    io.emit('allLinks', links);

    return res.json({ message: `تم حذف الرابط: ${deletedLink}` });
});

// استماع لأحداث Socket.IO
io.on('connection', (socket) => {
    console.log('مستخدم جديد متصل');

    const links = readLinks();
    socket.emit('allLinks', links);

    socket.on('playVideo', (link) => {
        io.emit('playVideo', link);
    });

    socket.on('disconnect', () => {
        console.log('مستخدم غير متصل');
    });
});

// بدء الخادم على المنفذ 3000
server.listen(3000, () => {
    console.log('الخادم يعمل على http://localhost:3000');
});
