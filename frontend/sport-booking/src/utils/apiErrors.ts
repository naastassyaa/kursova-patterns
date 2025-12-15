import { AxiosError } from 'axios';

type DrfError =
  | { detail?: string }
  | { non_field_errors?: string[] }
  | Record<string, string[] | string>;

// Map HTTP status codes to user-friendly messages
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Невірні дані. Перевірте введену інформацію.',
  401: 'Потрібна авторизація. Будь ласка, увійдіть в систему.',
  403: 'Доступ заборонено. У вас немає прав для виконання цієї дії.',
  404: 'Ресурс не знайдено.',
  405: 'Ця операція не підтримується.',
  409: 'Конфлікт даних. Можливо, ці дані вже існують.',
  422: 'Помилка валідації. Перевірте введені дані.',
  429: 'Забагато запитів. Спробуйте пізніше.',
  500: 'Помилка сервера. Спробуйте пізніше або зверніться до підтримки.',
  502: 'Помилка з\'єднання з сервером. Спробуйте пізніше.',
  503: 'Сервіс тимчасово недоступний. Спробуйте пізніше.',
};

// Map common error patterns to user-friendly messages
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /Method.*not allowed/i, message: 'Ця операція не підтримується.' },
  { pattern: /not found/i, message: 'Ресурс не знайдено.' },
  { pattern: /permission denied/i, message: 'У вас немає прав для виконання цієї дії.' },
  { pattern: /authentication/i, message: 'Потрібна авторизація. Будь ласка, увійдіть в систему.' },
  { pattern: /validation/i, message: 'Помилка валідації. Перевірте введені дані.' },
  { pattern: /network/i, message: 'Помилка з\'єднання. Перевірте інтернет-з\'єднання.' },
  { pattern: /timeout/i, message: 'Час очікування вийшов. Спробуйте ще раз.' },
];

export const parseApiError = (error: unknown, defaultMessage = 'Сталася помилка. Спробуйте пізніше.') => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data as DrfError | string | undefined;
    
    // First, check for status code-based messages
    if (status && STATUS_MESSAGES[status]) {
      // But allow detail message to override if it's more specific
      if (data && typeof data === 'object' && 'detail' in data && typeof (data as any).detail === 'string') {
        const detailMessage = (data as any).detail;
        // Only use status message if detail is too technical
        if (detailMessage.length < 100 && !detailMessage.includes('Method') && !detailMessage.includes('not allowed')) {
          return detailMessage;
        }
      }
      return STATUS_MESSAGES[status];
    }
    
    if (!data) {
      // Check error message for patterns
      if (error.message) {
        for (const { pattern, message } of ERROR_PATTERNS) {
          if (pattern.test(error.message)) {
            return message;
          }
        }
      }
      return defaultMessage;
    }
    
    // Handle HTML error pages (Django debug pages)
    if (typeof data === 'string' && data.includes('<!DOCTYPE html>')) {
      // Try to extract error message from HTML
      const detailMatch = data.match(/ValidationError[^<]*/i);
      if (detailMatch) {
        return 'Помилка валідації. Перевірте введені дані.';
      }
      // Check for method not allowed in HTML
      if (data.includes('Method') && data.includes('not allowed')) {
        return 'Ця операція не підтримується.';
      }
      return defaultMessage;
    }
    
    if (typeof data === 'string') {
      // Check for common error patterns
      for (const { pattern, message } of ERROR_PATTERNS) {
        if (pattern.test(data)) {
          return message;
        }
      }
      // If it's a plain string but not HTML, check length
      if (data.length < 200 && !data.includes('Method') && !data.includes('not allowed')) {
        return data;
      }
      return defaultMessage;
    }
    
    // Handle JSON error responses
    if (typeof data === 'object' && data !== null) {
      if ('detail' in data && typeof (data as any).detail === 'string' && (data as any).detail) {
        const detailMessage = (data as any).detail;
        // Check for technical error messages
        for (const { pattern, message } of ERROR_PATTERNS) {
          if (pattern.test(detailMessage)) {
            return message;
          }
        }
        // Only return detail if it's user-friendly
        if (detailMessage.length < 200 && !detailMessage.includes('Method') && !detailMessage.includes('not allowed')) {
          return detailMessage;
        }
        return STATUS_MESSAGES[status || 500] || defaultMessage;
      }
      if (
        'non_field_errors' in data &&
        Array.isArray((data as any).non_field_errors) &&
        (data as any).non_field_errors.length
      ) {
        return (data as any).non_field_errors[0];
      }
      const firstField = Object.keys(data)[0];
      const fieldValue = firstField ? (data as any)[firstField] : null;
      if (Array.isArray(fieldValue) && fieldValue.length) {
        return fieldValue[0];
      }
    }
  }
  
  // Handle non-Axios errors
  if (error instanceof Error && error.message) {
    for (const { pattern, message } of ERROR_PATTERNS) {
      if (pattern.test(error.message)) {
        return message;
      }
    }
    // Only return error message if it's user-friendly
    if (error.message.length < 200 && !error.message.includes('Method') && !error.message.includes('not allowed')) {
      return error.message;
    }
  }
  
  return defaultMessage;
};

