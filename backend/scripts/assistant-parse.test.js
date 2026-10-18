/**
 * تست پارس و اعتبارسنجی دستیار — زمان مرجع ثابت (Asia/Tehran via clock helpers)
 * اجرا: node scripts/assistant-parse.test.js
 */
const assert = require('assert');
const { parseMessageToIntent, parseTargetDate } = require('../lib/assistantParse');
const { validateAssistantIntent, resolveHourAmPmReply } = require('../lib/assistantValidate');
const {
  mergeIntentState,
  emptyAssistantIntent,
  intentFromSession,
} = require('../lib/assistantIntent');
const { districtTehranZone } = require('../lib/assistantDistricts');

/** یکشنبه ۱۱ اکتبر ۲۰۲۶ — ۱۲:۰۰ ظهر UTC ≈ ۱۵:۳۰ تهران */
const REF = new Date('2026-10-11T12:00:00.000Z');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

console.log('assistant parse & validate\n');

test('فردا ساعت ۷ شب — تاریخ فردا و ساعت ۱۹', () => {
  const { extracted } = parseMessageToIntent('فردا ساعت ۷ شب زمین میخوام', REF);
  assert.strictEqual(extracted.dateLabel, 'فردا');
  assert.strictEqual(extracted.hour, 19);
  assert.strictEqual(extracted.pitchType, 'grass');
});

test('پس فردا — +۲ روز نه فردا', () => {
  const d = parseTargetDate('پس فردا هفت شب زمین چمن', REF);
  const d2 = parseTargetDate('فردا', REF);
  assert.ok(d.date !== d2.date, 'پس‌فردا باید با فردا فرق کند');
  assert.match(d.label, /پس/);
});

test('۵ روز دیگه', () => {
  const d = parseTargetDate('۵ روز دیگه بعد از ساعت ۶', REF);
  assert.ok(d.label.includes('5') || d.label.includes('۵'));
});

test('هفته بعد سه‌شنبه — برچسب هفته بعد', () => {
  const d = parseTargetDate('هفته بعد سه‌شنبه ساعت ۹ شب', REF);
  assert.match(d.label, /هفته/);
});

test('ساعت ۷ بدون صبح/شب — ابهام', () => {
  const { extracted } = parseMessageToIntent('ساعت ۷', REF);
  const v = validateAssistantIntent(extracted, REF);
  assert.ok(
    v.ambiguities.some((a) => a.code === 'hour_am_pm') || v.needsClarification,
  );
});

test('فردا ساعت ۷ صبح — ساعت ۷', () => {
  const { extracted } = parseMessageToIntent('فردا ساعت ۷ صبح', REF);
  assert.strictEqual(extracted.hour, 7);
});

test('زمین = چمن', () => {
  const { extracted } = parseMessageToIntent('پس فردا یه زمین میخوام', REF);
  assert.strictEqual(extracted.pitchType, 'grass');
});

test('نام‌های رایج زمین چمن و انواع سالن تشخیص داده می‌شوند', () => {
  const cases = [
    ['فوتبال میخوام', 'grass', 'grass'],
    ['زمین فوتبال', 'grass', 'grass'],
    ['گل کوچک', 'grass', 'grass'],
    ['چمن مصنوعی', 'grass', 'grass'],
    ['فوتسال', 'futsal', 'futsal'],
    ['فوتبال سالنی', 'futsal', 'futsal'],
    ['یه سالن میخوام', 'futsal', 'indoor'],
    ['سالن والی بال', 'futsal', 'volleyball'],
    ['سالن چند منظوره', 'futsal', 'multi'],
  ];
  for (const [message, pitchType, venueCategory] of cases) {
    const { extracted } = parseMessageToIntent(message, REF);
    assert.strictEqual(extracted.pitchType, pitchType, message);
    assert.strictEqual(extracted.venueCategory, venueCategory, message);
  }
});

