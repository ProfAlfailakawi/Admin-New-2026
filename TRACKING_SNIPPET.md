# كود التعبئة التلقائية لصفحة التتبع (alturathkw.shop/track)

بما أن صفحة التتبع غير موجودة ضمن ملفات هذا المشروع (لوحة التحكم)، يرجى إضافة هذا الكود البرمجي (Snippet) إلى كود صفحة التتبع الخاصة بك (في المتجر أو صفحة التتبع الخارجية).

هذا الكود يقوم بـ:
1. قراءة رقم الهاتف من `localStorage` أولاً، ثم من `window.name` كخيار احتياطي.
2. تعبئة الرقم في حقل الإدخال تلقائياً.
3. مسح الرقم المحفوظ فوراً لمنع ظهوره لحالات/أشخاص آخرين مستقبلاً.
4. إطلاق أحداث (events) لضمان توافق القيمة مع الأطر الحديثة (React, Vue, ...الخ).

```javascript
document.addEventListener("DOMContentLoaded", () => {
    // 1. محاولة قراءة الرقم من المسار الأساسي (localStorage) ثم الاحتياطي (window.name)
    // نتأكد أن window.name ليس '_blank' وهو الافتراضي للروابط الجديدة
    let phoneToFill = localStorage.getItem('customer_phone_track');
    
    if (!phoneToFill && window.name && window.name !== '_blank' && window.name.length > 5) {
        phoneToFill = window.name;
    }

    if (phoneToFill) {
        // يمكنك تغيير هذا الـ Selector ليطابق حقل رقم الهاتف في صفحتك
        const phoneInput = document.getElementById('phoneInput') || document.querySelector('input[type="tel"]') || document.querySelector('input[name="phone"]');
        
        if (phoneInput) {
            // 2. تعبئة الرقم
            // @ts-ignore
            phoneInput.value = phoneToFill;
            
            // إرسال تنبيهات برمجية للمتصفح لتفعيله داخل (React / Vue)
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
            phoneInput.dispatchEvent(new Event('change', { bubbles: true }));

            // 3. التنظيف الفوري للتخلص من التعقب القديم (حتى لا يُعبأ الرقم مجدداً)
            localStorage.removeItem('customer_phone_track');
            window.name = '';

            // 4. تشغيل عملية البحث التلقائية مرة واحدة فقط
            // يمكنك تغيير الـ Selector ليطابق زر البحث في صفحتك
            const searchBtn = document.getElementById('searchButton') || document.querySelector('button[type="submit"]');
            
            if (searchBtn) {
                // إعطاء مهلة بسيطة 100 ملي ثانية لضمان استيعاب النظام الخارجي لرقم الهاتف
                setTimeout(() => {
                    // @ts-ignore
                    searchBtn.click();
                }, 100);
            }
        }
    }
});
```

### ملاحظة:
التطبيق الداخلي (لوحة التحكم) جاهز الآن، حيث يفتح رابط التتبع بشكل نظيف جداً `https://alturathkw.shop/track` ويقوم بحفظ البيانات في الذاكرة لتستقبلها بالملف الخارجي عبر الكود أعلاه.
