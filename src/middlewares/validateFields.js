import { validationResult } from 'express-validator';

// Middleware to validate request fields
export function validateFields(req, res, next) {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        // If there are not validation errors, send an array of errors
        return res.status(400).json({
            success: false,
            errors: errors.array().map(error => ({
                msg: error.msg,
                param: error.param,
                location: error.location
            })),
        })
    }
    next(); // If no errors, proceed to the next middleware
}