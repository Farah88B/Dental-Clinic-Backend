# Chatbot — تفاصيل التنفيذ + اختيار الـ LLM API

---

## 1. هل التنفيذ صعب؟

**لأ، مش صعب تقنياً.** الصعوبة الحقيقية بهالميزة مش بالكود (هو أساساً HTTP call لـ API خارجي)، وإنما بـ:
1. **صياغة الـ prompt** بشكل يضمن السلامة (ما يعطي تشخيص، عنده safety redirect للطوارئ).
2. **إدارة حالة المحادثة** بأقل تعقيد ممكن (وهاد محلول أصلاً، شوفي تحت).

الجزء "الصعب" الوحيد فعلياً هو الاختبار المتكرر للـ prompt (تجربة سيناريوهات كتير: مريض قلقان، مريض بيكتب حالة طارئة، مريض بيسأل سؤال برا النطاق...) للتأكد إنه بيتصرف صح بكل الحالات — هذا وقت وتكرار، مش تعقيد تقني.

---

## 2. أفضل LLM API مجاني لهالحالة

بحثت بأحدث المعلومات (وسط 2026) وهاد ملخص دقيق:

| المزود | الوضع الفعلي |
|---|---|
| **Google Gemini** | <cite index="13-1">أفضل خيار مجاني بـ2026، بيعطي 1,500 طلب باليوم على Gemini Flash، بدون بطاقة ائتمان ولا انتهاء صلاحية</cite>. |
| **Groq** | <cite index="15-1">مجاني بردو، بس لموديلات open-weight (Llama)، بحدود أضيق (30 طلب/دقيقة، 1000 طلب/يوم لبعض الموديلات)</cite> — أسرع بس أقل ملاءمة لحالة حساسة متل تريّاج طبي. |
| **Claude (Anthropic)** | <cite index="11-1">ما في free tier دائم للـ API — بس أحياناً رصيد تجريبي صغير لحسابات جديدة، بينتهي</cite>. |
| **OpenAI** | <cite index="13-1">لازم بطاقة ائتمان للوصول للـ API، ما في free tier دائم بـ2026</cite>. |

**توصيتي: Google Gemini (Gemini Flash)** — الأنسب لحالتك بالضبط: مشروع صغير (عيادة واحدة، طبيب واحد)، حجم استخدام منخفض جداً (مش كل مريض رح يستخدم الـ chatbot يومياً)، فـ1,500 طلب/يوم مجاني كافي جداً وما بينتهي، وما بيحتاج بطاقة ائتمان للبدء.

