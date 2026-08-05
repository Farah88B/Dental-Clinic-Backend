import { AUTH_ERROR_CODES } from "../constants/auth.constants";
import { ERROR_CODES } from "../constants/error-codes.constants";
import { OTP_ERROR_CODES } from "../constants/otp.constants";
import { TREATMENT_ERROR_CODES } from "../constants/treatment.constants";
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
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: {
    ar: 'تم تجاوز الحد المسموح من الطلبات، حاول مرة أخرى لاحقًا',
    en: 'Too many requests. Please try again later',
  },
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: {
    ar: 'رقم الهاتف أو كلمة المرور غير صحيحة',
    en: 'Invalid phone number or password',
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
  [AUTH_ERROR_CODES.NEW_PHONE_SAME_AS_CURRENT]: {
    ar: 'رقم الهاتف الجديد مطابق للرقم الحالي',
    en: 'The new phone number is the same as your current one',
  },
  [AUTH_ERROR_CODES.INCORRECT_PASSWORD]: {
    ar: 'كلمة المرور الحالية غير صحيحة',
    en: 'The current password is incorrect',
  },
  [AUTH_ERROR_CODES.ACCOUNT_NOT_ACTIVE]: {
    ar: 'الحساب غير نشط',
    en: 'The account is not active',
  },
  [AUTH_ERROR_CODES.ACCOUNT_NOT_ACTIVATED]: {
    ar: 'الحساب غير مفعل، يرجى إكمال عملية التفعيل',
    en: 'The account is not activated, please complete activation',
  },
  [AUTH_ERROR_CODES.ACCOUNT_PENDING_ACTIVATION]: {
    ar: 'الحساب غير مفعل، يرجى إكمال عملية التحقق',
    en: 'The account is pending activation, please complete verification',
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
  [OTP_ERROR_CODES.OTP_RESEND_TOO_SOON]: {
  ar: 'يرجى الانتظار قبل طلب رمز تحقق جديد',
  en: 'Please wait before requesting a new verification code',
},

[OTP_ERROR_CODES.OTP_RESEND_LIMIT_EXCEEDED]: {
  ar: 'تم تجاوز الحد المسموح لإرسال رموز التحقق، يرجى المحاولة لاحقًا',
  en: 'The maximum verification code resend limit has been exceeded, please try again later',
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
  [ERROR_CODES.MEDIA_FILE_REQUIRED]: {
    ar: 'الملف مطلوب',
    en: 'A file is required',
  },
  [ERROR_CODES.MEDIA_INVALID_FILE_TYPE]: {
    ar: 'نوع الملف غير مسموح',
    en: 'This file type is not allowed',
  },
  [ERROR_CODES.MEDIA_FILE_NOT_FOUND]: {
    ar: 'الملف غير موجود',
    en: 'Media file was not found',
  },
  [ERROR_CODES.INVALID_WORKING_HOURS_RANGE]: {
    ar: 'نطاق ساعات الدوام أو الاستراحات غير صالح',
    en: 'Working hours or break range is invalid',
  },
  [ERROR_CODES.PAST_DATE_NOT_ALLOWED]: {
    ar: 'لا يمكن إنشاء استثناء لتاريخ ماضٍ',
    en: 'Cannot create a schedule exception for a past date',
  },
  [ERROR_CODES.SCHEDULE_CHANGE_HAS_CONFLICTS]: {
    ar: 'تغيير الجدول يتعارض مع مواعيد قائمة. أكّد للمتابعة دون تعديل المواعيد.',
    en: 'This schedule change conflicts with existing appointments. Confirm to proceed without modifying them.',
  },
  [ERROR_CODES.INVALID_WORKING_HOURS_DAYS]: {
    ar: 'يجب إرسال الأيام السبعة بالكامل بدون تكرار',
    en: 'All seven weekdays must be provided exactly once',
  },
  [ERROR_CODES.INVALID_TIME_FORMAT]: {
    ar: 'صيغة الوقت غير صحيحة. استخدم HH:mm مثل 09:00',
    en: 'Invalid time format. Use HH:mm such as 09:00',
  },
  [ERROR_CODES.INVALID_OPERATION]: {
    ar: 'لا يمكن تنفيذ هذا الإجراء',
    en: 'This operation cannot be performed',
  },
  [AUTH_ERROR_CODES.PASSWORDS_DO_NOT_MATCH]: {
    ar: 'كلمتا المرور غير متطابقتين',
    en: 'Passwords do not match',
  },
  [AUTH_ERROR_CODES.ACCOUNT_DISABLED]: {
    ar: 'الحساب معطل، يرجى التواصل مع إدارة العيادة',
    en: 'The account is disabled, please contact the clinic administration',
  },
  [AUTH_ERROR_CODES.ACCOUNT_ALREADY_EXISTS]: {
    ar: 'الحساب موجود مسبقاً، يرجى تسجيل الدخول',
    en: 'The account already exists, please sign in',
  },
  [AUTH_ERROR_CODES.ACCOUNT_ALREADY_INVITED]: {
    ar: 'هذا الحساب مدعو مسبقاً، يرجى إكمال عملية التفعيل',
    en: 'This account is already invited, please complete activation',
  },
  [TREATMENT_ERROR_CODES.SESSION_ORDER_ALREADY_EXISTS]: {
    ar: 'ترتيب الجلسة مستخدم مسبقًا ضمن هذا القالب',
    en: 'This session order already exists within this template',
  },
  [TREATMENT_ERROR_CODES.TEMPLATE_HAS_NO_SESSIONS]: {
    ar: 'قالب الخطة العلاجية لا يحتوي على أي جلسات',
    en: 'The treatment plan template has no sessions',
  },
  [TREATMENT_ERROR_CODES.SESSION_NOT_STARTABLE]: {
    ar: 'لا يمكن بدء هذه الجلسة في حالتها الحالية',
    en: 'This session cannot be started in its current status',
  },
  [TREATMENT_ERROR_CODES.SESSION_NOT_COMPLETABLE]: {
    ar: 'لا يمكن إنهاء هذه الجلسة في حالتها الحالية',
    en: 'This session cannot be completed in its current status',
  },
  [TREATMENT_ERROR_CODES.SESSION_NOT_CANCELLABLE]: {
    ar: 'لا يمكن إلغاء هذه الجلسة في حالتها الحالية',
    en: 'This session cannot be cancelled in its current status',
  },
  [TREATMENT_ERROR_CODES.SESSION_NOT_UPDATABLE]: {
    ar: 'لا يمكن تعديل هذه الجلسة في حالتها الحالية',
    en: 'This session cannot be updated in its current status',
  },
  [TREATMENT_ERROR_CODES.RATING_WINDOW_EXPIRED]: {
    ar: 'انتهت مدة التقييم المسموحة لهذه الجلسة',
    en: 'The rating window for this session has expired',
  },
  [TREATMENT_ERROR_CODES.RATING_ALREADY_SUBMITTED]: {
    ar: 'تم تقييم هذه الجلسة مسبقًا',
    en: 'This session has already been rated',
  },
  [TREATMENT_ERROR_CODES.SESSION_NOT_RATEABLE]: {
    ar: 'لا يمكن تقييم هذه الجلسة',
    en: 'This session cannot be rated',
  },
  [TREATMENT_ERROR_CODES.INVALID_TEETH_LENGTH]: {
    ar: 'مصفوفة الأسنان يجب أن تحتوي على 48 عنصرًا',
    en: 'The teeth array must contain exactly 48 entries',
  },
  [TREATMENT_ERROR_CODES.APPOINTMENT_PATIENT_MISMATCH]: {
    ar: 'الموعد لا يتبع لنفس المريض المرتبط بالخطة',
    en: 'The appointment does not belong to the same patient as the plan',
  },
  [TREATMENT_ERROR_CODES.PLAN_STATUS_MUST_BE_CANCELLED]: {
    ar: 'يمكن فقط تعيين حالة الخطة إلى ملغاة',
    en: 'Treatment plan status can only be set to CANCELLED',
  },
  [TREATMENT_ERROR_CODES.INVALID_ATTACHMENT_FILE_COUNT]: {
    ar: 'عدد الملفات غير صحيح لهذا النوع من المرفقات (صورة: ملفان بالضبط، أشعة/تقرير: ملف واحد على الأقل)',
    en: 'Wrong file count for this attachment type (PHOTO: exactly 2 files; XRAY/REPORT: at least 1)',
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
