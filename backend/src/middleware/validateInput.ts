import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const signupValidation: ValidationChain[] = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
  body('name').trim().notEmpty().withMessage('Name required').isLength({ max: 255 }),
  body('age').optional().isInt({ min: 1, max: 120 }).withMessage('Age 1-120'),
  body('blood_type').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  body('doctor_email').optional().trim().isEmail().normalizeEmail(),
  body('doctor_phone').optional().trim().matches(/^\+?[\d\s\-()]+$/),
];

export const loginValidation: ValidationChain[] = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password required'),
];

export const chatValidation: ValidationChain[] = [
  body('message').trim().notEmpty().withMessage('Message required')
    .isLength({ max: 2000 }).withMessage('Message max 2000 characters'),
];

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: errors.array().map((err: any) => ({
          field: err.param || err.path || 'unknown',
          message: err.msg
        }))
      }
    });
    return;
  }
  
  next();
};