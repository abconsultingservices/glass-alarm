import { Section } from '../components/GlassFormRenderer';

export interface ValidationRule {
    type: 'length' | 'email' | 'phone' | 'regex' | 'url' | 'required';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    errorMsg: string;
}

export const validateValue = (value: any, rules: ValidationRule[]): string => {
    if (!rules || rules.length === 0) return '';
    
    // Convert to string for length checks, but handle null/undefined safely
    const valStr = value === null || value === undefined ? '' : String(value);

    for (const rule of rules) {
        switch (rule.type) {
            case 'required':
                if (valStr.trim().length < 1) return rule.errorMsg;
                break;
            case 'length':
                if (rule.minLength && valStr.length < rule.minLength) return rule.errorMsg;
                if (rule.maxLength && valStr.length > rule.maxLength) return rule.errorMsg;
                break;
            case 'email':
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (!emailRegex.test(valStr)) return rule.errorMsg;
                break;
            case 'phone':
                const phoneRegex = /^[+0-9\-\,\;\*\#\s]+$/;
                if (!phoneRegex.test(valStr)) return rule.errorMsg;
                break;
            case 'url':
                const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
                if (!urlRegex.test(valStr)) return rule.errorMsg;
                break;
            case 'regex':
                if (rule.pattern && !rule.pattern.test(valStr)) return rule.errorMsg;
                break;
        }
    }
    return '';
};

/**
 * Perform a deep validation sweep of the entire form based on the schema.
 * Handles top-level fields and indexed repeater fields (e.g. schedules.0.startTime)
 */
export const validateForm = (form: any, schema: Section[]): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {};

    schema.forEach(section => {
        // 1. Handle Task Sections (Optional validation if needed)
        if (section.sectionType === 'tasks') return;

        // 2. Handle Repeater Sections (e.g., Schedules)
        if (section.isRepeater && section.repeaterKey) {
            const list = form[section.repeaterKey] || [];
            
            // Requirement: Ensure at least one block exists if it's a required section
            if (list.length === 0) {
                newErrors[section.repeaterKey] = `At least one ${section.label || 'entry'} is required.`;
            }

            list.forEach((item: any, index: number) => {
                section.fields.forEach(field => {
                    if (field.validation) {
                        const error = validateValue(item[field.key], field.validation);
                        if (error) {
                            newErrors[`${section.repeaterKey}.${index}.${field.key}`] = error;
                        }
                    }
                });
            });
        } 
        // 3. Handle Standard Standard Sections
        else {
            section.fields.forEach(field => {
                if (field.validation) {
                    const error = validateValue(form[field.key], field.validation);
                    if (error) {
                        newErrors[field.key] = error;
                    }
                }
            });
        }
    });

    return newErrors;
};

export const getInitialFormState = (schema: Section[]) => {
    const initialState: Record<string, any> = {};
    schema.forEach(section => {
        if (section.isRepeater) {
            initialState[section.repeaterKey!] = [];
        } else {
            section.fields.forEach(field => {
                initialState[field.key] = field.config?.defaultValue ?? '';
            });
        }
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