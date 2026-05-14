const fs = require('fs');

let rTxt = fs.readFileSync('src/components/ReportsPage.tsx', 'utf8');
rTxt = rTxt.replace('interface ReportsPageProps {', 'interface ReportsPageProps {\n isPartner?: boolean;');
rTxt = rTxt.replace(/setDeepLinkData\s*\}\)\s*=>\s*\{/, 'setDeepLinkData,\n isPartner = false\n}) => {');

fs.writeFileSync('src/components/ReportsPage.tsx', rTxt);

let appTxt = fs.readFileSync('src/App.tsx', 'utf8');
const partnerCase = `        case 'invoices-list': return (
          <ReportsPage 
            data={data} 
            setData={setData} 
            defaultTab="invoices" 
            deepLinkData={deepLinkData}
            onClearDeepLink={() => setDeepLinkData({})}
            isPartner={true}
          />
        );
        case 'orders': return <OrderPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} isPartner={true} />;`;
appTxt = appTxt.replace("        case 'orders': return <OrderPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} isPartner={true} />;", partnerCase);

fs.writeFileSync('src/App.tsx', appTxt);
console.log("App and Reports interface patched");
