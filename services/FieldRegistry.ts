// constants/FieldRegistry.ts
import { ValidationRule } from '../utils/ValidationEngine';

export interface RegistryField {
    label: string;
    dbColumn?: string; 
    type?: 'text' | 'email' | 'phone' | 'url' | 'password';
    validation?: ValidationRule[];
    overrideFilter?: RegExp;
    config?: any;
}

export const fieldRegistry: Record<string, Record<string, RegistryField>> = {
    users: {
        firstName: {
            label: 'First Name',
            dbColumn: 'firstName',
            validation: [{ type: 'required', errorMsg: 'First name is required' }],
            overrideFilter: /[^a-zA-Z\s\-']/g,
        },
        lastName: {
            label: 'Last Name',
            dbColumn: 'lastName',
            validation: [{ type: 'required', errorMsg: 'Last name is required' }],
            overrideFilter: /[^a-zA-Z\s\-']/g,
        },
        email: {
            label: 'Email Address',
            type: 'email',
            validation: [{ type: 'email', errorMsg: 'Invalid email' }],
        }
    },
    groups: {
        name: {
            label: 'Group Name',
            dbColumn: 'name',
            validation: [{ type: 'required', errorMsg: 'Group name is required' }],
        }
    },
    routines: {
        name: {
            label: 'Routine Title',
            dbColumn: 'name',
            validation: [{ type: 'required', errorMsg: 'Title is required' }],
            config: { placeholder: 'e.g. Morning Ritual' }
        }
    }
};