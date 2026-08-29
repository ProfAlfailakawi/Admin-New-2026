import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace('app.post("/api/create-payment", async (req, res) => {', 'app.post("/api/create-payment", async (req, res) => {\n    // Validate Input Sizes\n    if (typeof req.body.amount !== "number" || typeof req.body.customerName !== "string" || req.body.customerName.length > 255) {\n      return res.status(400).json({ error: "Invalid payment payload" });\n    }\n');
fs.writeFileSync('server.ts', content);