test('ادغام مکالمه — سه روز دیگه بعد ۷ شب چمن', () => {
  let state = emptyAssistantIntent();
  const a = parseMessageToIntent('سه روز دیگه زمین میخوام', REF).extracted;
  state = mergeIntentState(state, a);
  const b = parseMessageToIntent('۷ شب، چمن', REF).extracted;
  state = mergeIntentState(state, b);
  assert.strictEqual(state.pitchType, 'grass');
  assert.strictEqual(state.hour, 19);
  assert.match(state.dateLabel, /سه|۳|3/);
});

test('امروز نه، فردا', () => {
  const d = parseTargetDate('امروز نه، فردا', REF);
  assert.strictEqual(d.label, 'فردا');
});

test('تهرانپارس در فیلتر', () => {
  const { extracted } = parseMessageToIntent('امشب یه زمین نزدیک تهرانپارس', REF);
  assert.strictEqual(extracted.district, 'تهرانپارس');
  assert.strictEqual(extracted.districtExplicit, true);
});

test('صادقیه جدا از سعادت‌آباد', () => {
  const a = parseMessageToIntent('فردا شب زمین تو صادقیه', REF).extracted;
  const b = parseMessageToIntent('فردا شب زمین سعادت آباد', REF).extracted;
  assert.strictEqual(a.district, 'صادقیه');
  assert.strictEqual(b.district, 'سعادت‌آباد');
});

test('پیروزی — محله صریح', () => {
  const { extracted } = parseMessageToIntent('پنجشنبه ۸ شب پیروزی چمن', REF);
  assert.strictEqual(extracted.district, 'پیروزی');
  assert.strictEqual(extracted.districtExplicit, true);
  assert.strictEqual(districtTehranZone('پیروزی'), 'east');
});

test('بین ۶ تا ۸ شب — بازه', () => {
  const { extracted } = parseMessageToIntent('جمعه این هفته بین ۶ تا ۸ شب', REF);
  assert.ok(extracted.timeRange);
  assert.ok(extracted.timeRange.startHour >= 18 || extracted.timeRange.startHour === 6);
});

test('8 تا 10 شب — بازه نه فقط ۱۰', () => {
  const { extracted } = parseMessageToIntent('8 تا 10 شب', REF);
  assert.ok(extracted.timeRange);
  assert.strictEqual(extracted.timeRange.startHour, 20);
  assert.strictEqual(extracted.timeRange.endHour, 22);
  assert.strictEqual(extracted.hour, 21);
  assert.strictEqual(extracted.maxPrice, null);
});

test('ادغام فردا زمین بعد 8 تا 10 شب', () => {
  let state = mergeIntentState(
    emptyAssistantIntent(),
    parseMessageToIntent('فردا زمین', REF).extracted,
  );
  state = mergeIntentState(state, parseMessageToIntent('8 تا 10 شب', REF).extracted);
  const v = validateAssistantIntent(state, REF);
  assert.strictEqual(v.needsClarification, true);
  assert.match(v.clarificationQuestion || '', /محله|منطقه/);
  assert.strictEqual(v.timeRange.startHour, 20);
  assert.strictEqual(v.timeRange.endHour, 22);
});

test('همون زمین قبلی — repeatPreviousPitch', () => {
  const { extracted } = parseMessageToIntent('فردا ۸ شب همون زمین قبلی', REF);
  assert.strictEqual(extracted.repeatPreviousPitch, true);
});

test('دو ساعت — مدت سانس', () => {
  const { extracted } = parseMessageToIntent('جمعه ساعت ۷ شب دو ساعت چمن', REF);
  assert.strictEqual(extracted.slotDurationHours, 2);
  assert.strictEqual(extracted.durationExplicit, true);
});

test('اول ماه بعد — تاریخ صریح', () => {
  const d = parseTargetDate('اول ماه بعد ساعت ۸ شب', REF);
  assert.ok(d);
  assert.match(d.label, /اول|ماه/);
  assert.match(d.date, /\/01$/);
});

test('آخر ماه — آخرین روز ماه جاری', () => {
  const d = parseTargetDate('آخر ماه زمین میخوام', REF);
  assert.ok(d);
  assert.match(d.label, /آخر/);
});

