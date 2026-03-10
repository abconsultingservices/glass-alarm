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
            label: 'Routine Name',
            validation: [{ type: 'required', errorMsg: 'Give your routine a name' }],
            config: { placeholder: 'e.g., Morning Water' }
        },
        duration: {
            label: 'Duration (Mins)',
            config: { keyboardType: 'number-pad', placeholder: '30' }
        }
    },
    routine_schedules: {
        startTime: {
            label: 'Start Time',
            config: { placeholder: '08:00' } // In a full build, use a TimePicker here
        },
        type: {
            label: 'Repeat',
            config: { defaultValue: 'daily' }
        },
        frequencyHours: {
            label: 'Every X Hours',
            config: { keyboardType: 'number-pad', placeholder: '4' }
        },
        maxOccurrences: {
            label: 'Max Times Per Day',
            config: { keyboardType: 'number-pad', placeholder: '3' }
        }
    }
};