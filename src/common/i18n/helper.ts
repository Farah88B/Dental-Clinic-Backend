import { AUTH_ERROR_CODES } from "../constants/auth.constants";
import { ERROR_CODES } from "../constants/error-codes.constants";
import { OTP_ERROR_CODES } from "../constants/otp.constants";
export type Language = 'ar' | 'en';

// Central message catalog. Keep error codes (used in ErrorResponseDto.code)
// stable, and translate ONLY the human-facing message here — the frontend
// keys off `code`, never off the translated text.
const MESSAGES: Record<string, Record<Language, string>> = {
    [ERROR_CODES.NOT_FOUND]: {
    ar: 'العنصر المطلوب غير موجود',
    en: 'The requested item was not found',
  },
  [ERROR_CODES.DUPLICATE_VALUE]: {
    ar: 'هذه القيمة مستخدمة مسبقًا',
    en: 'This value is already in use',
  },
  [ERROR_CODES.IN_USE_CANNOT_DELETE]: {
    ar: 'لا يمكن حذف هذا العنصر لأنه مرتبط ببيانات أخرى',
    en: 'This item cannot be deleted because it is linked to other data',
  },
  [ERROR_CODES.INVALID_TOKEN]: {
    ar: 'جلسة الدخول غير صالحة أو منتهية',
    en: 'Your session is invalid or has expired',
  },
  [ERROR_CODES.NOT_AUTHENTICATED]: {
    ar: 'يجب تسجيل الدخول للوصول لهذه الخدمة',
    en: 'You must be logged in to access this resource',
  },
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: {
    ar: 'لا تملك الصلاحية الكافية لتنفيذ هذا الإجراء',
    en: 'You do not have sufficient permissions for this action',
  },
  [ERROR_CODES.CANNOT_DISABLE_LAST_ADMIN]: {
    ar: 'لا يمكن تعطيل آخر حساب مدير في النظام',
    en: 'Cannot disable the last remaining admin account',
  },
  [ERROR_CODES.INTERNAL_ERROR]: {
    ar: 'حدث خطأ غير متوقع، الرجاء المحاولة لاحقًا',
    en: 'An unexpected error occurred, please try again later',
  },
  [ERROR_CODES.PATIENT_FORM_OPTIONS_REQUIRED]: {
    ar: 'الخيارات مطلوبة لهذا النوع من حقول نموذج المريض',
    en: 'Options are required for this patient form field type',
  },
  [ERROR_CODES.PATIENT_FORM_DUPLICATE_FIELD_IDS]: {
    ar: 'يحتوي طلب ترتيب حقول نموذج المريض على معرّفات مكررة',
    en: 'The patient form field reorder request contains duplicate field IDs',
  },
  [ERROR_CODES.PATIENT_FORM_FIELD_NOT_FOUND]: {
    ar: 'حقل واحد أو أكثر من حقول نموذج المريض غير موجود',
    en: 'One or more patient form fields do not exist',
  },
  [ERROR_CODES.PATIENT_FORM_FIELD_TYPE_IN_USE]: {
    ar: 'لا يمكن تغيير نوع الحقل لأن بيانات المرضى تستخدمه بالفعل',
    en: 'The field type cannot be changed because patient records already use it',
  },
  [ERROR_CODES.PATIENT_DUPLICATE]: {
    ar: 'يوجد ملف طبي مشابه، يرجى مراجعة إدارة العيادة.',
    en: 'A similar patient record already exists. Please contact the clinic.',
  },
  [ERROR_CODES.PATIENT_FORM_REQUIRED_FIELD]: {
    ar: 'أحد الحقول المطلوبة في نموذج المريض مفقود',
    en: 'A required patient form field is missing',
  },
  [ERROR_CODES.PATIENT_FORM_UNKNOWN_FIELD]: {
    ar: 'يحتوي نموذج المريض على حقل غير معروف',
    en: 'The patient form contains an unknown field',
  },
  [ERROR_CODES.PATIENT_FORM_INACTIVE_FIELD]: {
    ar: 'يحتوي نموذج المريض على حقل غير نشط',
    en: 'The patient form contains an inactive field',
  },
  [ERROR_CODES.PATIENT_FORM_DUPLICATE_FIELD_VALUE]: {
    ar: 'يحتوي نموذج المريض على قيم مكررة للحقل نفسه',
    en: 'The patient form contains duplicate values for the same field',
  },
  [ERROR_CODES.PATIENT_FORM_INVALID_VALUE]: {
    ar: 'تحتوي بيانات نموذج المريض على قيمة غير صالحة',
    en: 'The patient form contains an invalid value',
  },
  [ERROR_CODES.PATIENT_FORM_INACTIVE_OPTION]: {
    ar: 'تحتوي بيانات نموذج المريض على خيار غير نشط',
    en: 'The patient form contains an inactive option',
  },
  [AUTH_ERROR_CODES.CANNOT_DISABLE_SELF]: {
    ar: 'لا يمكنك تعطيل حسابك الخاص أثناء تسجيل دخولك',
    en: 'You cannot disable your own account while logged in',
  },
  [AUTH_ERROR_CODES.INCORRECT_PASSWORD]: {
    ar: 'كلمة المرور الحالية غير صحيحة',
    en: 'The current password is incorrect',
  },
  [AUTH_ERROR_CODES.ACCOUNT_NOT_ACTIVE]: {
    ar: 'الحساب غير نشط',
    en: 'The account is not active',
  },
    [OTP_ERROR_CODES.OTP_EXPIRED]: {
    ar: 'انتهت صلاحية رمز التحقق',
    en: 'Verification code has expired',
  },
  [OTP_ERROR_CODES.OTP_INVALID]: {
    ar: 'رمز التحقق غير صحيح',
    en: 'Invalid verification code',
  },
  [OTP_ERROR_CODES.OTP_MAX_ATTEMPTS]: {
    ar: 'تم تجاوز الحد الأقصى لمحاولات التحقق',
    en: 'Maximum verification attempts exceeded',
  },
  [OTP_ERROR_CODES.OTP_ALREADY_USED]: {
    ar: 'رمز التحقق مستخدم مسبقًا',
    en: 'Verification code has already been used',
  },
  [AUTH_ERROR_CODES.ACCOUNT_NOT_INVITED]: {
    ar: 'هذا الحساب ليس بحالة دعوة',
    en: 'This account is not in invited status',
  },
  [ERROR_CODES.PATIENT_STATUS_ALREADY_EXISTS]: {
    ar: 'المريض لديه هذه الحالة بالفعل',
    en: 'Patient already has this status',
  },
  [ERROR_CODES.PATIENT_ARCHIVED_CANNOT_UPDATE]: {
    ar: 'لا يمكن تعديل ملف مريض مؤرشف',
    en: 'Cannot update an archived patient record',
  },
  [AUTH_ERROR_CODES.PASSWORDS_DO_NOT_MATCH]: {
    ar: 'كلمتا المرور غير متطابقتين',
    en: 'Passwords do not match',
  },
};

const DEFAULT_LANGUAGE: Language = 'ar';

// أضيفي هالدالة جنب translate() الموجودة:
export function isKnownErrorCode(code: string): boolean {
  return code in MESSAGES;
}
export function translate(code: string, lang: Language = DEFAULT_LANGUAGE): string {
  return (
  MESSAGES[code]?.[lang] ??
  MESSAGES[ERROR_CODES.INTERNAL_ERROR][lang]
);
}

// Resolves the preferred language from an Accept-Language header, falling
// back to Arabic since it's the primary language per the SRS (RTL, CR-1).
export function resolveLanguageFromHeader(header?: string): Language {
  if (header?.toLowerCase().startsWith('en')) return 'en';
  return 'ar';
}

export function resolveLanguageFromRequest(request: {
  headers?: Record<string, string | string[] | undefined>;
  user?: { preferredLanguage?: string };
}): Language {
  const preferredLanguage = request.user?.preferredLanguage?.toLowerCase();

  if (preferredLanguage === 'en' || preferredLanguage === 'ar') {
    return preferredLanguage;
  }

  return resolveLanguageFromHeader(
    Array.isArray(request.headers?.['accept-language'])
      ? request.headers['accept-language'][0]
      : request.headers?.['accept-language'],
  );
}