test('ادامه بعد از سؤال ساعت — needsClarification قبلی مانع validate نشود', () => {
  const stuck = {
    ...emptyAssistantIntent(),
    date: parseTargetDate('پس فردا', REF).date,
    dateLabel: 'پس‌فردا',
    dateExplicit: true,
    pitchType: 'grass',
    needsClarification: true,
    clarificationQuestion: 'برای این تاریخ چه ساعتی مدنظرت هست؟',
  };
  let state = intentFromSession(stuck);
  assert.strictEqual(state.needsClarification, false);
  const timeMsg = parseMessageToIntent('8 شب پیروزی', REF).extracted;
  state = mergeIntentState(state, timeMsg);
  let v = validateAssistantIntent(state, REF);
  assert.strictEqual(v.hour, 20);
  assert.strictEqual(v.district, 'پیروزی');
  assert.strictEqual(v.needsClarification, false);
  assert.ok(v.timeRange);
});

test('بدون ساعت — قبل از پیشنهاد سؤال می‌پرسد (مکان اجباری نیست)', () => {
  const { extracted } = parseMessageToIntent('فردا یه زمین چمن', REF);
  const v = validateAssistantIntent(extracted, REF);
  assert.strictEqual(v.needsClarification, true);
  assert.ok(v.missingFields.includes('time'));
  assert.ok(!v.missingFields.includes('location'));
});

test('فردا ۷ شب — بعد سؤال محله', () => {
  const { extracted } = parseMessageToIntent('فردا ۷ شب چمن', REF);
  const v = validateAssistantIntent(extracted, REF);
  assert.strictEqual(v.needsClarification, true);
  assert.match(v.clarificationQuestion || '', /محله|منطقه/);
  assert.ok(!v.missingFields.includes('time'));
});

test('ساعت ۴ ظهر — ساعت ۱۶ است و دوباره زمان نمی‌پرسد', () => {
  const { extracted } = parseMessageToIntent('پس فردا پیروزی ساعت 4 ظهر چمن', REF);
  const v = validateAssistantIntent(extracted, REF);
  assert.strictEqual(v.hour, 16);
  assert.deepStrictEqual(v.timeRange, { startHour: 16, endHour: 17 });
  assert.ok(!v.missingFields.includes('time'));
  assert.strictEqual(v.needsClarification, false);
});

test('با مکان بدون ساعت — فقط بازه زمانی', () => {
  const { extracted } = parseMessageToIntent('فردا زمین تو پیروزی', REF);
  const v = validateAssistantIntent(extracted, REF);
  assert.strictEqual(v.needsClarification, true);
  assert.ok(v.missingFields.includes('time'));
  assert.ok(!v.missingFields.includes('location'));
  assert.match(v.clarificationQuestion || '', /ساعت|چه\s*ساعتی/);
});

test('محله‌های درخواستی — خراسان، دولاب، مسعودیه، مشیریه، ولیعصر', () => {
  const cases = [
    ['خراسان', 'خراسان'],
    ['دولاب', 'دولاب'],
    ['مسعودیه', 'مسعودیه'],
    ['مشیریه', 'مشیریه'],
    ['ولیعصر', 'ولیعصر'],
    ['فردا ۸ شب ولیعصر', 'ولیعصر'],
  ];
  for (const [msg, key] of cases) {
    const { extracted } = parseMessageToIntent(msg, REF);
    assert.strictEqual(extracted.district, key, msg);
    assert.strictEqual(extracted.districtExplicit, true, msg);
  }
});

test('پاسخ فقط «کشاورز» بعد از سؤال محله', () => {
  const REF2 = new Date('2026-10-11T12:00:00.000Z');
  let state = mergeIntentState(
    emptyAssistantIntent(),
    parseMessageToIntent('فردا شب ساعت 7 زمین چمن میخوام', REF2).extracted,
  );
  state = mergeIntentState(state, parseMessageToIntent('کشاورز', REF2).extracted);
  assert.strictEqual(state.district, 'کشاورز');
  assert.strictEqual(state.districtExplicit, true);
  const v = validateAssistantIntent(state, REF2);
  assert.strictEqual(v.needsClarification, false);
  assert.strictEqual(v.hour, 19);
});

