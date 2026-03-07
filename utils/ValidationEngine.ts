import { Section } from '../components/GlassFormRenderer';

export interface ValidationRule {
    type: 'length' | 'email' | 'phone' | 'regex' | 'url' | 'required';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    errorMsg: string;
}

export const validateValue = (value: string, rules: ValidationRule[]): string => {
    // Requirements: Error messages only happen when a field is populated
    if (!value || rules.length === 0) return '';

    for (const rule of rules) {
        switch (rule.type) {
            case 'required':
                if(value.length < 1 )
                {
                    return rule.errorMsg;
                }
                else
                {
                    return '';
                }
                break;
            case 'length':
                if (rule.minLength && value.length < rule.minLength) return rule.errorMsg;
                if (rule.maxLength && value.length > rule.maxLength) return rule.errorMsg;
                break;
            case 'email':
                // RFC 5322 Standard Filter
                // Disallows: ! ; , ( ) [ ] < > \ " and spaces
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                
                if (!emailRegex.test(value)) return rule.errorMsg;
                break;
            case 'phone':
                // Allows: +, 0-9, hyphens, comma, semicolon, *, #
                const phoneRegex = /^[+0-9\-\,\;\*\#\s]+$/;
                if (!phoneRegex.test(value)) return rule.errorMsg;
                break;
            case 'url':
                const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
                if (!urlRegex.test(value)) return rule.errorMsg;
                break;
            case 'regex':
                if (rule.pattern && !rule.pattern.test(value)) return rule.errorMsg;
                break;
        }
    }
    return '';
};

export const getInitialFormState = (schema: Section[]) => {
    const initialState: Record<string, any> = {};
    schema.forEach(section => {
        section.fields.forEach(field => {
            initialState[field.key] = field.defaultValue ?? '';
        });
    });
    return initialState;
};

export const getInitialErrorState = (schema: Section[]) => {
    const initialState: Record<string, string> = {};
    schema.forEach(section => {
        section.fields.forEach(field => {
            initialState[field.key] = '';
        });
    });
    return initialState;
};