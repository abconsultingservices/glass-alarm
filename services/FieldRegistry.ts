import { ValidationRule } from '../utils/ValidationEngine';

export interface RegistryField {
    label: string;
    dbColumn?: string; 
    // Updated to include our new Liquid Glass types
    type?: 'text' | 'email' | 'phone' | 'url' | 'password' | 'select' | 'date' | 'time' | 'customDays' | 'switch' | 'select-nav';
    validation?: ValidationRule[];
    overrideFilter?: RegExp;
    config?: any;
    options?: { label: string; value: any }[]; // Options for select pills
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
        },
        isActive: {
            label: 'Routine Enabled',
            type: 'switch',
            config: { defaultValue: true }
        }
    },
    routine_schedules: {
        startDate: {
            label: 'Start Date',
            type: 'date',
            validation: [{ type: 'required', errorMsg: 'When should this start?' }]
        },
        startTime: {
            label: 'Start Time',
            type: 'time',
            validation: [{ type: 'required', errorMsg: 'What time?' }]
        },
        endDate: {
            label: 'End Date (Optional)',
            type: 'date'
        },
        type: {
            label: 'Repeat',
            type: 'select-nav',
            options: [
                { label: 'Daily', value: 'daily' },
                { label: 'Weekdays', value: 'weekdays' },
                { label: 'Weekends', value: 'weekends' },
                { label: 'Custom', value: 'custom' },
            ]
        },
        customDays: {
            label: 'Select Days',
            type: 'customDays',
            validation: [{ type: 'required', errorMsg: 'Select at least one day' }]
        },
        frequencyHours: {
            label: 'Repeat Every (Hours)',
            config: { keyboardType: 'number-pad', placeholder: '4' }
        },
        maxOccurrences: {
            label: 'Max Hits Per Day',
            config: { keyboardType: 'number-pad', placeholder: '3' }
        }
    }
};