test('فردا ۷ شب بعد تهرانپارس — آمادهٔ پیشنهاد سانس', () => {
  let state = mergeIntentState(
    emptyAssistantIntent(),
    parseMessageToIntent('فردا ساعت ۷ شب زمین چمن میخوام', REF).extracted,
  );
  state = mergeIntentState(state, parseMessageToIntent('تهرانپارس', REF).extracted);
  const v = validateAssistantIntent(state, REF);
  assert.strictEqual(v.district, 'تهرانپارس');
  assert.strictEqual(v.needsClarification, false);
  assert.ok(!v.missingFields.includes('time'));
});

test('پس‌فردا چمن بعد پیروزی ۷ شب — مثل گفت‌وگوی کاربر', () => {
  const REF2 = new Date('2026-10-11T12:00:00.000Z');
  let state = mergeIntentState(
    emptyAssistantIntent(),
    parseMessageToIntent('پس فردا یه زمین چمن', REF2).extracted,
  );
  state = mergeIntentState(state, parseMessageToIntent('پیروزی 7 شب', REF2).extracted);
  const v = validateAssistantIntent(state, REF2);
  assert.strictEqual(v.district, 'پیروزی');
  assert.strictEqual(v.hour, 19);
  assert.strictEqual(v.needsClarification, false);
});

test('روز، محله و ساعت بدون نوع زمین — چمن یا فوتسال را می‌پرسد', () => {
  const { extracted } = parseMessageToIntent('پس فردا پیروزی ساعت 4 ظهر', REF);
  const v = validateAssistantIntent(extracted, REF);
  assert.strictEqual(v.hour, 16);
  assert.ok(v.missingFields.includes('pitchType'));
  assert.strictEqual(v.needsClarification, true);
  assert.match(v.clarificationQuestion || '', /چمن.*فوتسال/);
});

test('فردا ساعت ۸ بدون محله — فقط ابهام صبح/شب', () => {
  const { extracted } = parseMessageToIntent('فردا ساعت 8 زمین میخوام', REF);
  const v = validateAssistantIntent(extracted, REF);
  assert.strictEqual(v.needsClarification, true);
  assert.ok(!v.missingFields.includes('location'));
  assert.match(v.clarificationQuestion || '', /۸|8/);
  assert.match(v.clarificationQuestion || '', /صبح/);
});

test('یه زمین فوتبال برای فردا شب — بازهٔ شب', () => {
  const { extracted } = parseMessageToIntent('یه زمین فوتبال برای فردا شب میخوام', REF);
  assert.strictEqual(extracted.pitchType, 'grass');
  assert.strictEqual(extracted.dateLabel, 'فردا شب');
  assert.ok(extracted.afterHour >= 17 || extracted.hour >= 17);
});

test('پس‌فردا ساعت ۸ شب فوتسال', () => {
  const { extracted } = parseMessageToIntent('پس‌فردا ساعت ۸ شب یه فوتسال پیدا کن', REF);
  assert.strictEqual(extracted.pitchType, 'futsal');
  assert.strictEqual(extracted.hour, 20);
  assert.match(extracted.dateLabel, /پس/);
});

test('سه روز دیگه بعد از ساعت ۷', () => {
  const { extracted } = parseMessageToIntent('سه روز دیگه بعد از ساعت ۷ زمین میخوام', REF);
  assert.ok(extracted.afterHour === 7 || extracted.afterHour === 19);
  assert.match(extracted.dateLabel, /سه|۳|3/);
});

test('منظورم پنجشنبه بود نه جمعه', () => {
  const {
    parseConversationAdjustments,
  } = require('../lib/assistantCorrections');
  const adj = parseConversationAdjustments('نه، منظورم پنجشنبه بود، نه جمعه', REF);
  assert.ok(adj.dateOverride);
  assert.match(adj.dateLabelOverride || '', /پنج/);
});

