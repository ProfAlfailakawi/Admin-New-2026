export function createAlertsRequireSecret(configuredSecret: string | undefined) {
    return function alertsRequireSecret(req: any, res: any, next: any) {
        if (!configuredSecret || configuredSecret === "") {
            return res.status(500).json({ success: false, error: "ADMIN_TEST_SECRET is not configured on the server" });
        }
        const secret = req.headers["x-admin-secret"] || req.query.secret;
        if (String(secret) !== String(configuredSecret)) {
            return res.status(403).json({ success: false, error: "Forbidden" });
        }
        next();
    }
}