⚠️ ملاحظة صغيرة: <cite index="14-1">حدود الـ free tier بتتغير بمرور الوقت (Google قلّصت حدودها آخر 2025 مثلاً)</cite> — تأكدي من الأرقام الحالية بـ [ai.google.dev](https://ai.google.dev) وقت التنفيذ الفعلي، مش الاعتماد على رقم ثابت أعطيكِ ياه اليوم.

---

## 3. مين يقرر إنهاء المحادثة؟ (توصية: Hybrid، مش قرار واحد فقط)

**لا تخليها قرار الـ bot لحاله بشكل كامل (auto-transition)، ولا تخليها بس زر يدوي بدون أي إشارة من الـ bot.** التصميم الأفضل:

1. **الـ bot نفسه بيرجع flag ضمن رده** (عبر structured output، مش نص حر) يقول "أعتقد جمعت معلومات كافية" — بس هاد **اقتراح**، مش قرار تلقائي.
2. **التطبيق بيستخدم هاد الـ flag ليقترح** على المريض (مثلاً يبرز زر "احصل على ملخص" أو يعرض رسالة "بدك تنهي هون؟") — **بس المريض هو اللي يضغط الزر فعلياً**.
3. **حد أقصى صارم لعدد الرسائل** (مثلاً 6 تبادلات) كـ safety net — حتى لو الـ bot ما اقترح الإنهاء، التطبيق بيجبر عرض خيار "إنهاء" بعد هالحد، لمنع محادثة تطول بلا داعي (وتستهلك من حصتك اليومية المجانية).

**ليش hybrid وليش مو bot يقرر لحاله بالكامل؟**
لأنه (زي ما اتفقنا بالتصميم السابق) المريض لازم تكون عنده **فرصة يراجع/يعدّل الملخص قبل ما يوصل الطبيب** — فخليها إنهاء المحادثة قرار واعٍ من المريض نفسه (حتى لو الـ bot اقترحه)، بدل ما ينتقل تلقائياً لشاشة الملخص بدون ما يحس إنه هو اللي قرر.

---

## 4. الكود الفعلي (NestJS + `@google/genai`)

### 4.1 التثبيت
```bash
npm install @google/genai
```
⚠️ فيه تحذير رسمي بالمكتبة: النسخة 3.0.0+ رح تحتاج Node 22+ وتغيّر سلوك function calling. **ثبّتي نسخة `< 3.0.0`** بالـ `package.json` لتفادي مفاجآت (`"@google/genai": "^2.15.0"`).

### 4.2 نقطة مهمة اكتشفتها بالتوثيق الرسمي: الـ API نفسه بيدير الـ conversation state
عكس افتراضي الأول (إن التطبيق لازم يعيد إرسال كامل المحادثة بكل مرة)، Gemini's Interactions API بتدعم **تسلسل عبر `previous_interaction_id`** — يعني بس نمرر id آخر رد، وGoogle نفسها بتتذكر السياق. هذا **أبسط بكتير**: التطبيق بس بيحتفظ بـ string واحد صغير (آخر `interactionId`)، مش array كامل من الرسائل.

### 4.3 الـ Service

```ts
import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

const SYSTEM_PROMPT = `
أنت مساعد استقبال أولي بعيادة أسنان. مهمتك الوحيدة: مساعدة المريض يوصف حالته/أعراضه
بأسئلة توضيحية قصيرة (سؤال واحد بكل مرة)، تحضيراً لعرضها على الطبيب قبل الزيارة.

قواعد صارمة:
- ممنوع تعطي أي تشخيص قاطع أو نصيحة علاجية إطلاقاً. لو المريض سأل "شو عندي؟"، جاوبي:
  "هاد الطبيب رح يقرره بعد الفحص، خليني بس أفهم أكتر شو حاسس فيه".
- لو ذكر المريض أعراض طارئة (نزيف شديد، تورم مع حرارة عالية، إصابة/كسر بالفك، ألم لا
  يُحتمل): وقفي الأسئلة العادية فوراً، ونصحيه يتواصل مع العيادة مباشرة أو يروح لأقرب طوارئ.
- لو الموضوع مش متعلق بالأسنان إطلاقاً: اعتذري بلطف ووجّهيه للتواصل المباشر مع العيادة.
- بعد ما توصلي لفهم كافٍ لسبب الزيارة (عادة 3-5 أسئلة)، حددي readyForSummary: true.
`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    readyForSummary: { type: 'boolean' },
  },
  required: ['reply', 'readyForSummary'],
};

const MAX_TURNS = 6;

@Injectable()
export class AppointmentChatbotService {
  private readonly ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  async sendMessage(message: string, previousInteractionId: string | null, turnCount: number) {
    if (turnCount >= MAX_TURNS) {
      return { reply: null, readyForSummary: true, forcedByLimit: true, interactionId: previousInteractionId };
    }

    const interaction = await this.ai.interactions.create({
      model: 'gemini-2.5-flash',
      input: turnCount === 0 ? `${SYSTEM_PROMPT}\n\nرسالة المريض: ${message}` : message,
      previous_interaction_id: previousInteractionId ?? undefined,
      response_format: { type: 'text', mime_type: 'application/json', schema: RESPONSE_SCHEMA },
    });

    const parsed = JSON.parse(interaction.output_text);
    return { ...parsed, interactionId: interaction.id };
  }

  async summarize(previousInteractionId: string) {
    const interaction = await this.ai.interactions.create({
      model: 'gemini-2.5-flash',
      input:
        'لخّص هذه المحادثة كسبب زيارة، بجملتين إلى ثلاث، بصيغة وصفية بحتة ' +
        '("المريض ذكر أنه...")، بدون أي تشخيص قاطع أو نصيحة علاجية. الملخص فقط، بدون مقدمات.',
      previous_interaction_id: previousInteractionId,
    });

    return { summary: interaction.output_text };
  }
}
```

### 4.4 الـ Controller

```ts
@Controller('appointments/chatbot')
@UseGuards(JwtAuthGuard)
export class AppointmentChatbotController {
  constructor(private readonly chatbotService: AppointmentChatbotService) {}

  @Post('message')
  sendMessage(@Body() dto: ChatbotMessageDto) {
    // dto: { message: string, previousInteractionId?: string, turnCount: number }
    return this.chatbotService.sendMessage(dto.message, dto.previousInteractionId ?? null, dto.turnCount);
  }

  @Post('summarize')
  summarize(@Body() dto: ChatbotSummarizeDto) {
    // dto: { previousInteractionId: string }
    return this.chatbotService.summarize(dto.previousInteractionId);
  }
}
```

**لاحظي:** ما في أي Prisma/database call هون إطلاقاً — بالضبط متل ما اتفقنا، هاد الجزء بالكامل stateless من ناحية الباك-إند (الحالة الوحيدة يلي بتنتقل هي `interactionId`، بيحملها التطبيق بذاكرته ويرسلها بكل طلب).

---

## 5. ملخص الإعداد المطلوب منك
1. حساب Google AI Studio (مجاني) + مفتاح API → `.env` باسم `GEMINI_API_KEY`.
2. `npm install @google/genai@^2.15.0` (تثبيت النسخة، تجنب 3.x حالياً).
3. اختبار الـ prompt بسيناريوهات متعددة قبل الإطلاق (هاد الجزء ياخد وقت أكتر من الكود نفسه).

جاهزة ننتقل للتفصيلة الجاية يلي بدك تناقشيها من هالقسم؟