test('ساعت ۹ بی‌خیال ساعت ۱۰', () => {
  const {
    parseConversationAdjustments,
    applyAdjustmentsToIntent,
  } = require('../lib/assistantCorrections');
  const { parseHour } = require('../lib/assistantParse');
  let state = mergeIntentState(
    emptyAssistantIntent(),
    parseMessageToIntent('پنجشنبه ساعت ۹ شب فوتسال', REF).extracted,
  );
  const adj = parseConversationAdjustments('ساعت ۹ رو بی‌خیال، ساعت ۱۰ چی داری؟', REF);
  state = applyAdjustmentsToIntent(state, adj, parseHour('ساعت ۱۰ شب'));
  assert.strictEqual(state.hour, 22);
});

test('فوتسال پنجشنبه بعد حدود هشت شب — ادغام', () => {
  let state = mergeIntentState(
    emptyAssistantIntent(),
    parseMessageToIntent('یه زمین فوتسال برای پنجشنبه می‌خوام', REF).extracted,
  );
  state = mergeIntentState(state, parseMessageToIntent('حدود هشت شب', REF).extracted);
  assert.strictEqual(state.pitchType, 'futsal');
  assert.strictEqual(state.hour, 20);
  assert.match(state.dateLabel || '', /پنج/);
});

test('مترو و پارکینگ — امکانات', () => {
  const { extracted } = parseMessageToIntent('یه زمین نزدیک مترو می‌خوام که پارکینگ هم داشته باشه', REF);
  assert.ok(extracted.requiredAmenities.includes('parking'));
  assert.ok(extracted.preferences.includes('metro'));
});

test('هفت بعدازظهر', () => {
  const { extracted } = parseMessageToIntent('فردا هفت بعدازظهر چمن پیروزی', REF);
  assert.strictEqual(extracted.hour, 19);
});

test('سؤال پرداخت قطعی — FAQ', () => {
  const { detectAssistantTopic, buildTopicReply } = require('../lib/assistantTopics');
  const topic = detectAssistantTopic('اگه پرداخت کنم رزرو قطعی می‌شه؟');
  assert.strictEqual(topic.type, 'payment_confirm_question');
  assert.ok(buildTopicReply(topic.type));
});

test('لغو رزرو — FAQ نه جستجو', () => {
  const { detectAssistantTopic } = require('../lib/assistantTopics');
  const topic = detectAssistantTopic('می‌خوام رزرو قبلیم رو لغو کنم');
  assert.strictEqual(topic.type, 'cancel_reservation');
});

test('7 تا 10 بدون شب — ابهام صبح/شب', () => {
  const { extracted } = parseMessageToIntent('7 till 10', REF);
  assert.ok(extracted.ambiguities.some((a) => a.code === 'hour_am_pm' && a.endHour === 10));
  assert.strictEqual(extracted.timeRange.startHour, 7);
  assert.strictEqual(extracted.timeRange.endHour, 10);
  const v = validateAssistantIntent(extracted, REF);
  assert.match(v.clarificationQuestion || '', /صبح/);
  assert.match(v.clarificationQuestion || '', /شب|بعدازظهر/);
});

test('بعد از ساعت، اول صبح/شب بعد محله', () => {
  let state = mergeIntentState(
    emptyAssistantIntent(),
    parseMessageToIntent('پس فردا زمین میخوام', REF).extracted,
  );
  state = mergeIntentState(state, parseMessageToIntent('7 تا 10', REF).extracted);
  let v = validateAssistantIntent(state, REF);
  assert.strictEqual(v.needsClarification, true);
  assert.match(v.clarificationQuestion || '', /صبح/);
  state = mergeIntentState(state, parseMessageToIntent('شب', REF).extracted);
  state = resolveHourAmPmReply(state, 'شب');
  v = validateAssistantIntent(state, REF);
  assert.strictEqual(v.timeRange.startHour, 19);
  assert.strictEqual(v.timeRange.endHour, 22);
  assert.match(v.clarificationQuestion || '', /محله|منطقه/);
  state = mergeIntentState(state, parseMessageToIntent('همه جا', REF).extracted);
  v = validateAssistantIntent(state, REF);
  assert.strictEqual(v.needsClarification, false);
  assert.strictEqual(v.searchAnywhere, true);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
