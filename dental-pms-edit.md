## 2.8 Auth / OTP / Tokens - Summary

هذا الملخص يوضح دور الدوال الأساسية في المصادقة والـ OTP والـ tokens، ويعتمد التقسيم التالي:

- `REGISTER` للتسجيل الذاتي من التطبيق.
- `ACCOUNT_ACTIVATION` لتفعيل حساب مدعو أو ربط ملف Patient بحساب عبر السكرتيرة.
- `RESET_PASSWORD` لإعادة تعيين كلمة المرور.
- `CHANGE_PHONE` لتغيير رقم الهاتف.

### `src/modules/auth/services/token.service.ts`

- `issueTokenPair(...)`: ينشئ access token و refresh token بعد تسجيل الدخول أو التفعيل.
- `verifyRefreshToken(token)`: يتحقق من refresh token ويرجع `sub` الخاص بالحساب.
- `issueActivationToken(accountId)`: ينشئ token قصير العمر لتفعيل الحسابات المدعوة.
- `verifyActivationToken(token)`: يتحقق من activation token ويتأكد من purpose.
- `issueResetPasswordToken(accountId)`: ينشئ token قصير العمر لمرحلة تغيير كلمة المرور بعد OTP.
- `verifyResetPasswordToken(token)`: يتحقق من reset token ويتأكد من purpose.

### `src/modules/auth/services/otp.service.ts`

- `send(accountId, phone, type)`: يولد OTP جديدًا ويحفظه ثم يرسله عبر SMS.
- `verify(accountId, type, code)`: يتحقق من آخر OTP لنفس الحساب والنوع ويعلّمه كمستخدم عند النجاح.
- `sendWithMetadata(accountId, phone, type, metadata)`: يرسل OTP مع metadata JSON إضافية.
- `verifyAndReturnMetadata(accountId, type, code)`: يتحقق من OTP ويعيد الصف مع metadata بعد نجاحه.

### `src/modules/auth/services/auth.service.ts`

- `registerStart(dto)`: ينشئ حسابًا بحالة `PENDING_ACTIVATION` أو يعيد إرسال OTP إذا كان التسجيل غير مكتمل.
- `registerVerify(dto)`: يتحقق من OTP للتسجيل الذاتي ويمنح الحساب دور PATIENT.
- `login(dto)`: يعيد tokens إذا كان الحساب `ACTIVE` أو temporary token إذا كان `INVITED`.
- `completeActivation(dto)`: يفعّل حسابًا مدعوًا باستخدام temporary token ويضبط كلمة المرور النهائية.
- `createPatientAccount(patientId, dto)`: ينشئ حساب مريض `INVITED` بكلمة مرور مؤقتة ويربطه مباشرة بجدول Patient.
- `generateTempPassword()`: يولد كلمة مرور مؤقتة عشوائية للمريض الذي أنشأته السكرتيرة.
- `buildAuthenticatedResponse(...)`: يبني `TokenPairDto` موحدًا بعد أي عملية نجاح تحتاج tokens.
- `refresh(dto)`: يجدد token pair من refresh token صالح.
- `logout()`: نقطة شكلية فقط في هذا الإصدار.
- `forgotPassword(dto)`: يرسل OTP من نوع `RESET_PASSWORD` إذا كان الحساب موجودًا.
- `verifyResetOtp(dto)`: يتحقق من OTP ويعيد `resetToken` قصير العمر.
- `resetPassword(dto)`: يتحقق من `resetToken` ويغيّر كلمة المرور الجديدة.
- `startChangePhone(accountId, dto)`: يرسل OTP لتغيير الهاتف ويمنع اختيار الرقم الحالي نفسه.
- `confirmChangePhone(accountId, dto)`: يتحقق من OTP ويحدث رقم الهاتف.
- `toggleBiometric(accountId, dto)`: يفعّل أو يعطل تسجيل الدخول بالبصمة.
- `startInvitationActivation(phone)`: يرسل OTP لتفعيل حساب مدعو.
- `activateInvitation(dto)`: يفعّل الحساب المدعو ويربطه بمريض إذا كانت metadata تحتوي `linkPatientId`.
- `invitePatientAccount(patientId, phone)`: يرسل OTP دعوة مع `linkPatientId` لربط مريض موجود بحساب لاحقًا.
- `changePassword(accountId, dto)`: يغيّر كلمة المرور الحالية بعد التحقق منها.
- `setLanguage(accountId, dto)`: يحدّث لغة الحساب المفضلة.

### `src/modules/accounts/services/accounts.service.ts`

- `list(pagination)`: يعرض قائمة الحسابات مع pagination.
- `findOne(id)`: يجلب حسابًا واحدًا لواجهات الإدارة.
- `create(dto, createdById)`: ينشئ حساب موظف `INVITED` ويربطه بدور محدد.
- `update(id, dto)`: يحدّث بيانات الحساب.
- `updateStatus(id, dto, currentAccountId)`: يغير الحالة مع منع تعطيل النفس ومنع تعطيل آخر طبيب.
- `resetPassword(id, dto)`: يعيد تعيين كلمة مرور موظف من لوحة الإدارة مباشرة.

### ملاحظة تصميمية

- الأفضل إبقاء `ACCOUNT_ACTIVATION` للدعوات والربط، و`REGISTER` للتسجيل الذاتي، لأن هذا يفصل بين مسار المريض ومسار السكرتيرة بشكل أوضح في البيانات والتتبع.
- `DOCTOR_ROLE_CODE` ثابت لأنه يمثل قاعدة عمل ثابتة في النظام، وليس قيمة تأتي من المستخدم أو من الطلب.
