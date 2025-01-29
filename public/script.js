// الحصول على العناصر من DOM
const addLinkButton = document.getElementById('addLink');
const youtubeLinkInput = document.getElementById('youtubeLink');
const linksList = document.getElementById('linksList');
const videoPlayer = document.getElementById('videoPlayer');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const toggleLinksButton = document.getElementById('toggleLinksButton');

// الاتصال بـ Socket.IO
const socket = io('http://localhost:3000');

// API لعرض الروابط المحفوظة
const apiUrl = 'http://localhost:3000/links';

// متغير لتخزين الروابط المعروضة
let links = [];
let currentLinkIndex = 0;
let currentVideoLink = ''; // تخزين الرابط الحالي لتجنب التكرار

// دالة لعرض الروابط المحفوظة في الصفحة
const loadLinks = (newLinks) => {
    links = newLinks;
    currentLinkIndex = 0; // إعادة تعيين الفهرس إلى الأول عند تحميل الروابط الجديدة
    console.log('تحميل الروابط: ', links);
    
    linksList.innerHTML = '';
    links.forEach((link, index) => {
        const li = document.createElement('li');
        li.textContent = link;

        // إنشاء زر الحذف بجانب كل رابط
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'حذف';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => {
            deleteLink(link, index); // عند الضغط على زر الحذف، يتم حذف الرابط
        });
        
        // إضافة الزر إلى العنصر
        li.appendChild(deleteButton);
        
        // عند الضغط على الرابط لتشغيل الفيديو
        li.addEventListener('click', () => {
            playVideo(link);  // عند الضغط على الرابط، يتم تشغيل الفيديو
        });

        linksList.appendChild(li);
    });

    toggleNavigationButtons(); // تحديث حالة الأزرار "التالي" و "السابق"
};

const deleteLink = async (link, index) => {
    console.log('إرسال طلب حذف الرابط بترتيب:', index); // طباعة الفهرس قبل الحذف
    if (confirm(`هل أنت متأكد من حذف الرابط: ${link}?`)) {
        try {
            const response = await fetch(`${apiUrl}/${index}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('خطأ في استجابة الخادم');
            }

            const result = await response.json();
            alert(result.message); // إعلام المستخدم

            // إعادة تحميل الروابط بعد الحذف
            loadLinks(await fetchLinks()); // تحميل الروابط مجددًا
        } catch (error) {
            console.error('خطأ في حذف الرابط:', error);
            alert('خطأ في حذف الرابط');
        }
    }
};

// دالة لتشغيل الفيديو (مع الصوت فقط)
const playVideo = (link) => {
    // تحقق من أن الرابط الجديد ليس نفس الرابط الذي يتم تشغيله حاليًا
    if (link === currentVideoLink) {
        console.log('الفيديو قيد التشغيل بالفعل: ', link);
        return;  // إذا كان نفس الرابط، لا تقم بتشغيله مرة أخرى
    }

    const videoId = getVideoId(link);  // استخراج الـ Video ID من الرابط
    if (videoId) {
        const url = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0`; // رابط فيديو يوتيوب مع تعطيل واجهة التحكم
        videoPlayer.src = url; // تحديث الـ iframe بـ src جديد

        // إخفاء الفيديو
        videoPlayer.style.display = 'none'; // إخفاء الفيديو

        // إرسال الرابط إلى جميع المتصلين
        socket.emit('playVideo', link);
        currentVideoLink = link;  // تحديث الرابط الحالي
        console.log('تم استلام رابط لتشغيله عبر socket:', link);
    } else {
        alert('رابط الفيديو غير صالح');
    }
};

// دالة لاستخراج ID الفيديو من رابط يوتيوب
const getVideoId = (url) => {
    const regex = /(?:https?:\/\/(?:www\.)?youtube\.com\/(?:[^\/]+\/\S+\/|(?:v|e(?:mbed)?)\/)([A-Za-z0-9_-]{11}))|(?:youtu\.be\/([A-Za-z0-9_-]{11}))/;
    const match = url.match(regex);
    return match ? match[1] || match[2] : null; // إرجاع الـ Video ID
};

// دالة لتحديث حالة الأزرار "التالي" و "السابق"
const toggleNavigationButtons = () => {
    prevButton.disabled = currentLinkIndex === 0;
    nextButton.disabled = currentLinkIndex === links.length - 1;
};

// دالة للتنقل إلى الفيديو التالي
const goToNextVideo = () => {
    if (currentLinkIndex < links.length - 1) {
        currentLinkIndex++;
        playVideo(links[currentLinkIndex]);
        toggleNavigationButtons();
    }
};

// دالة للتنقل إلى الفيديو السابق
const goToPrevVideo = () => {
    if (currentLinkIndex > 0) {
        currentLinkIndex--;
        playVideo(links[currentLinkIndex]);
        toggleNavigationButtons();
    }
};

// إضافة رابط جديد
const addLink = async () => {
    const newLink = youtubeLinkInput.value.trim();
    if (!newLink) {
        alert('يرجى إدخال رابط يوتيوب');
        return;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: newLink }),
        });

        const result = await response.json();
        alert(result.message);
        youtubeLinkInput.value = '';
    } catch (error) {
        console.error('خطأ في إضافة الرابط:', error);
    }
};

// إضافة حدث عند الضغط على زر "أضف الرابط"
addLinkButton.addEventListener('click', addLink);

// استماع للأحداث القادمة من الخادم
socket.on('allLinks', loadLinks);
socket.on('playVideo', (link) => {
    playVideo(link);
});

// إضافة أحداث الأزرار "التالي" و "السابق"
nextButton.addEventListener('click', goToNextVideo);
prevButton.addEventListener('click', goToPrevVideo);

// تحميل الروابط عند تحميل الصفحة
loadLinks([]);

// تأكد من أن الأزرار لا تعمل عند تحميل الصفحة بدون روابط
toggleNavigationButtons();

// إضافة حدث لتوسيع/تصغير قائمة الروابط
toggleLinksButton.addEventListener('click', () => {
    if (linksList.style.display === 'none') {
        linksList.style.display = 'block';
        toggleLinksButton.textContent = 'إخفاء الروابط';
    } else {
        linksList.style.display = 'none';
        toggleLinksButton.textContent = 'إظهار الروابط';
    }
});
