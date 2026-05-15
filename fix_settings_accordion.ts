import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/GeneralSettings.tsx', 'utf8');

// 1. Remove floating EnableNotificationsButton
const floatingBtnRegex = /<div className="mb-6"><EnableNotificationsButton[^>]*><\/div>\n/g;
content = content.replace(floatingBtnRegex, '');

// 2. Add Notifications Accordion
const accordionHTML = `
        {/* Notifications Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            onClick={() => setActiveSection(activeSection === 'notifications' ? '' : 'notifications')}
            className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-secondary" />
              <h2 className="font-bold">إشعارات النظام</h2>
            </div>
            <div className="flex items-center gap-4">
              <ChevronDown size={20} className={cn("text-slate-400 transition-transform duration-300", activeSection === 'notifications' ? "rotate-180" : "")} />
            </div>
          </button>
          <div className={cn("transition-all duration-300 relative", activeSection === 'notifications' ? "block" : "hidden")}>
            <div className="p-3 md:p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-500 font-bold mb-2">تفعيل الإشعارات للحصول على التنبيهات الفورية من النظام.</p>
                <EnableNotificationsButton userId={auth?.currentUser?.uid || "local_user"} restaurantId="kitchen_default" />
              </div>
            </div>
          </div>
        </section>

`;

content = content.replace('{/* Zones Management Section */}', accordionHTML + '{/* Zones Management Section */}');

writeFileSync('src/components/GeneralSettings.tsx', content);
console.log("Updated GeneralSettings.tsx accordion");
