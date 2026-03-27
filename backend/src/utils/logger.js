import fs from 'fs';
import path from 'path';

export const logAuth = (email, ip, rol, status = "SUCCESS") => {
    const logDir = '/media/hong/HONG_MOVIES/backend/logs';
    // 🛡️ Crea la carpeta si no existe
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    const fecha = new Date().toLocaleString('es-ES');
    const logLine = `[${fecha}] ${status} | Usuario: ${email} | IP: ${ip} | Rol: ${rol}\n`;
    
    fs.appendFileSync(path.join(logDir, 'auth_audit.log'), logLine);
};

