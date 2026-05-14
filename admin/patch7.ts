import fs from 'fs';

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

appContent = appContent.replace(
  "// 3. Reset internal state immediately\n        setData(INITIAL_DATA);\n        toast.info(\"تم مسح البيانات بنجاح\", { \n          description: \"تم حذف كافة البيانات المحلية والاحتياطية التجريبية فور تسجيل الخروج.\" \n        });",
  "// 3. Keep internal state intact so it saves to local storage properly upon exit\n        // setData(INITIAL_DATA);"
);

appContent = appContent.replace(
  "// Implement user's request: If logging out from local mode, delete all data from LocalStorage and Cloud (if manual sync was used)",
  "// Implement user's request: Keep local mode data preserved across sessions"
);

fs.writeFileSync('src/App.tsx', appContent);

console.log("Patch 7 applied.");
