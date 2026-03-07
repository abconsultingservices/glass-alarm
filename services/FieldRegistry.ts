// constants/FieldRegistry.ts
import { ValidationRule } from '../utils/ValidationEngine';

export interface RegistryField {
    label: string;
    dbColumn?: string; // If the DB column differs from the schema key
    type?: 'text' | 'email' | 'phone' | 'url' | 'password';
    validation?: ValidationRule[];
    overrideFilter?: RegExp;
    config?: any;
}

export const fieldRegistry: Record<string, Record<string, RegistryField>> = {
    users: {
        name: {
            label: 'Display Name',
            dbColumn: 'name', // Example: schema key is 'name', DB is 'full_name'
            validation: [{ type: 'required', errorMsg: 'Name is required' }],
            overrideFilter: /[^a-zA-Z\s\-']/g,
        },
        email: {
            label: 'Email Address',
            type: 'email',
            validation: [{ type: 'email', errorMsg: 'Invalid email' }],
        },
        email: {
            label: 'Phone',
            type: 'phone',
            validation: [{ type: 'phone', errorMsg: 'Invalid phone' }],
        }
    },
    routines: {
        name: {
            label: 'Routine Title',
            dbColumn: 'title',
            validation: [{ type: 'required', message: 'Title is required' }],
            config: { placeholder: 'e.g. Morning Ritual' }
        }
    }
};