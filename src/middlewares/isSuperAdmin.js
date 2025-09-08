
export const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'superadmin') {
        next();
    } else {
        res.status(403).json({
            message: 'Access denied. role superadmin is required.'
        });
    }
};

