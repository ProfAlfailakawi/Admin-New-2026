# iPhone Duo، الجولة 2

- الكتاب (صفحتان وكعب) فقط عند: `screen and (min-width:721px) and (max-width:1000px) and (min-height:520px) and (max-height:960px) and (orientation:landscape)` (App.tsx وduo-adaptive.css وindex.html). حُذف فرع الطولي 640-720 وفرع em ومفصل viewport-segments من شرط الكتاب.
- الطولي (669x867) عمود واحد عادي بلا كعب.
- منطقة الودجت العلوية اليمنى (116x116، للتطبيق المثبّت standalone فقط): القسم 6 من duo-adaptive.css. الشاشة الخارجية المطويّة 367x740 غير مغطاة عمدًا (لا تُميَّز عن iPhone عادي).
- القسم 7: شبكات md: داخل الصفحة تُحسب من عرض الصفحة (~460px).
- كل ذلك محاكاة (Chromium)، لا جهاز حقيقي.
