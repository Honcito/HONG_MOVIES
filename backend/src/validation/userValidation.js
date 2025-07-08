import { body } from 'express-validator';

// Rules to validate request body
export const userValidation = [
    // Name cannot be empty
    body('username', 'Username is required').not().isEmpty(),
    // Validate email
    body('email', 'Email must be a valid one'),
    // Rol cannot be empty
    body('rol', 'Rol is required').not().isEmpty(),
];