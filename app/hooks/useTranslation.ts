import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

type Translatable = string | number | (string | number)[];

/**
 * Batched translation.
 *
 * The previous implementation issued one HTTP request per rendered string —
 * a single screen could fire 40+ requests, and identical strings were fetched
 * repeatedly. This version:
 *
 *   1. serves from an in-memory cache (backed by AsyncStorage across launches),
 *   2. de-duplicates identical strings, including those already in flight,
 *   3. collects every string requested within a short window for one language
 *      into a **single** request, separated by a control character, and splits
 *      the response back apart,
 *   4. falls back to per-string requests only if the batch response cannot be
 *      split back cleanly, so a translation is never lost or mis-assigned.
 *
 * Most legacy copy is Swedish, while the canvas screens use English. The
 * translation endpoint detects either source language and targets the choice.
 */

/** ASCII record separator — survives the endpoint and never appears in UI copy. */
const SEPARATOR = "\u241E";
/** How long to collect sibling strings before sending a batch. */
const BATCH_WINDOW_MS = 40;
/** Upper bound on strings per request, to keep the URL a sane length. */
const MAX_BATCH = 20;
const ENDPOINT = "https://ftapi.pythonanywhere.com/translate";

const memory = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

// High-visibility app chrome stays translated offline and appears immediately.
// Longer content still uses the cached/batched translation path below.
const CORE_COPY: Record<string, Partial<Record<"en" | "sv" | "ar", string>>> = {
  Home: { en: "Home", sv: "Hem", ar: "الرئيسية" },
  Trips: { en: "Trips", sv: "Resor", ar: "الرحلات" },
  News: { en: "News", sv: "Nyheter", ar: "الأخبار" },
  Back: { en: "Back", sv: "Tillbaka", ar: "رجوع" },
  Profile: { en: "Profile", sv: "Profil", ar: "الملف الشخصي" },
  "Your Profile": { en: "Your Profile", sv: "Din profil", ar: "ملفك الشخصي" },
  Appearance: { en: "Appearance", sv: "Utseende", ar: "المظهر" },
  "Language & region": { en: "Language & region", sv: "Språk och region", ar: "اللغة والمنطقة" },
  Language: { en: "Language", sv: "Språk", ar: "اللغة" },
  "Help & support": { en: "Help & support", sv: "Hjälp och support", ar: "المساعدة والدعم" },
  "Personal information": { en: "Personal information", sv: "Personuppgifter", ar: "المعلومات الشخصية" },
  Notifications: { en: "Notifications", sv: "Aviseringar", ar: "الإشعارات" },
  "Recent account updates": { en: "Recent account updates", sv: "Senaste kontoaviseringarna", ar: "آخر تحديثات الحساب" },
  "All notifications are up to date.": { en: "All notifications are up to date.", sv: "Du har läst alla aviseringar.", ar: "لا توجد إشعارات جديدة." },
  "No notifications yet": { en: "No notifications yet", sv: "Inga aviseringar ännu", ar: "لا توجد إشعارات بعد" },
  "Booking, shipment and departure updates will appear here.": { en: "Booking, shipment and departure updates will appear here.", sv: "Uppdateringar om bokningar, försändelser och avgångar visas här.", ar: "ستظهر هنا تحديثات الحجوزات والشحنات والمواعيد." },
  "Mark all notifications as read": { en: "Mark all notifications as read", sv: "Markera alla aviseringar som lästa", ar: "تحديد كل الإشعارات كمقروءة" },
  "Mark all read": { en: "Mark all read", sv: "Markera alla som lästa", ar: "تحديد الكل كمقروء" },
  Earlier: { en: "Earlier", sv: "Tidigare", ar: "سابقاً" },
  "No news yet": { en: "No news yet", sv: "Inga nyheter ännu", ar: "لا توجد أخبار بعد" },
  "Company updates, new departures and campaigns will appear here.": { en: "Company updates, new departures and campaigns will appear here.", sv: "Företagsnyheter, nya avgångar och kampanjer visas här.", ar: "ستظهر هنا أخبار الشركة والمواعيد الجديدة والعروض." },
  Important: { en: "Important", sv: "Viktigt", ar: "مهم" },
  New: { en: "New", sv: "Ny", ar: "جديد" },
  "The latest from Tunisiska": { en: "The latest from Tunisiska", sv: "Senaste nytt från Tunisiska", ar: "آخر أخبار تونيسيسكا" },
  "Search services": { en: "Search services", sv: "Sök tjänster", ar: "ابحث عن الخدمات" },
  "Clear search": { en: "Clear search", sv: "Rensa sökning", ar: "مسح البحث" },
  "Enter tracking number (e.g. TMT-2411504)": { en: "Enter tracking number (e.g. TMT-2411504)", sv: "Ange spårningsnummer (t.ex. TMT-2411504)", ar: "أدخل رقم التتبع (مثال: TMT-2411504)" },
  "New Video": { en: "New Video", sv: "Ny video", ar: "فيديو جديد" },
  "Couldn't load news": { en: "Couldn't load news", sv: "Det gick inte att hämta nyheter", ar: "تعذّر تحميل الأخبار" },
  "Check your connection and try again.": { en: "Check your connection and try again.", sv: "Kontrollera anslutningen och försök igen.", ar: "تحقق من اتصالك وحاول مرة أخرى." },
  "Try again": { en: "Try again", sv: "Försök igen", ar: "حاول مرة أخرى" },
  "Terms of Service not found": { en: "Terms of Service not found", sv: "Användarvillkoren kunde inte hittas", ar: "تعذّر العثور على شروط الاستخدام" },
  "Privacy Policy not found": { en: "Privacy Policy not found", sv: "Integritetspolicyn kunde inte hittas", ar: "تعذّر العثور على سياسة الخصوصية" },
  "Terms & conditions": { en: "Terms & conditions", sv: "Användarvillkor", ar: "الشروط والأحكام" },
  "Privacy Policy": { en: "Privacy Policy", sv: "Integritetspolicy", ar: "سياسة الخصوصية" },
  "Terms of Service": { en: "Terms of Service", sv: "Användarvillkor", ar: "شروط الاستخدام" },
  "Cargo capacity": { en: "Cargo capacity", sv: "Lastkapacitet", ar: "سعة الشحن" },
  // Counted nouns are stored as separate singular/plural words: the screen
  // picks one and prefixes the number, which is correct in all three languages.
  governorate: { en: "governorate", sv: "guvernement", ar: "محافظة" },
  governorates: { en: "governorates", sv: "guvernement", ar: "محافظات" },
  pickup: { en: "pickup", sv: "upphämtning", ar: "نقطة استلام" },
  pickups: { en: "pickups", sv: "upphämtningar", ar: "نقاط استلام" },
  "Governorate {governorate}, change": { en: "Governorate {governorate}, change", sv: "Guvernement {governorate}, ändra", ar: "محافظة {governorate}، تغيير" },
  "Close": { en: "Close", sv: "Stäng", ar: "إغلاق" },
  "Share departure": { en: "Share departure", sv: "Dela avgång", ar: "مشاركة المغادرة" },
  "The governorates served on this departure have not been published yet.": {
    en: "The governorates served on this departure have not been published yet.",
    sv: "Guvernementen som tjänas på denna avgång har inte publicerats än.",
    ar: "لم يتم نشر المحافظات التي تخدمها هذه المغادرة بعد.",
  },
  "No pickup points configured": { en: "No pickup points configured", sv: "Inga upphämtningspunkter konfigurerade", ar: "لم يتم تهيئة نقاط الاستلام" },
  "Cargo Van": { en: "Cargo Van", sv: "Skåpbil", ar: "شاحنة بضائع" },
  "spaces available": { en: "spaces available", sv: "lediga platser", ar: "مساحة متاحة" },
  total: { en: "total", sv: "totalt", ar: "الإجمالي" },
  booked: { en: "booked", sv: "bokade", ar: "محجوزة" },
  available: { en: "available", sv: "lediga", ar: "متاحة" },
  of: { en: "of", sv: "av", ar: "من" },
  "Spaces left": { en: "Spaces left", sv: "Platser kvar", ar: "المساحات المتبقية" },
  "spaces left": { en: "spaces left", sv: "platser kvar", ar: "مساحات متبقية" },
  "{available} of {capacity} spaces left": {
    en: "{available} of {capacity} spaces left",
    sv: "{available} av {capacity} platser kvar",
    ar: "{available} من {capacity} مساحة متبقية",
  },
  "No spaces left": { en: "No spaces left", sv: "Inga platser kvar", ar: "لا توجد مساحات متبقية" },
  Full: { en: "Full", sv: "Fullt", ar: "ممتلئ" },
  "Last updated": { en: "Last updated", sv: "Senast uppdaterad", ar: "آخر تحديث" },
  "Read our terms for using the app.": { en: "Read our terms for using the app.", sv: "Läs villkoren för hur du använder appen.", ar: "اقرأ شروط استخدام التطبيق." },
  "Learn how we protect and use your information.": { en: "Learn how we protect and use your information.", sv: "Läs om hur vi skyddar och använder dina uppgifter.", ar: "تعرّف على كيفية حماية معلوماتك واستخدامها." },
  "Legal information is not available right now.": { en: "Legal information is not available right now.", sv: "Juridisk information är inte tillgänglig just nu.", ar: "المعلومات القانونية غير متاحة حالياً." },
  "Please try again later or contact support for help.": { en: "Please try again later or contact support for help.", sv: "Försök igen senare eller kontakta supporten för hjälp.", ar: "يرجى المحاولة لاحقاً أو التواصل مع الدعم للمساعدة." },
  "Loading…": { en: "Loading…", sv: "Laddar…", ar: "جارٍ التحميل…" },
  Settings: { en: "Settings", sv: "Inställningar", ar: "الإعدادات" },
  System: { en: "System", sv: "System", ar: "النظام" },
  Light: { en: "Light", sv: "Ljust", ar: "فاتح" },
  Dark: { en: "Dark", sv: "Mörkt", ar: "داكن" },
  English: { en: "English", sv: "Engelska", ar: "الإنجليزية" },
  Swedish: { en: "Swedish", sv: "Svenska", ar: "السويدية" },
  Arabic: { en: "Arabic", sv: "Arabiska", ar: "العربية" },
  "Live Activity": { en: "Live Activity", sv: "Liveaktivitet", ar: "النشاط المباشر" },
  "Your departure at a glance": { en: "Your departure at a glance", sv: "Din avgång i korthet", ar: "موعد مغادرتك في لمحة" },
  "Next departure": { en: "Next departure", sv: "Nästa avgång", ar: "المغادرة القادمة" },
  "Dynamic Island preview": { en: "Dynamic Island preview", sv: "Förhandsvisning av Dynamic Island", ar: "معاينة الجزيرة الديناميكية" },
  "Lock Screen preview": { en: "Lock Screen preview", sv: "Förhandsvisning av låsskärmen", ar: "معاينة شاشة القفل" },
  "Live Activities are available on supported iPhone devices.": { en: "Live Activities are available on supported iPhone devices.", sv: "Liveaktiviteter finns på iPhone-enheter som stöds.", ar: "الأنشطة المباشرة متاحة على أجهزة iPhone المدعومة." },
  "Live Activities enabled": { en: "Live Activities enabled", sv: "Liveaktiviteter aktiverade", ar: "الأنشطة المباشرة مفعّلة" },
  "Enable Live Activities in Settings": { en: "Enable Live Activities in Settings", sv: "Aktivera liveaktiviteter i Inställningar", ar: "فعّل الأنشطة المباشرة من الإعدادات" },
  "Available on iPhone with iOS 16.2 or later": { en: "Available on iPhone with iOS 16.2 or later", sv: "Tillgängligt på iPhone med iOS 16.2 eller senare", ar: "متاح على iPhone بنظام iOS 16.2 أو أحدث" },
  "Your next scheduled departure appears on the Lock Screen and Dynamic Island when supported.": { en: "Your next scheduled departure appears on the Lock Screen and Dynamic Island when supported.", sv: "Nästa planerade avgång visas på låsskärmen och Dynamic Island när det stöds.", ar: "سيظهر موعد مغادرتك القادم على شاشة القفل والجزيرة الديناميكية عند الدعم." },
  "Widgets & Dynamic Island": { en: "Widgets & Dynamic Island", sv: "Widgetar och Dynamic Island", ar: "الأدوات والجزيرة الديناميكية" },
  "Setup guide and live preview": { en: "Setup guide and live preview", sv: "Installationsguide och förhandsvisning", ar: "دليل الإعداد والمعاينة المباشرة" },
  "Admin dashboard": { en: "Admin dashboard", sv: "Adminpanel", ar: "لوحة الإدارة" },
  "Manage orders and app content": { en: "Manage orders and app content", sv: "Hantera beställningar och appinnehåll", ar: "إدارة الطلبات ومحتوى التطبيق" },
  "Personal details": { en: "Personal details", sv: "Personuppgifter", ar: "البيانات الشخصية" },
  Address: { en: "Address", sv: "Adress", ar: "العنوان" },
  "First name": { en: "First name", sv: "Förnamn", ar: "الاسم الأول" },
  "Last name": { en: "Last name", sv: "Efternamn", ar: "اسم العائلة" },
  "Email address": { en: "Email address", sv: "E-postadress", ar: "البريد الإلكتروني" },
  "Phone number": { en: "Phone number", sv: "Telefonnummer", ar: "رقم الهاتف" },
  "Street address": { en: "Street address", sv: "Gatuadress", ar: "عنوان الشارع" },
  City: { en: "City", sv: "Stad", ar: "المدينة" },
  "Postal code": { en: "Postal code", sv: "Postnummer", ar: "الرمز البريدي" },
  Country: { en: "Country", sv: "Land", ar: "البلد" },
  "Not provided": { en: "Not provided", sv: "Inte angivet", ar: "غير متوفر" },
  "Your account": { en: "Your account", sv: "Ditt konto", ar: "حسابك" },
  "Edit profile information": { en: "Edit profile information", sv: "Redigera profilinformation", ar: "تعديل معلومات الملف الشخصي" },
  "Save changes": { en: "Save changes", sv: "Spara ändringar", ar: "حفظ التغييرات" },
  Cancel: { en: "Cancel", sv: "Avbryt", ar: "إلغاء" },
  "Manage your account details": { en: "Manage your account details", sv: "Hantera dina kontouppgifter", ar: "إدارة تفاصيل حسابك" },
  "To change your email, use the email verification settings.": { en: "To change your email, use the email verification settings.", sv: "Ändra e-postadressen under inställningar för e-postverifiering.", ar: "لتغيير بريدك الإلكتروني، استخدم إعدادات التحقق من البريد." },
  "Account security": { en: "Account security", sv: "Kontosäkerhet", ar: "أمان الحساب" },
  "Change password": { en: "Change password", sv: "Ändra lösenord", ar: "تغيير كلمة المرور" },
  "Add or verify email": { en: "Add or verify email", sv: "Lägg till eller verifiera e-post", ar: "إضافة البريد الإلكتروني أو التحقق منه" },
  "Welcome back": { en: "Welcome back", sv: "Välkommen tillbaka", ar: "مرحباً بعودتك" },
  "Your journey starts here": { en: "Your journey starts here", sv: "Din resa börjar här", ar: "تبدأ رحلتك من هنا" },
  "Sign in to manage trips, shipments and points.": { en: "Sign in to manage trips, shipments and points.", sv: "Logga in för att hantera resor, försändelser och poäng.", ar: "سجّل الدخول لإدارة الرحلات والشحنات والنقاط." },
  "Create account": { en: "Create account", sv: "Skapa konto", ar: "إنشاء حساب" },
  "A few details to get started": { en: "A few details to get started", sv: "Fyll i några uppgifter för att komma igång", ar: "أدخل بعض التفاصيل للبدء" },
  "Set up your account to book transport and follow every journey.": { en: "Set up your account to book transport and follow every journey.", sv: "Skapa ditt konto för att boka transport och följa varje resa.", ar: "أنشئ حسابك لحجز النقل ومتابعة كل رحلة." },
  "Password": { en: "Password", sv: "Lösenord", ar: "كلمة المرور" },
  "Sign in": { en: "Sign in", sv: "Logga in", ar: "تسجيل الدخول" },
  "OR CONTINUE WITH": { en: "OR CONTINUE WITH", sv: "ELLER FORTSÄTT MED", ar: "أو تابع باستخدام" },
  "Verify email": { en: "Verify email", sv: "Verifiera e-post", ar: "تحقق من البريد الإلكتروني" },
  "By continuing, you agree to our Terms and Privacy Policy.": { en: "By continuing, you agree to our Terms and Privacy Policy.", sv: "Genom att fortsätta godkänner du våra användarvillkor och vår integritetspolicy.", ar: "بالمتابعة، فإنك توافق على شروط الاستخدام وسياسة الخصوصية." },
  "name@example.com": { en: "name@example.com", sv: "namn@exempel.se", ar: "name@example.com" },
  "Enter your password": { en: "Enter your password", sv: "Ange ditt lösenord", ar: "أدخل كلمة المرور" },
  "At least 8 characters": { en: "At least 8 characters", sv: "Minst 8 tecken", ar: "8 أحرف على الأقل" },
  "New to Tunisiska?": { en: "New to Tunisiska?", sv: "Ny hos Tunisiska?", ar: "جديد على تونيسيسكا؟" },
  "Already have an account?": { en: "Already have an account?", sv: "Har du redan ett konto?", ar: "هل لديك حساب بالفعل؟" },
  "Delete account": { en: "Delete account", sv: "Radera konto", ar: "حذف الحساب" },
  "Delete account?": { en: "Delete account?", sv: "Radera konto?", ar: "حذف الحساب؟" },
  "Deleting your account permanently removes your profile, bookings and points. This cannot be undone.": {
    en: "Deleting your account permanently removes your profile, bookings and points. This cannot be undone.",
    sv: "Om du raderar kontot tas din profil, dina bokningar och dina poäng bort permanent. Det går inte att ångra.",
    ar: "حذف حسابك يزيل ملفك الشخصي وحجوزاتك ونقاطك نهائياً. لا يمكن التراجع عن ذلك.",
  },
  "Could not delete your account": { en: "Could not delete your account", sv: "Det gick inte att radera kontot", ar: "تعذّر حذف حسابك" },
  "Ditt namn": { en: "Your name", sv: "Ditt namn", ar: "اسمك" },
  "Mottagarens namn": { en: "Recipient name", sv: "Mottagarens namn", ar: "اسم المستلم" },
  "din@email.com": { en: "your@email.com", sv: "din@email.com", ar: "your@email.com" },
  "Särskilda önskemål eller instruktioner...": { en: "Special requests or instructions...", sv: "Särskilda önskemål eller instruktioner...", ar: "طلبات أو تعليمات خاصة..." },
  "Ex: Stockholm": { en: "E.g. Stockholm", sv: "Ex: Stockholm", ar: "مثال: ستوكهولم" },
  "Ex: Uppsala": { en: "E.g. Uppsala", sv: "Ex: Uppsala", ar: "مثال: أوبسالا" },
  "Ex: 10": { en: "E.g. 10", sv: "Ex: 10", ar: "مثال: 10" },
  "Ex: John Doe": { en: "E.g. John Doe", sv: "Ex: John Doe", ar: "مثال: جون دو" },
  "Ex: Arlanda, Stockholm": { en: "E.g. Arlanda, Stockholm", sv: "Ex: Arlanda, Stockholm", ar: "مثال: أرلاندا، ستوكهولم" },
  "Ring förare": { en: "Call driver", sv: "Ring förare", ar: "اتصل بالسائق" },
  "Avbryt": { en: "Cancel", sv: "Avbryt", ar: "إلغاء" },
  "Ring": { en: "Call", sv: "Ring", ar: "اتصال" },
  "Förarens telefonnummer är inte tillgängligt ännu.": { en: "The driver's phone number is not available yet.", sv: "Förarens telefonnummer är inte tillgängligt ännu.", ar: "رقم هاتف السائق غير متاح حالياً." },
  "Kontakta support för hjälp med din leverans.": { en: "Contact support for help with your delivery.", sv: "Kontakta support för hjälp med din leverans.", ar: "تواصل مع الدعم للحصول على مساعدة بشأن شحنتك." },
  "Förare på väg": { en: "Driver on the way", sv: "Förare på väg", ar: "السائق في الطريق" },
  Sweden: { en: "Sweden", sv: "Sverige", ar: "السويد" },
  Tunisia: { en: "Tunisia", sv: "Tunisien", ar: "تونس" },
  Stockholm: { en: "Stockholm", sv: "Stockholm", ar: "ستوكهولم" },
  Tunis: { en: "Tunis", sv: "Tunis", ar: "تونس" },
  Sousse: { en: "Sousse", sv: "Sousse", ar: "سوسة" },
  Sfax: { en: "Sfax", sv: "Sfax", ar: "صفاقس" },
  "Sweden → Tunisia": { en: "Sweden → Tunisia", sv: "Sverige → Tunisien", ar: "السويد ← تونس" },
  "Tunisia → Sweden": { en: "Tunisia → Sweden", sv: "Tunisien → Sverige", ar: "تونس → السويد" },
  "Stockholm → Tunis": { en: "Stockholm → Tunis", sv: "Stockholm → Tunis", ar: "ستوكهولم → تونس" },
  "Tunis → Stockholm": { en: "Tunis → Stockholm", sv: "Tunis → Stockholm", ar: "تونس → ستوكهولم" },
  "Sousse → Stockholm": { en: "Sousse → Stockholm", sv: "Sousse → Stockholm", ar: "سوسة → ستوكهولم" },
  "Sfax → Stockholm": { en: "Sfax → Stockholm", sv: "Sfax → Stockholm", ar: "صفاقس → ستوكهولم" },
  Truck: { en: "Truck", sv: "Lastbil", ar: "شاحنة" },
  "Cargo van": { en: "Cargo van", sv: "Skåpbil", ar: "شاحنة بضائع" },
  "Container ship": { en: "Container ship", sv: "Containerfartyg", ar: "سفينة حاويات" },
  "Air freight": { en: "Air freight", sv: "Flygfrakt", ar: "شحن جوي" },
  Transport: { en: "Transport", sv: "Transport", ar: "النقل" },
  Scheduled: { en: "Scheduled", sv: "Planerad", ar: "مجدول" },
  Available: { en: "Available", sv: "Tillgänglig", ar: "متاح" },
  Cancelled: { en: "Cancelled", sv: "Avbokad", ar: "ملغى" },
  Departed: { en: "Departed", sv: "Avgången", ar: "غادر" },
  "Spaces available": { en: "Spaces available", sv: "Lediga platser", ar: "المساحات المتاحة" },
  departures: { en: "departures", sv: "avgångar", ar: "مواعيد المغادرة" },
  departure: { en: "departure", sv: "avgång", ar: "موعد مغادرة" },
  "Widget guides": { en: "Widget guides", sv: "Widget-guider", ar: "أدلة الأدوات" },
  "Home Screen widget": { en: "Home Screen widget", sv: "Hemskärmswidget", ar: "أداة الشاشة الرئيسية" },
  "Lock Screen widget": { en: "Lock Screen widget", sv: "Lås-skärmswidget", ar: "أداة شاشة القفل" },
  "No services found": { en: "No services found", sv: "Inga tjänster hittades", ar: "لم يتم العثور على خدمات" },
  "Try a different search term or category.": { en: "Try a different search term or category.", sv: "Prova en annan sökterm eller kategori.", ar: "جرب كلمة بحث أو تصنيفاً مختلفاً." },
  "Book a service": { en: "Book a service", sv: "Boka en tjänst", ar: "احجز خدمة" },
  "Explore Tunisiska": { en: "Explore Tunisiska", sv: "Utforska Tunisiska", ar: "اكتشف تونيسيسكا" },
  "Plan a trip or find something useful": { en: "Plan a trip or find something useful", sv: "Planera en resa eller hitta något användbart", ar: "خطط لرحلة أو اعثر على شيء مفيد" },
  "Services": { en: "Services", sv: "Tjänster", ar: "الخدمات" },
  "Trip details": { en: "Trip details", sv: "Resedetaljer", ar: "تفاصيل الرحلة" },
  "Schedule": { en: "Schedule", sv: "Schema", ar: "الجدول الزمني" },
  "Additional information": { en: "Additional information", sv: "Ytterligare information", ar: "معلومات إضافية" },
  "Move details": { en: "Move details", sv: "Flyttdetaljer", ar: "تفاصيل النقل" },
  "Cleaning areas": { en: "Cleaning areas", sv: "Städytor", ar: "مناطق التنظيف" },
  "Cleaning intensity": { en: "Cleaning intensity", sv: "Städnivå", ar: "مستوى التنظيف" },
  "Payment method": { en: "Payment method", sv: "Betalningsmetod", ar: "طريقة الدفع" },
  "Base price": { en: "Base price", sv: "Grundpris", ar: "السعر الأساسي" },
  "Total": { en: "Total", sv: "Totalt", ar: "المجموع" },
  "Booking name": { en: "Booking name", sv: "Namn för bokningen", ar: "اسم الحجز" },
  "Pickup location": { en: "Pickup location", sv: "Upphämtningsplats", ar: "مكان الاستلام" },
  "Passengers (1-4)": { en: "Passengers (1-4)", sv: "Passagerare (1-4)", ar: "المسافرون (1-4)" },
  "Date": { en: "Date", sv: "Datum", ar: "التاريخ" },
  "Return date": { en: "Return date", sv: "Returdatum", ar: "تاريخ العودة" },
  "Return time": { en: "Return time", sv: "Returtid", ar: "وقت العودة" },
  "Full name": { en: "Full name", sv: "Fullständigt namn", ar: "الاسم الكامل" },
  "Email": { en: "Email", sv: "E-post", ar: "البريد الإلكتروني" },
  "Number of people": { en: "Number of people", sv: "Antal personer", ar: "عدد الأشخاص" },
  "Weight (kg)": { en: "Weight (kg)", sv: "Vikt (kg)", ar: "الوزن (كغ)" },
  "Recipient phone": { en: "Recipient phone", sv: "Mottagarens telefon", ar: "هاتف المستلم" },
  "Select a departure date": { en: "Select a departure date", sv: "Välj ett avgångsdatum", ar: "اختر تاريخ المغادرة" },
  "Container size": { en: "Container size", sv: "Containerstorlek", ar: "حجم الحاوية" },
  "20ft container": { en: "20ft container", sv: "20 fots container", ar: "حاوية 20 قدم" },
  "40ft container": { en: "40ft container", sv: "40 fots container", ar: "حاوية 40 قدم" },
  "Smaller loads": { en: "Smaller loads", sv: "Mindre laster", ar: "حمولات أصغر" },
  "Larger loads": { en: "Larger loads", sv: "Större laster", ar: "حمولات أكبر" },
  "Yes": { en: "Yes", sv: "Ja", ar: "نعم" },
  "No": { en: "No", sv: "Nej", ar: "لا" },
  "Use points": { en: "Use points", sv: "Använd poäng", ar: "استخدم النقاط" },
  "Optional": { en: "Optional", sv: "Valfritt", ar: "اختياري" },
  "Pay the driver when you are picked up": { en: "Pay the driver when you are picked up", sv: "Betala föraren vid upphämtning", ar: "ادفع للسائق عند الاستلام" },
  "Pay the movers when the job is done": { en: "Pay the movers when the job is done", sv: "Betala flyttfirman när jobbet är klart", ar: "ادفع لفريق النقل عند انتهاء العمل" },
  "Pay when your parcel is delivered": { en: "Pay when your parcel is delivered", sv: "Betala när ditt paket levereras", ar: "ادفع عند تسليم طردك" },
  "Pay when your container is delivered": { en: "Pay when your container is delivered", sv: "Betala när din container levereras", ar: "ادفع عند تسليم حاويتك" },
  "Pay securely by card now": { en: "Pay securely by card now", sv: "Betala säkert med kort nu", ar: "ادفع بأمان بالبطاقة الآن" },
  "Choose every room that needs cleaning": { en: "Choose every room that needs cleaning", sv: "Välj alla rum som behöver städas", ar: "اختر كل غرفة تحتاج إلى تنظيف" },
  "Dates with a scheduled departure are marked": { en: "Dates with a scheduled departure are marked", sv: "Datum med schemalagd avgång är markerade", ar: "التواريخ التي فيها موعد مغادرة محددة بعلامة" },
  "We use these details to confirm your booking": { en: "We use these details to confirm your booking", sv: "Vi använder uppgifterna för att bekräfta din bokning", ar: "نستخدم هذه البيانات لتأكيد حجزك" },
  "Category and weight": { en: "Category and weight", sv: "Kategori och vikt", ar: "الفئة والوزن" },
  "Child seat, extra luggage, access codes…": { en: "Child seat, extra luggage, access codes…", sv: "Bilbarnstol, extra bagage, portkoder…", ar: "مقعد أطفال، أمتعة إضافية، رموز الدخول…" },
  "Anything the driver should know?": { en: "Anything the driver should know?", sv: "Något föraren bör veta?", ar: "هل هناك ما يجب أن يعرفه السائق؟" },
  "All departures": { en: "All departures", sv: "Alla avgångar", ar: "جميع المغادرات" },
  "Latest news": { en: "Latest news", sv: "Senaste nyheter", ar: "آخر الأخبار" },
  "Sidan hittades inte": { en: "Page not found", sv: "Sidan hittades inte", ar: "الصفحة غير موجودة" },
  "Your transport between Sweden and Tunisia": { en: "Your transport between Sweden and Tunisia", sv: "Din transport mellan Sverige och Tunisien", ar: "نقلك بين السويد وتونس" },
  "Browse services": { en: "Browse services", sv: "Bläddra i tjänster", ar: "تصفح الخدمات" },
  "Shipping and more": { en: "Shipping and more", sv: "Frakt och mer", ar: "الشحن وغيرها" },
  "Browse the schedule": { en: "Browse the schedule", sv: "Bläddra i schemat", ar: "تصفح الجدول" },
  "Updates from us": { en: "Updates from us", sv: "Uppdateringar från oss", ar: "تحديثات منّا" },
  "LATEST UPDATE": { en: "LATEST UPDATE", sv: "SENASTE UPPDATERING", ar: "آخر تحديث" },
  "Sign out": { en: "Sign out", sv: "Logga ut", ar: "تسجيل الخروج" },
  "My Shipments": { en: "My Shipments", sv: "Mina försändelser", ar: "شحني" },
  "My Trips": { en: "My Trips", sv: "Mina resor", ar: "رحلاتي" },
  "Help & Support": { en: "Help & Support", sv: "Hjälp och support", ar: "المساعدة والدعم" },
  "Open admin dashboard": { en: "Open admin dashboard", sv: "Öppna adminpanel", ar: "افتح لوحة الإدارة" },
  "VIP Member": { en: "VIP Member", sv: "Vipmedlem", ar: "عضو VIP" },
  "Super Member": { en: "Super Member", sv: "Supermedlem", ar: "عضو سوبر" },
  "Master Member": { en: "Master Member", sv: "Mastermedlem", ar: "عضو ماستر" },
  "Diamond Member": { en: "Diamond Member", sv: "Diamondmedlem", ar: "عضو الماس" },
  "Platinum Member": { en: "Platinum Member", sv: "Platinummedlem", ar: "عضو بلاتين" },
  "Gold Member": { en: "Gold Member", sv: "Goldmedlem", ar: "عضو ذهبي" },
  "Silver Member": { en: "Silver Member", sv: "Silvermedlem", ar: "عضو فضي" },
  "Standard Member": { en: "Standard Member", sv: "Standardmedlem", ar: "عضو عادي" },
  "Upcoming": { en: "Upcoming", sv: "Kommande", ar: "قادمة" },
  "Past": { en: "Past", sv: "Tidigare", ar: "سابقة" },
  "All": { en: "All", sv: "Alla", ar: "الكل" },
  "Inga tidigare avgångar att visa ännu.": { en: "No past departures to show yet.", sv: "Inga tidigare avgångar att visa ännu.", ar: "لا توجد مغادرات سابقة للعرض بعد." },
  "Inga avgångar har schemalagts ännu.": { en: "No departures scheduled yet.", sv: "Inga avgångar har schemalagts ännu.", ar: "لم يتم جدولة أي مغادرات بعد." },
  "Inga kommande avgångar är schemalagda just nu.": { en: "No upcoming departures scheduled right now.", sv: "Inga kommande avgångar är schemalagda just nu.", ar: "لا توجد مغادرات قادمة مجدولة حالياً." },
  "Use the calendar to see every scheduled departure.": { en: "Use the calendar to see every scheduled departure.", sv: "Använd kalendern för att se alla schemalagda avgångar.", ar: "استخدم التقويم لرؤية كل المغادرات المجدولة." },
  "Open departure board": { en: "Open departure board", sv: "Öppna avgångstavlan", ar: "افتح لوحة المغادرات" },
  "Open trip calendar": { en: "Open trip calendar", sv: "Öppna reskalendern", ar: "افتح تقويم الرحلات" },
  "Operations": { en: "Operations", sv: "Drift", ar: "العمليات" },
  "Manage the transport service": { en: "Manage the transport service", sv: "Hantera transporttjänsten", ar: "إدارة خدمة النقل" },
  "ADMIN OVERVIEW": { en: "ADMIN OVERVIEW", sv: "ADMINÖVERSIKT", ar: "نظرة عامة على الإدارة" },
  "Good morning": { en: "Good morning", sv: "God morgon", ar: "صباح الخير" },
  "Manage trips, customers and service requests.": { en: "Manage trips, customers and service requests.", sv: "Hantera resor, kunder och serviceförfrågningar.", ar: "إدارة الرحلات والعملاء وطلبات الخدمة." },
  "pending": { en: "pending", sv: "väntande", ar: "معلق" },
  "All caught up": { en: "All caught up", sv: "Allt är uppdaterat", ar: "تمت المتابعة" },
  "Dashboard data could not load. Tap to retry.": { en: "Dashboard data could not load. Tap to retry.", sv: "Instrumentpaneldata kunde inte laddas. Tryck för att försöka igen.", ar: "تعذّر تحميل بيانات لوحة التحكم. اضغط لإعادة المحاولة." },
  "Shipments": { en: "Shipments", sv: "Försändelser", ar: "الشحنات" },
  "Customers": { en: "Customers", sv: "Kunder", ar: "العملاء" },
  "Announcements": { en: "Announcements", sv: "Meddelanden", ar: "الإعلانات" },
  "Recent activity": { en: "Recent activity", sv: "Senaste aktivitet", ar: "النشاط الأخير" },
  "Latest updates": { en: "Latest updates", sv: "Senaste uppdateringar", ar: "آخر التحديثات" },
  "No recent activity yet": { en: "No recent activity yet", sv: "Ingen senaste aktivitet ännu", ar: "لا يوجد نشاط حديث بعد" },
  "Quick access": { en: "Quick access", sv: "Snabbåtkomst", ar: "وصول سريع" },
  "Common admin tasks": { en: "Common admin tasks", sv: "Vanliga adminuppgifter", ar: "المهام الإدارية الشائعة" },
  "Trip schedules": { en: "Trip schedules", sv: "Resplaner", ar: "جداول الرحلات" },
  "Departures and capacity": { en: "Departures and capacity", sv: "Avgångar och kapacitet", ar: "المغادرات والسعة" },
  "Shipment orders": { en: "Shipment orders", sv: "Försändelseorder", ar: "طلبات الشحن" },
  "Customer shipments": { en: "Customer shipments", sv: "Kundförsändelser", ar: "شحنات العملاء" },
  "Accounts and access": { en: "Accounts and access", sv: "Konton och åtkomst", ar: "الحسابات والوصول" },
  "Published company news": { en: "Published company news", sv: "Publicerade företagsnyheter", ar: "أخبار الشركة المنشورة" },
  "Schedule updated": { en: "Schedule updated", sv: "Schema uppdaterat", ar: "تم تحديث الجدول" },
  "Announcement published": { en: "Announcement published", sv: "Meddelande publicerat", ar: "تم نشر الإعلان" },
  "Customer account created": { en: "Customer account created", sv: "Kundkonto skapat", ar: "تم إنشاء حساب العميل" },
  "Taxi request received": { en: "Taxi request received", sv: "Taxiförfrågan mottagen", ar: "تم استلام طلب التاكسي" },
  "New shipment booking": { en: "New shipment booking", sv: "Ny försändelsebokning", ar: "حجز شحن جديد" },
  "Operations update": { en: "Operations update", sv: "Driftuppdatering", ar: "تحديث العمليات" },
  "TUNISISKA · TRIP WIDGET": { en: "TUNISISKA · TRIP WIDGET", sv: "TUNISISKA · RESWIDGET", ar: "تونيسيسكا · أداة الرحلة" },
  "Your next departure": { en: "Your next departure", sv: "Din nästa avgång", ar: "مغادرتك القادمة" },
  "See your departure without opening the app": { en: "See your departure without opening the app", sv: "Se din avgång utan att öppna appen", ar: "رؤية مغادرتك دون فتح التطبيق" },
  "Dynamic Island guide": { en: "Dynamic Island guide", sv: "Dynamic Island-guide", ar: "دليل الجزيرة الديناميكية" },
  "Follow your trip from the top of your iPhone": { en: "Follow your trip from the top of your iPhone", sv: "Följ din resa från toppen av din iPhone", ar: "تابع رحلتك من أعلى جهاز iPhone" },
  "What you need": { en: "What you need", sv: "Vad du behöver", ar: "ما تحتاجه" },
  "A supported iPhone": { en: "A supported iPhone", sv: "En stödd iPhone", ar: "iPhone مدعوم" },
  "Requirements and setup steps": { en: "Requirements and setup steps", sv: "Krav och installationssteg", ar: "المتطلبات وخطوات الإعداد" },
  "Keep an upcoming trip": { en: "Keep an upcoming trip", sv: "Behåll en kommande resa", ar: "احتفظ برحلة قادمة" },
  "Enable Live Activities": { en: "Enable Live Activities", sv: "Aktivera Liveaktiviteter", ar: "فعّل الأنشطة المباشرة" },
  "Preview next departure": { en: "Preview next departure", sv: "Förhandsvisa nästa avgång", ar: "معاينة المغادرة القادمة" },
  "Preview departure": { en: "Preview departure", sv: "Förhandsvisa avgång", ar: "معاينة المغادرة" },
  "Open iPhone settings": { en: "Open iPhone settings", sv: "Öppna iPhone-inställningar", ar: "افتح إعدادات iPhone" },
  "Available in the app": { en: "Available in the app", sv: "Tillgänglig i appen", ar: "متاح في التطبيق" },
  "View departures": { en: "View departures", sv: "Visa avgångar", ar: "عرض المغادرات" },
  "No departure scheduled": { en: "No departure scheduled", sv: "Ingen avgång planerad", ar: "لا توجد مغادرة مجدولة" },
  "New departures are announced in News": { en: "New departures are announced in News", sv: "Nya avgångar meddelas i Nyheter", ar: "أُعلن عن المغادرات الجديدة في الأخبار" },
  "Departure board": { en: "Departure board", sv: "Avgångstavla", ar: "لوحة المغادرات" },
  "Scheduled journeys": { en: "Scheduled journeys", sv: "Planerade resor", ar: "الرحلات المجدولة" },
  "Route diagram": { en: "Route diagram", sv: "Rutt-diagram", ar: "مخطط المسار" },
  "Journey stops": { en: "Journey stops", sv: "Resestopp", ar: "محطات الرحلة" },
  "Departure": { en: "Departure", sv: "Avgång", ar: "المغادرة" },
  "Service stop": { en: "Service stop", sv: "Service-stopp", ar: "محطة خدمة" },
  "Not available": { en: "Not available", sv: "Inte tillgänglig", ar: "غير متوفر" },
  "Destination": { en: "Destination", sv: "Destination", ar: "الوجهة" },
  "Stowage manifest": { en: "Stowage manifest", sv: "Lastmanifest", ar: "قائمة التخزين" },
  "Live Activity is an iPhone feature": { en: "Live Activity is an iPhone feature", sv: "Liveaktivitet är en iPhone-funktion", ar: "النشاط المباشر ميزة iPhone" },
  "View my shipments": { en: "View my shipments", sv: "Visa mina försändelser", ar: "عرض شحناتي" },
  "Browse trips": { en: "Browse trips", sv: "Bläddra i resor", ar: "تصفح الرحلات" },
  "Serviced regions": { en: "Serviced regions", sv: "Betjänade regioner", ar: "المناطق المخدومة" },
  "Open": { en: "Open", sv: "Öppen", ar: "مفتوح" },
  "Couldn’t load departures": { en: "Couldn’t load departures", sv: "Kunde inte ladda avgångar", ar: "تعذّر تحميل المغادرات" },
  "No upcoming departure": { en: "No upcoming departure", sv: "Ingen kommande avgång", ar: "لا توجد مغادرة قادمة" },
  "A route view will appear when a departure is scheduled.": { en: "A route view will appear when a departure is scheduled.", sv: "En ruttvy visas när en avgång är planerad.", ar: "سيظهر عرض المسار عندما تكون مغادرة مجدولة." },
  "Check back soon for the next journey.": { en: "Check back soon for the next journey.", sv: "Kom tillbaka snart för nästa resa.", ar: "تحقق قريباً من الرحلة القادمة." },
  "Loading capacity": { en: "Loading capacity", sv: "Laddar kapacitet", ar: "جارٍ تحميل السعة" },
  "Unavailable": { en: "Unavailable", sv: "Inte tillgänglig", ar: "غير متوفر" },
  "UPCOMING DEPARTURES": { en: "UPCOMING DEPARTURES", sv: "KOMMANDE AVGÅNGAR", ar: "المغادرات القادمة" },
  "scheduled": { en: "scheduled", sv: "planerade", ar: "مجدولة" },
  "Choose a departure to see its route and details.": { en: "Choose a departure to see its route and details.", sv: "Välj en avgång för att se dess rutt och detaljer.", ar: "اختر مغادرة للاطلاع على مسارها وتفاصيلها." },
  "No departures scheduled": { en: "No departures scheduled", sv: "Inga avgångar planerade", ar: "لا توجد مغادرات مجدولة" },
  "Stops reflect the locations configured for this departure.": { en: "Stops reflect the locations configured for this departure.", sv: "Stopp speglar platserna som konfigurerats för denna avgång.", ar: "تعكس المحطات المواقع المُهيأة لهذه المغادرة." },
  "Shipment manifest": { en: "Shipment manifest", sv: "Försändelsemanifest", ar: "قائمة الشحن" },
  "Navigate to departures": { en: "Navigate to departures", sv: "Gå till avgångar", ar: "انتقل إلى المغادرات" },
  "Widgets": { en: "Widgets", sv: "Widgetar", ar: "الأدوات" },
  "Your next trip on the Home Screen": { en: "Your next trip on the Home Screen", sv: "Din nästa resa på hemskärmen", ar: "رحلتك القادمة على الشاشة الرئيسية" },
  "Your next trip, one glance away": { en: "Your next trip, one glance away", sv: "Din nästa resa, en blick bort", ar: "رحلتك القادمة في لمحة" },
  "Home Screen widgets are ready to add": { en: "Home Screen widgets are ready to add", sv: "Hemskärmswidgetar kan läggas till", ar: "أدوات الشاشة الرئيسية جاهزة للإضافة" },
  "Widget previews are available in the app": { en: "Widget previews are available in the app", sv: "Widgetförhandsvisningar finns i appen", ar: "معاينات الأدوات متاحة داخل التطبيق" },
  "Widgets and Live Activities are available": { en: "Widgets and Live Activities are available", sv: "Widgetar och liveaktiviteter är tillgängliga", ar: "الأدوات والأنشطة المباشرة متاحة" },
  "Live Activities are turned off in Settings": { en: "Live Activities are turned off in Settings", sv: "Liveaktiviteter är avstängda i Inställningar", ar: "الأنشطة المباشرة متوقفة في الإعدادات" },
  "Checking Live Activity availability": { en: "Checking Live Activity availability", sv: "Kontrollerar stöd för liveaktiviteter", ar: "جارٍ التحقق من توفر الأنشطة المباشرة" },
  "PREVIEW": { en: "PREVIEW", sv: "FÖRHANDSVISNING", ar: "معاينة" },
  "The same navy card is used by the Home Screen widget, the Lock Screen card and the Dynamic Island.": { en: "The same navy card is used by the Home Screen widget, the Lock Screen card and the Dynamic Island.", sv: "Samma marinblå kort används av hemskärmswidgeten, låsskärmen och Dynamic Island.", ar: "البطاقة الكحلية نفسها تُستخدم في أداة الشاشة الرئيسية وبطاقة شاشة القفل والجزيرة الديناميكية." },
  "The navy card adapts to 2 × 2, 4 × 2 and 4 × 4 sizes, and switches to a white surface in light theme.": { en: "The navy card adapts to 2 × 2, 4 × 2 and 4 × 4 sizes, and switches to a white surface in light theme.", sv: "Det marinblå kortet anpassas till storlekarna 2 × 2, 4 × 2 och 4 × 4 och blir vitt i ljust tema.", ar: "تتكيّف البطاقة الكحلية مع الأحجام 2 × 2 و4 × 2 و4 × 4، وتصبح بيضاء في السمة الفاتحة." },
  "WIDGET FAMILIES": { en: "WIDGET FAMILIES", sv: "WIDGETSTORLEKAR", ar: "أحجام الأدوات" },
  "Small": { en: "Small", sv: "Liten", ar: "صغيرة" },
  "Medium": { en: "Medium", sv: "Medel", ar: "متوسطة" },
  "Large": { en: "Large", sv: "Stor", ar: "كبيرة" },
  "Lock Screen": { en: "Lock Screen", sv: "Låsskärm", ar: "شاشة القفل" },
  "2 × 2 · countdown": { en: "2 × 2 · countdown", sv: "2 × 2 · nedräkning", ar: "2 × 2 · عدّاد" },
  "4 × 2 · route": { en: "4 × 2 · route", sv: "4 × 2 · rutt", ar: "4 × 2 · المسار" },
  "4 × 4 · briefing": { en: "4 × 4 · briefing", sv: "4 × 4 · översikt", ar: "4 × 4 · ملخص" },
  "3 accessory styles": { en: "3 accessory styles", sv: "3 tillbehörsstilar", ar: "3 أنماط ملحقات" },
  "day + route": { en: "day + route", sv: "dag + rutt", ar: "اليوم + المسار" },
  "route + countdown": { en: "route + countdown", sv: "rutt + nedräkning", ar: "المسار + العدّاد" },
  "full briefing": { en: "full briefing", sv: "full översikt", ar: "ملخص كامل" },
  "Departing soon": { en: "Departing soon", sv: "Avgår snart", ar: "تغادر قريبًا" },
  "No departures": { en: "No departures", sv: "Inga avgångar", ar: "لا توجد مغادرات" },
  "Home Screen & Lock Screen": { en: "Home Screen & Lock Screen", sv: "Hemskärm och låsskärm", ar: "الشاشة الرئيسية وشاشة القفل" },
  "Add a widget or enable Live Activities": { en: "Add a widget or enable Live Activities", sv: "Lägg till en widget eller aktivera liveaktiviteter", ar: "أضف أداة أو فعّل الأنشطة المباشرة" },
  "Add and resize the departure widget": { en: "Add and resize the departure widget", sv: "Lägg till och ändra storlek på avgångswidgeten", ar: "أضف أداة المغادرة وغيّر حجمها" },
  "Dynamic Island": { en: "Dynamic Island", sv: "Dynamic Island", ar: "الجزيرة الديناميكية" },
  "Compact, minimal and expanded states": { en: "Compact, minimal and expanded states", sv: "Kompakt, minimal och expanderad", ar: "حالات مدمجة ومصغّرة وموسّعة" },
  "NEXT DEPARTURE": { en: "NEXT DEPARTURE", sv: "NÄSTA AVGÅNG", ar: "الرحلة القادمة" },
  "NEXT": { en: "NEXT", sv: "NÄSTA", ar: "التالية" },
  "NEXT TRIP": { en: "NEXT TRIP", sv: "NÄSTA RESA", ar: "الرحلة التالية" },
  "IN 5 DAYS": { en: "IN 5 DAYS", sv: "OM 5 DAGAR", ar: "بعد 5 أيام" },
  "DAYS": { en: "DAYS", sv: "DAGAR", ar: "أيام" },
  "TRACK": { en: "TRACK", sv: "SPÅRA", ar: "تتبع" },
  "CARGO": { en: "CARGO", sv: "LAST", ar: "الشحن" },
  "View trip": { en: "View trip", sv: "Visa resa", ar: "عرض الرحلة" },
  "Track parcel": { en: "Track parcel", sv: "Spåra paket", ar: "تتبع الطرد" },
  "The Dynamic Island appears on iPhone models that include it. Every other iPhone shows the Lock Screen card instead.": { en: "The Dynamic Island appears on iPhone models that include it. Every other iPhone shows the Lock Screen card instead.", sv: "Dynamic Island visas på iPhone-modeller som har den. Övriga iPhone visar låsskärmens kort i stället.", ar: "تظهر الجزيرة الديناميكية على طرازات iPhone التي تحتوي عليها، بينما تعرض بقية الطرازات بطاقة شاشة القفل بدلًا منها." },
  "In Settings, open Tunisiska and allow Live Activities for the app.": { en: "In Settings, open Tunisiska and allow Live Activities for the app.", sv: "Öppna Inställningar, välj Tunisiska och tillåt liveaktiviteter för appen.", ar: "افتح الإعدادات، اختر Tunisiska، ثم اسمح بالأنشطة المباشرة للتطبيق." },
  "An upcoming departure": { en: "An upcoming departure", sv: "En kommande avgång", ar: "مغادرة قادمة" },
  "The app keeps the next scheduled trip in the activity, including its route, departure time and cargo space.": { en: "The app keeps the next scheduled trip in the activity, including its route, departure time and cargo space.", sv: "Appen håller nästa planerade resa i aktiviteten, med rutt, avgångstid och lastutrymme.", ar: "يحتفظ التطبيق بالرحلة القادمة في النشاط، بما فيها المسار ووقت المغادرة والمساحة المتبقية." },
  "Open live preview": { en: "Open live preview", sv: "Öppna liveförhandsvisning", ar: "افتح المعاينة المباشرة" },
  "Set it up": { en: "Set it up", sv: "Så gör du", ar: "طريقة الإعداد" },
  "Add the Home Screen widget": { en: "Add the Home Screen widget", sv: "Lägg till hemskärmswidgeten", ar: "أضف أداة الشاشة الرئيسية" },
  "Touch and hold the Home Screen, tap Edit, choose Add Widget, then select Tunisiska Mega. Pick small, medium or large.": { en: "Touch and hold the Home Screen, tap Edit, choose Add Widget, then select Tunisiska Mega. Pick small, medium or large.", sv: "Håll kvar på hemskärmen, tryck Redigera, välj Lägg till widget och sedan Tunisiska Mega. Välj liten, medel eller stor.", ar: "اضغط مطولًا على الشاشة الرئيسية، اختر تحرير، ثم إضافة أداة، ثم Tunisiska Mega. اختر صغيرة أو متوسطة أو كبيرة." },
  "Add the Lock Screen widget": { en: "Add the Lock Screen widget", sv: "Lägg till låsskärmswidgeten", ar: "أضف أداة شاشة القفل" },
  "Touch and hold the Lock Screen, tap Customise, then add Tunisiska under the widget row and choose a circular or rectangular style.": { en: "Touch and hold the Lock Screen, tap Customise, then add Tunisiska under the widget row and choose a circular or rectangular style.", sv: "Håll kvar på låsskärmen, tryck Anpassa, lägg till Tunisiska under widgetraden och välj cirkulär eller rektangulär stil.", ar: "اضغط مطولاً على شاشة القفل، اختر تخصيص، ثم أضف Tunisiska ضمن صف الأدوات واختر النمط الدائري أو المستطيل." },
  "For the Lock Screen card and Dynamic Island, open iPhone Settings, choose Tunisiska, then turn on Live Activities.": { en: "For the Lock Screen card and Dynamic Island, open iPhone Settings, choose Tunisiska, then turn on Live Activities.", sv: "För låsskärmens kort och Dynamic Island: öppna iPhone-inställningar, välj Tunisiska och slå på liveaktiviteter.", ar: "لبطاقة شاشة القفل والجزيرة الديناميكية: افتح إعدادات iPhone، اختر Tunisiska، ثم شغّل الأنشطة المباشرة." },
  "Open your Home Screen widgets": { en: "Open your Home Screen widgets", sv: "Öppna hemskärmens widgetar", ar: "افتح أدوات الشاشة الرئيسية" },
  "Touch and hold an empty area of the Home Screen, then tap Widgets.": { en: "Touch and hold an empty area of the Home Screen, then tap Widgets.", sv: "Håll kvar på en tom yta på hemskärmen och tryck sedan Widgetar.", ar: "اضغط مطولًا على مساحة فارغة في الشاشة الرئيسية ثم اختر الأدوات." },
  "Add Tunisiska Mega": { en: "Add Tunisiska Mega", sv: "Lägg till Tunisiska Mega", ar: "أضف Tunisiska Mega" },
  "Find Tunisiska Mega, drag the departure widget onto your Home Screen, then resize it to 2 × 2, 4 × 2 or 4 × 4.": { en: "Find Tunisiska Mega, drag the departure widget onto your Home Screen, then resize it to 2 × 2, 4 × 2 or 4 × 4.", sv: "Hitta Tunisiska Mega, dra avgångswidgeten till hemskärmen och ändra storlek till 2 × 2, 4 × 2 eller 4 × 4.", ar: "ابحث عن Tunisiska Mega، اسحب أداة المغادرة إلى الشاشة الرئيسية، ثم غيّر حجمها إلى 2 × 2 أو 4 × 2 أو 4 × 4." },
  "Tap to follow your trip": { en: "Tap to follow your trip", sv: "Tryck för att följa resan", ar: "اضغط لمتابعة رحلتك" },
  "The widget shows the next route, the countdown and remaining cargo space. Tap it to open the trip.": { en: "The widget shows the next route, the countdown and remaining cargo space. Tap it to open the trip.", sv: "Widgeten visar nästa rutt, nedräkningen och kvarvarande lastutrymme. Tryck för att öppna resan.", ar: "تعرض الأداة المسار القادم والعدّاد والمساحة المتبقية. اضغط لفتح الرحلة." },
  "Widgets & Lock Screen": { en: "Widgets & Lock Screen", sv: "Widgetar och låsskärm", ar: "الأدوات وشاشة القفل" },
  "LOCK SCREEN CARD": { en: "LOCK SCREEN CARD", sv: "LÅSSKÄRMENS KORT", ar: "بطاقة شاشة القفل" },
  "HOME SCREEN WIDGET": { en: "HOME SCREEN WIDGET", sv: "HEMSKÄRMSWIDGET", ar: "أداة الشاشة الرئيسية" },
  "SMALL AND LARGE": { en: "SMALL AND LARGE", sv: "LITEN OCH STOR", ar: "صغيرة وكبيرة" },
  "SIZES": { en: "SIZES", sv: "STORLEKAR", ar: "الأحجام" },
  "Route, departure time, vehicle and remaining cargo — with the same state language as the app.": { en: "Route, departure time, vehicle and remaining cargo — with the same state language as the app.", sv: "Rutt, avgångstid, fordon och kvarvarande last — med samma statusspråk som i appen.", ar: "المسار ووقت المغادرة والمركبة والمساحة المتبقية — بنفس لغة الحالات في التطبيق." },
  "Small is a countdown, large adds the collected and delivery stops plus deep links to the trip and parcel tracking.": { en: "Small is a countdown, large adds the collected and delivery stops plus deep links to the trip and parcel tracking.", sv: "Liten är en nedräkning, stor lägger till upphämtnings- och leveransstopp samt direktlänkar till resan och paketspårning.", ar: "الصغيرة عدّاد، والكبيرة تضيف محطتي الاستلام والتسليم وروابط مباشرة للرحلة وتتبع الطرد." },
  "Drag the corner of the widget to resize. The layout switches between the compact and briefing variants automatically.": { en: "Drag the corner of the widget to resize. The layout switches between the compact and briefing variants automatically.", sv: "Dra i widgetens hörn för att ändra storlek. Layouten växlar automatiskt mellan kompakt och översikt.", ar: "اسحب زاوية الأداة لتغيير حجمها. يتبدّل التخطيط تلقائيًا بين المدمج والملخص." },
  "COMPACT": { en: "COMPACT", sv: "KOMPAKT", ar: "مدمج" },
  "MINIMAL": { en: "MINIMAL", sv: "MINIMAL", ar: "مصغّر" },
  "EXPANDED · SCHEDULED": { en: "EXPANDED · SCHEDULED", sv: "EXPANDERAD · PLANERAD", ar: "موسّع · مجدول" },
  "EXPANDED · DEPARTING SOON": { en: "EXPANDED · DEPARTING SOON", sv: "EXPANDERAD · AVGÅR SNART", ar: "موسّع · تغادر قريبًا" },
  "Departs in": { en: "Departs in", sv: "Avgår om", ar: "تغادر خلال" },
  "Gate B · Cargo van": { en: "Gate B · Cargo van", sv: "Grind B · Skåpbil", ar: "بوابة B · شاحنة بضائع" },
  "in 5 days": { en: "in 5 days", sv: "om 5 dagar", ar: "بعد 5 أيام" },
  "until departure": { en: "until departure", sv: "till avgång", ar: "حتى المغادرة" },
  "View departure": { en: "View departure", sv: "Visa avgång", ar: "عرض المغادرة" },
  "Your departure details remain available in the app on this device.": { en: "Your departure details remain available in the app on this device.", sv: "Avgångsuppgifterna finns kvar i appen på den här enheten.", ar: "تبقى تفاصيل مغادرتك متاحة في التطبيق على هذا الجهاز." },
  "SCHEDULED": { en: "SCHEDULED", sv: "PLANERAD", ar: "مجدول" },
  "Capacity not shared": { en: "Capacity not shared", sv: "Kapacitet ej angiven", ar: "السعة غير محددة" },
  "Capacity details have not been published for this departure.": { en: "Capacity details have not been published for this departure.", sv: "Kapacitetsuppgifter har inte publicerats för denna avgång.", ar: "لم تُنشر تفاصيل السعة لهذه المغادرة." },
  "Live preview": { en: "Live preview", sv: "Liveförhandsvisning", ar: "معاينة مباشرة" },
  "Preview states": { en: "Preview states", sv: "Förhandsvisa lägen", ar: "معاينة الحالات" },
  "Widget families": { en: "Widget families", sv: "Widgetfamiljer", ar: "عائلات الأدوات" },
  "Choose the size that fits your Home Screen.": { en: "Choose the size that fits your Home Screen.", sv: "Välj den storlek som passar din hemskärm.", ar: "اختر الحجم الذي يناسب شاشتك الرئيسية." },
  "2 × 2": { en: "2 × 2", sv: "2 × 2", ar: "2 × 2" },
  "4 × 2": { en: "4 × 2", sv: "4 × 2", ar: "4 × 2" },
  "4 × 4": { en: "4 × 4", sv: "4 × 4", ar: "4 × 4" },
  "Small and large": { en: "Small and large", sv: "Liten och stor", ar: "صغيرة وكبيرة" },
  "Sizes": { en: "Sizes", sv: "Storlekar", ar: "الأحجام" },
  "110 dp · day + route": { en: "110 dp · day + route", sv: "110 dp · dag + rutt", ar: "110 dp · اليوم + المسار" },
  "250 × 110 dp · ring": { en: "250 × 110 dp · ring", sv: "250 × 110 dp · ring", ar: "250 × 110 dp · حلقة" },
  "250 dp · briefing": { en: "250 dp · briefing", sv: "250 dp · översikt", ar: "250 dp · ملخص" },
  "LIVE PREVIEW": { en: "LIVE PREVIEW", sv: "LIVE-FÖRHANDSVISNING", ar: "معاينة مباشرة" },
  "EXPANDED": { en: "EXPANDED", sv: "EXPANDERAD", ar: "موسّع" },
  MIN: { en: "MIN", sv: "MIN", ar: "د" },
  "Departs in 12 min": { en: "Departs in 12 min", sv: "Avgår om 12 min", ar: "تغادر خلال 12 دقيقة" },
  "Medium · 338 pt": { en: "Medium · 338 pt", sv: "Mellan · 338 pt", ar: "متوسطة · 338 pt" },
  "4 × 2 · 250 dp": { en: "4 × 2 · 250 dp", sv: "4 × 2 · 250 dp", ar: "4 × 2 · 250 dp" },
  "Select Date": { en: "Select Date", sv: "Välj datum", ar: "اختر التاريخ" },
  "Previous month": { en: "Previous month", sv: "Föregående månad", ar: "الشهر السابق" },
  "Next month": { en: "Next month", sv: "Nästa månad", ar: "الشهر التالي" },
  "Nothing departs on this date.": { en: "Nothing departs on this date.", sv: "Inga avgångar den här dagen.", ar: "لا توجد مغادرات في هذا التاريخ." },
  "departures available": { en: "departures available", sv: "avgångar tillgängliga", ar: "مغادرات متاحة" },
  "Select a date to see the departures scheduled for that day. Dates with an orange marker have a scheduled departure.": { en: "Select a date to see the departures scheduled for that day. Dates with an orange marker have a scheduled departure.", sv: "Välj ett datum för att se avgångarna den dagen. Datum med en orange markering har en schemalagd avgång.", ar: "اختر تاريخاً لعرض المغادرات المجدولة في ذلك اليوم. التواريخ التي تحمل علامة برتقالية لديها موعد مغادرة مجدول." },
  "We’re here to help": { en: "We're here to help", sv: "Vi finns här för att hjälpa", ar: "نحن هنا لمساعدتك" },
  "How can we help?": { en: "How can we help?", sv: "Hur kan vi hjälpa dig?", ar: "كيف يمكننا مساعدتك؟" },
  "Choose a contact option or browse the information below.": { en: "Choose a contact option or browse the information below.", sv: "Välj ett kontaktalternativ eller läs informationen nedan.", ar: "اختر طريقة تواصل أو تصفّح المعلومات أدناه." },
  "Chat with us": { en: "Chat with us", sv: "Chatta med oss", ar: "تحدث معنا" },
  "Message us on WhatsApp": { en: "Message us on WhatsApp", sv: "Skicka ett meddelande till oss på WhatsApp", ar: "راسلنا على واتساب" },
  "Email support": { en: "Email support", sv: "E-posta supporten", ar: "الدعم بالبريد الإلكتروني" },
  "Call support": { en: "Call support", sv: "Ring supporten", ar: "اتصل بالدعم" },
  "Contact details not configured": { en: "Contact details not configured", sv: "Kontaktuppgifter är inte konfigurerade", ar: "بيانات التواصل غير مهيأة" },
  "Frequently asked questions": { en: "Frequently asked questions", sv: "Vanliga frågor", ar: "الأسئلة الشائعة" },
  "Common questions and answers": { en: "Common questions and answers", sv: "Vanliga frågor och svar", ar: "أسئلة وأجوبة شائعة" },
  "Read our terms": { en: "Read our terms", sv: "Läs våra villkor", ar: "اقرأ شروطنا" },
  "Privacy policy": { en: "Privacy policy", sv: "Integritetspolicy", ar: "سياسة الخصوصية" },
  "How your information is used": { en: "How your information is used", sv: "Hur dina uppgifter används", ar: "كيف تُستخدم معلوماتك" },
  "Where can I find my bookings?": { en: "Where can I find my bookings?", sv: "Var hittar jag mina bokningar?", ar: "أين أجد حجوزاتي؟" },
  "Open My Shipments from your profile to see your booking status and details.": { en: "Open My Shipments from your profile to see your booking status and details.", sv: "Öppna Mina försändelser i profilen för att se status och detaljer för din bokning.", ar: "افتح شحناتي من ملفك الشخصي لعرض حالة حجزك وتفاصيله." },
  "How do I track a parcel?": { en: "How do I track a parcel?", sv: "Hur spårar jag ett paket?", ar: "كيف أتتبع طرداً؟" },
  "Open Track in Trips and enter the tracking number from your booking.": { en: "Open Track in Trips and enter the tracking number from your booking.", sv: "Öppna Spåra under Resor och ange spårningsnumret från din bokning.", ar: "افتح التتبع في الرحلات وأدخل رقم التتبع من حجزك." },
  "Contact unavailable": { en: "Contact unavailable", sv: "Kontakt ej tillgänglig", ar: "التواصل غير متاح" },
  "The support email is not configured yet.": { en: "The support email is not configured yet.", sv: "Supportens e-post är inte konfigurerad ännu.", ar: "بريد الدعم غير مهيأ بعد." },
  "The support phone number is not configured yet.": { en: "The support phone number is not configured yet.", sv: "Supportens telefonnummer är inte konfigurerat ännu.", ar: "رقم هاتف الدعم غير مهيأ بعد." },
  "The WhatsApp contact is not configured yet.": { en: "The WhatsApp contact is not configured yet.", sv: "WhatsApp-kontakten är inte konfigurerad ännu.", ar: "جهة تواصل واتساب غير مهيأة بعد." },
  "Unable to open": { en: "Unable to open", sv: "Kan inte öppna", ar: "تعذّر الفتح" },
  "No compatible app is available on this device.": { en: "No compatible app is available on this device.", sv: "Ingen kompatibel app finns på den här enheten.", ar: "لا يوجد تطبيق متوافق على هذا الجهاز." },
  "Please try again later.": { en: "Please try again later.", sv: "Försök igen senare.", ar: "يرجى المحاولة لاحقاً." },
  "Laddar wallet...": { en: "Loading wallet…", sv: "Laddar plånbok...", ar: "جارٍ تحميل المحفظة…" },
  "Totala poäng": { en: "Total points", sv: "Totala poäng", ar: "إجمالي النقاط" },
  "Dagliga Belöningar": { en: "Daily rewards", sv: "Dagliga belöningar", ar: "المكافآت اليومية" },
  "Köp poäng": { en: "Buy points", sv: "Köp poäng", ar: "شراء النقاط" },
  "Premium medlemskap": { en: "Premium membership", sv: "Premiummedlemskap", ar: "عضوية بريميوم" },
  "Välj mellan Bankkort, Klarna, Apple Pay, Google Pay ... och fler !": { en: "Choose from card, Klarna, Apple Pay, Google Pay … and more!", sv: "Välj bland bankkort, Klarna, Apple Pay, Google Pay ... och fler!", ar: "اختر من البطاقة المصرفية أو Klarna أو Apple Pay أو Google Pay … والمزيد!" },
  "POPULÄR": { en: "POPULAR", sv: "POPULÄR", ar: "الأكثر رواجاً" },
  "Senaste aktivitet": { en: "Recent activity", sv: "Senaste aktivitet", ar: "النشاط الأخير" },
  "Inga transaktioner ännu": { en: "No transactions yet", sv: "Inga transaktioner ännu", ar: "لا توجد معاملات بعد" },
  "Your wallet": { en: "Your wallet", sv: "Din plånbok", ar: "محفظتك" },
  "Recent activity and transactions": { en: "Recent activity and transactions", sv: "Senaste aktivitet och transaktioner", ar: "النشاط والمعاملات الأخيرة" },
  "Tjäna poäng": { en: "Earn points", sv: "Tjäna poäng", ar: "اكسب نقاطاً" },
  "Överför poäng": { en: "Transfer points", sv: "Överför poäng", ar: "تحويل النقاط" },
  "Dina poäng": { en: "Your points", sv: "Dina poäng", ar: "نقاطك" },
  "Välj vän att överföra till *": { en: "Choose a friend to transfer to *", sv: "Välj vän att överföra till *", ar: "اختر صديقاً للتحويل إليه *" },
  "Du har inga vänner än. Lägg till vänner först!": { en: "You have no friends yet. Add friends first!", sv: "Du har inga vänner än. Lägg till vänner först!", ar: "ليس لديك أصدقاء بعد. أضف أصدقاء أولاً!" },
  "Överföringsdetaljer": { en: "Transfer details", sv: "Överföringsdetaljer", ar: "تفاصيل التحويل" },
  "Antal poäng att överföra *": { en: "Points to transfer *", sv: "Antal poäng att överföra *", ar: "عدد النقاط المراد تحويلها *" },
  "Poäng mottagna! 🎉": { en: "Points received! 🎉", sv: "Poäng mottagna! 🎉", ar: "تم استلام النقاط! 🎉" },
  "Transfer points": { en: "Transfer points", sv: "Överför poäng", ar: "تحويل النقاط" },
  "Send points to another user": { en: "Send points to another user", sv: "Skicka poäng till en annan användare", ar: "أرسل نقاطاً إلى مستخدم آخر" },
  "Minst 10 poäng": { en: "At least 10 points", sv: "Minst 10 poäng", ar: "10 نقاط على الأقل" },
  "Laddar referral-data...": { en: "Loading referral data…", sv: "Laddar referral-data...", ar: "جارٍ تحميل بيانات الإحالة…" },
  "Each user can refer up to 10 other users.": { en: "Each user can refer up to 10 other users.", sv: "Varje användare kan värva upp till 10 andra användare.", ar: "يمكن لكل مستخدم إحالة 10 مستخدمين كحد أقصى." },
  "Totalt": { en: "Total", sv: "Totalt", ar: "الإجمالي" },
  "Aktiva": { en: "Active", sv: "Aktiva", ar: "نشط" },
  "Väntar": { en: "Pending", sv: "Väntar", ar: "قيد الانتظار" },
  "Genomförda": { en: "Completed", sv: "Genomförda", ar: "مكتملة" },
  "Din kod :": { en: "Your code:", sv: "Din kod:", ar: "رمزك:" },
  "Dela": { en: "Share", sv: "Dela", ar: "مشاركة" },
  "Inga referral-användare ännu.": { en: "No referrals yet.", sv: "Inga referral-användare ännu.", ar: "لا توجد إحالات بعد." },
  "Bonus mottagen": { en: "Bonus received", sv: "Bonus mottagen", ar: "تم استلام المكافأة" },
  "Din Kod": { en: "Your code", sv: "Din kod", ar: "رمزك" },
  "Lägg till kod": { en: "Add code", sv: "Lägg till kod", ar: "أضف رمزاً" },
  "Referral bonus! 🎉": { en: "Referral bonus! 🎉", sv: "Referralbonus! 🎉", ar: "مكافأة الإحالة! 🎉" },
  "Referrals": { en: "Referrals", sv: "Värvningar", ar: "الإحالات" },
  "Earn bonus points by inviting friends": { en: "Earn bonus points by inviting friends", sv: "Tjäna bonuspoäng genom att bjuda in vänner", ar: "اكسب نقاطاً إضافية بدعوة أصدقائك" },
  "Refresh referrals": { en: "Refresh referrals", sv: "Uppdatera värvningar", ar: "تحديث الإحالات" },
  "Kopiera kod": { en: "Copy code", sv: "Kopiera kod", ar: "نسخ الرمز" },
  "Ange referral-koden": { en: "Enter the referral code", sv: "Ange referral-koden", ar: "أدخل رمز الإحالة" },
  "Dina vänner": { en: "Your friends", sv: "Dina vänner", ar: "أصدقاؤك" },
  "Lägg till vän": { en: "Add friend", sv: "Lägg till vän", ar: "أضف صديقاً" },
  "Vännens Clerk ID *": { en: "Friend's Clerk ID *", sv: "Vännens Clerk ID *", ar: "معرّف Clerk للصديق *" },
  "Inga vänner än": { en: "No friends yet", sv: "Inga vänner än", ar: "لا يوجد أصدقاء بعد" },
  "Acceptera": { en: "Accept", sv: "Acceptera", ar: "قبول" },
  "Avvisa": { en: "Decline", sv: "Avvisa", ar: "رفض" },
  "Inga vänförfrågningar": { en: "No friend requests", sv: "Inga vänförfrågningar", ar: "لا توجد طلبات صداقة" },
  "Du har inga väntande vänförfrågningar just nu": { en: "You have no pending friend requests right now", sv: "Du har inga väntande vänförfrågningar just nu", ar: "ليس لديك طلبات صداقة معلّقة الآن" },
  "Add a friend": { en: "Add a friend", sv: "Lägg till en vän", ar: "إضافة صديق" },
  "Connect to transfer points": { en: "Connect to transfer points", sv: "Anslut för att överföra poäng", ar: "اتصل لتحويل النقاط" },
  "Tur och retur": { en: "Round trip", sv: "Tur och retur", ar: "ذهاب وعودة" },
  "Se detaljer": { en: "See details", sv: "Se detaljer", ar: "عرض التفاصيل" },
  "Laddar bokningar...": { en: "Loading bookings…", sv: "Laddar bokningar...", ar: "جارٍ تحميل الحجوزات…" },
  "Inga bokningar än": { en: "No bookings yet", sv: "Inga bokningar än", ar: "لا توجد حجوزات بعد" },
  "Dina bokningar kommer att visas här när du har gjort några": { en: "Your bookings will appear here once you have made some", sv: "Dina bokningar visas här när du har gjort några", ar: "ستظهر حجوزاتك هنا بعد إجراء بعض الحجوزات" },
  "My bookings": { en: "My bookings", sv: "Mina bokningar", ar: "حجوزاتي" },
  "Your service booking history": { en: "Your service booking history", sv: "Din bokningshistorik", ar: "سجل حجوزات خدماتك" },
  "Laddar bokningsdetaljer...": { en: "Loading booking details…", sv: "Laddar bokningsdetaljer...", ar: "جارٍ تحميل تفاصيل الحجز…" },
  "Bokning hittades inte": { en: "Booking not found", sv: "Bokningen hittades inte", ar: "لم يتم العثور على الحجز" },
  "Resväg": { en: "Route", sv: "Resväg", ar: "المسار" },
  "Avhämtning": { en: "Pickup", sv: "Avhämtning", ar: "الاستلام" },
  "Kundinformation": { en: "Customer information", sv: "Kundinformation", ar: "معلومات العميل" },
  "Kontaktuppgifter": { en: "Contact details", sv: "Kontaktuppgifter", ar: "بيانات التواصل" },
  "Namn": { en: "Name", sv: "Namn", ar: "الاسم" },
  "Telefon": { en: "Phone", sv: "Telefon", ar: "الهاتف" },
  "E-post": { en: "Email", sv: "E-post", ar: "البريد الإلكتروني" },
  "Speciella önskemål": { en: "Special requests", sv: "Speciella önskemål", ar: "طلبات خاصة" },
  "Betalning": { en: "Payment", sv: "Betalning", ar: "الدفع" },
  "Avboka": { en: "Cancel booking", sv: "Avboka", ar: "إلغاء الحجز" },
  "Booking details": { en: "Booking details", sv: "Bokningsdetaljer", ar: "تفاصيل الحجز" },
  "Shipment details": { en: "Shipment details", sv: "Försändelsedetaljer", ar: "تفاصيل الشحنة" },
  "Dela kvitto": { en: "Share receipt", sv: "Dela kvitto", ar: "مشاركة الإيصال" },
  "Support": { en: "Support", sv: "Support", ar: "الدعم" },
  "Nuvarande lösenord": { en: "Current password", sv: "Nuvarande lösenord", ar: "كلمة المرور الحالية" },
  "Nytt lösenord": { en: "New password", sv: "Nytt lösenord", ar: "كلمة المرور الجديدة" },
  "Bekräfta nytt lösenord": { en: "Confirm new password", sv: "Bekräfta nytt lösenord", ar: "تأكيد كلمة المرور الجديدة" },
  "Ange nuvarande lösenord": { en: "Enter your current password", sv: "Ange nuvarande lösenord", ar: "أدخل كلمة المرور الحالية" },
  "Välj ett nytt lösenord": { en: "Choose a new password", sv: "Välj ett nytt lösenord", ar: "اختر كلمة مرور جديدة" },
  "Bekräfta ditt nya lösenord": { en: "Confirm your new password", sv: "Bekräfta ditt nya lösenord", ar: "أكّد كلمة المرور الجديدة" },
  "Nytt Email": { en: "New email", sv: "Ny e-post", ar: "بريد إلكتروني جديد" },
  "Add email": { en: "Add email", sv: "Lägg till e-post", ar: "إضافة بريد إلكتروني" },
  "Add a new email address to your account": { en: "Add a new email address to your account", sv: "Lägg till en ny e-postadress till ditt konto", ar: "أضف عنوان بريد إلكتروني جديداً إلى حسابك" },
  "Ange ny e-postadress": { en: "Enter a new email address", sv: "Ange ny e-postadress", ar: "أدخل عنوان بريد إلكتروني جديداً" },
  "Skicka om koden": { en: "Resend code", sv: "Skicka om koden", ar: "إعادة إرسال الرمز" },
  "Enter the code sent to your new email address": { en: "Enter the code sent to your new email address", sv: "Ange koden som skickades till din nya e-postadress", ar: "أدخل الرمز المُرسل إلى بريدك الجديد" },
  "AVAILABLE LANGUAGES": { en: "AVAILABLE LANGUAGES", sv: "TILLGÄNGLIGA SPRÅK", ar: "اللغات المتاحة" },
  "Your selection is saved on this device.": { en: "Your selection is saved on this device.", sv: "Ditt val sparas på den här enheten.", ar: "يُحفظ اختيارك على هذا الجهاز." },
  "Choose your app language": { en: "Choose your app language", sv: "Välj appens språk", ar: "اختر لغة التطبيق" },
  "Open notifications": { en: "Open notifications", sv: "Öppna aviseringar", ar: "فتح الإشعارات" },
  "unread": { en: "unread", sv: "oläst", ar: "غير مقروء" },
  // Settings hub
  Preferences: { en: "Preferences", sv: "Preferenser", ar: "التفضيلات" },
  "Preferences and account": { en: "Preferences and account", sv: "Inställningar och konto", ar: "التفضيلات والحساب" },
  Account: { en: "Account", sv: "Konto", ar: "الحساب" },
  // Appearance
  "Choose how Tunisiska looks": { en: "Choose how Tunisiska looks", sv: "Välj hur Tunisiska ser ut", ar: "اختر شكل تطبيق تونيسكا" },
  "Your choice is saved on this device.": { en: "Your choice is saved on this device.", sv: "Ditt val sparas på den här enheten.", ar: "يُحفظ اختيارك على هذا الجهاز." },
  "Follow your device settings": { en: "Follow your device settings", sv: "Följ enhetens inställningar", ar: "اتبع إعدادات الجهاز" },
  "Use the light appearance": { en: "Use the light appearance", sv: "Använd det ljusa utseendet", ar: "استخدم المظهر الفاتح" },
  "Use the dark appearance": { en: "Use the dark appearance", sv: "Använd det mörka utseendet", ar: "استخدم المظهر الداكن" },
  // Notification settings
  "Manage your alerts": { en: "Manage your alerts", sv: "Hantera dina aviseringar", ar: "إدارة تنبيهاتك" },
  "Stay up to date": { en: "Stay up to date", sv: "Håll dig uppdaterad", ar: "ابقَ على اطلاع" },
  "Receive booking, shipment and departure updates on this device.": { en: "Receive booking, shipment and departure updates on this device.", sv: "Få uppdateringar om bokningar, försändelser och avgångar på den här enheten.", ar: "احصل على تحديثات الحجوزات والشحنات والمواعيد على هذا الجهاز." },
  "Push notifications": { en: "Push notifications", sv: "Push-aviseringar", ar: "الإشعارات الفورية" },
  "Allow updates from Tunisiska": { en: "Allow updates from Tunisiska", sv: "Tillåt uppdateringar från Tunisiska", ar: "اسمح بتحديثات من تونيسكا" },
  "Device permission enabled": { en: "Device permission enabled", sv: "Behörighet aktiverad", ar: "تم تفعيل الإذن" },
  "Enable push notifications": { en: "Enable push notifications", sv: "Aktivera push-aviseringar", ar: "تفعيل الإشعارات الفورية" },
  "You can also control notification permissions in your device settings.": { en: "You can also control notification permissions in your device settings.", sv: "Du kan även styra aviseringsbehörigheter i enhetens inställningar.", ar: "يمكنك أيضاً التحكم في أذونات الإشعارات من إعدادات جهازك." },
  "Delivery map": { en: "Delivery map", sv: "Leveranskarta", ar: "خريطة التسليم" },
  "Track all active deliveries in real time": { en: "Track all active deliveries in real time", sv: "Spåra alla aktiva fraktleveranser i realtid", ar: "تتبع جميع عمليات التسليم النشطة في الوقت الفعلي" },
  "Loading deliveries...": { en: "Loading deliveries...", sv: "Laddar leveranser...", ar: "جارٍ تحميل عمليات التسليم..." },
  "No active deliveries": { en: "No active deliveries", sv: "Inga aktiva leveranser", ar: "لا توجد عمليات تسليم نشطة" },
  "Active deliveries will appear here in real time": { en: "Active deliveries will appear here in real time", sv: "Aktiva fraktleveranser kommer att visas här i realtid", ar: "ستظهر عمليات التسليم النشطة هنا في الوقت الفعلي" },
  "View on map": { en: "View on map", sv: "Se på karta", ar: "عرض على الخريطة" },
  "Call driver": { en: "Call driver", sv: "Ring förare", ar: "اتصل بالسائق" },
  "Map view": { en: "Map view", sv: "Kartvy", ar: "عرض الخريطة" },
  "Loading map data...": { en: "Loading map data...", sv: "Laddar kartdata...", ar: "جارٍ تحميل بيانات الخريطة..." },
  "Delivery not found": { en: "Delivery not found", sv: "Leverans hittades inte", ar: "لم يتم العثور على التسليم" },
  "This shipment could not be loaded": { en: "This shipment could not be loaded", sv: "Försändelsen kunde inte laddas", ar: "تعذّر تحميل هذه الشحنة" },
  "Track your delivery in real time": { en: "Track your delivery in real time", sv: "Spåra din leverans i realtid", ar: "تتبع تسليمك في الوقت الفعلي" },
  "Map integration": { en: "Map integration", sv: "Kartintegration", ar: "تكامل الخريطة" },
  "A real map component would appear here (e.g. Google Maps or Mapbox)": { en: "A real map component would appear here (e.g. Google Maps or Mapbox)", sv: "Här skulle en riktig kartkomponent visas (t.ex. Google Maps eller Mapbox)", ar: "ستظهر هنا مكونات خريطة حقيقية (مثل خرائط Google أو Mapbox)" },
  "Driver on the way": { en: "Driver on the way", sv: "Förare på väg", ar: "السائق في الطريق" },
  Speed: { en: "Speed", sv: "Hastighet", ar: "السرعة" },
  "Loading route...": { en: "Loading route...", sv: "Laddar rutt...", ar: "جارٍ تحميل المسار..." },
  "No active route": { en: "No active route", sv: "Ingen aktiv rutt", ar: "لا يوجد مسار نشط" },
  "In progress": { en: "In progress", sv: "Pågående", ar: "قيد التنفيذ" },
  Unknown: { en: "Unknown", sv: "Okänd", ar: "غير معروف" },
  "Select date": { en: "Select date", sv: "Välj datum", ar: "اختر التاريخ" },
  "Select time": { en: "Select time", sv: "Välj tid", ar: "اختر الوقت" },
  "Available departures": { en: "Available departures", sv: "Tillgängliga avgångar", ar: "المغادرات المتاحة" },
  "Sender information": { en: "Sender information", sv: "Avsändarinformation", ar: "بيانات المُرسل" },
  "Recipient information": { en: "Recipient information", sv: "Mottagarinformation", ar: "بيانات المستلم" },
  "Full name *": { en: "Full name *", sv: "Namn *", ar: "الاسم الكامل *" },
  "Your name": { en: "Your name", sv: "Ditt namn", ar: "اسمك" },
  "Phone number *": { en: "Phone number *", sv: "Telefonnummer *", ar: "رقم الهاتف *" },
  "Email (optional)": { en: "Email (optional)", sv: "E-post (valfritt)", ar: "البريد الإلكتروني (اختياري)" },
  "your@email.com": { en: "your@email.com", sv: "din@email.com", ar: "your@email.com" },
  "Recipient name *": { en: "Recipient name *", sv: "Mottagarens namn *", ar: "اسم المستلم *" },
  "Recipient name": { en: "Recipient name", sv: "Mottagarens namn", ar: "اسم المستلم" },
  "Recipient phone *": { en: "Recipient phone *", sv: "Mottagarens telefonnummer *", ar: "هاتف المستلم *" },
  "Weight (kg) *": { en: "Weight (kg) *", sv: "Vikt (kg) *", ar: "الوزن (كجم) *" },
  "Container size *": { en: "Container size *", sv: "Containerstorlek *", ar: "حجم الحاوية *" },
  "Price summary": { en: "Price summary", sv: "Prissammanfattning", ar: "ملخص السعر" },
  "Base price:": { en: "Base price:", sv: "Grundpris:", ar: "السعر الأساسي:" },
  "Use points:": { en: "Use points:", sv: "Använd poäng:", ar: "استخدام النقاط:" },
  "Total:": { en: "Total:", sv: "Att betala:", ar: "الإجمالي:" },
  "Payment method *": { en: "Payment method *", sv: "Betalningsmetod *", ar: "طريقة الدفع *" },
  "Combined (card + points)": { en: "Combined (card + points)", sv: "Kombinerat (kort + poäng)", ar: "مشترك (بطاقة + نقاط)" },
  "Card payment (prepaid)": { en: "Card payment (prepaid)", sv: "Kortbetalning (förbetald)", ar: "الدفع بالبطاقة (مسبق)" },
  "Points (prepaid)": { en: "Points (prepaid)", sv: "Poäng (förbetald)", ar: "النقاط (مسبق)" },
  "Cash on delivery": { en: "Cash on delivery", sv: "Kontant betalning (vid leverans)", ar: "الدفع نقداً عند التسليم" },
  "Cash on pickup": { en: "Cash on pickup", sv: "Kontant betalning (vid upphämtning)", ar: "الدفع نقداً عند الاستلام" },
  "Cash on moving day": { en: "Cash on moving day", sv: "Kontant betalning (vid flytt)", ar: "الدفع نقداً يوم النقل" },
  "Confirm booking": { en: "Confirm booking", sv: "Bekräfta bokning", ar: "تأكيد الحجز" },
  "Confirm moving booking": { en: "Confirm moving booking", sv: "Bekräfta flyttbokning", ar: "تأكيد حجز النقل" },
  "Confirm move & cleaning": { en: "Confirm move & cleaning", sv: "Bekräfta flytt & städning", ar: "تأكيد النقل والتنظيف" },
  "Secure payment • 24/7 support • Professional service": { en: "Secure payment • 24/7 support • Professional service", sv: "Säker betalning • 24/7 support • Professionella tjänster", ar: "دفع آمن • دعم على مدار الساعة • خدمة احترافية" },
  "Secure payment • 24/7 support • Professional drivers": { en: "Secure payment • 24/7 support • Professional drivers", sv: "Säker betalning • 24/7 support • Professionella förare", ar: "دفع آمن • دعم على مدار الساعة • سائقون محترفون" },
  "Secure payment • 24/7 support • Professional movers": { en: "Secure payment • 24/7 support • Professional movers", sv: "Säker betalning • 24/7 support • Professionella flyttare", ar: "دفع آمن • دعم على مدار الساعة • عمال نقل محترفون" },
  "Secure payment • 24/7 support • Professional movers & cleaners": { en: "Secure payment • 24/7 support • Professional movers & cleaners", sv: "Säker betalning • 24/7 support • Professionella flyttare & städare", ar: "دفع آمن • دعم على مدار الساعة • عمال نقل وتنظيف محترفون" },
  "Invalid date": { en: "Invalid date", sv: "Ogiltigt datum", ar: "تاريخ غير صالح" },
  "You cannot select a date in the past.": { en: "You cannot select a date in the past.", sv: "Du kan inte välja ett datum som redan har passerat.", ar: "لا يمكنك اختيار تاريخ مضى." },
  "Please fill in all required fields": { en: "Please fill in all required fields", sv: "Vänligen fyll i alla obligatoriska fält", ar: "يرجى ملء جميع الحقول المطلوبة" },
  "Please fill in all required fields.": { en: "Please fill in all required fields.", sv: "Vänligen fyll i alla obligatoriska fält.", ar: "يرجى ملء جميع الحقول المطلوبة." },
  "Booking confirmed": { en: "Booking confirmed", sv: "Bokning bekräftad", ar: "تم تأكيد الحجز" },
  "Could not create booking: ": { en: "Could not create booking: ", sv: "Kunde inte skapa bokning: ", ar: "تعذّر إنشاء الحجز: " },
  "Could not create order": { en: "Could not create order", sv: "Kunde inte skapa beställningen", ar: "تعذّر إنشاء الطلب" },
  "You must be signed in": { en: "You must be signed in", sv: "Du måste vara inloggad", ar: "يجب تسجيل الدخول" },
  "You must be signed in to book.": { en: "You must be signed in to book.", sv: "Du måste vara inloggad för att boka.", ar: "يجب تسجيل الدخول للحجز." },
  "Not enough points": { en: "Not enough points", sv: "Otillräckliga poäng", ar: "لا توجد نقاط كافية" },
  "Booking time must be in the future.": { en: "Booking time must be in the future.", sv: "Bokningstiden måste vara i framtiden.", ar: "يجب أن يكون وقت الحجز في المستقبل." },
  "Passengers * (1-4)": { en: "Passengers * (1-4)", sv: "Antal personer * (1-4)", ar: "الركاب * (1-4)" },
  "Passengers must be between 1 and 4.": { en: "Passengers must be between 1 and 4.", sv: "Antal personer måste vara mellan 1 och 4.", ar: "يجب أن يكون عدد الركاب بين 1 و 4." },
  "Booking name *": { en: "Booking name *", sv: "Namn av person som bokar *", ar: "اسم الحجز *" },
  "Details are filled automatically from your profile": { en: "Details are filled automatically from your profile", sv: "Informationen fylls automatiskt från din profil", ar: "تُملأ التفاصيل تلقائياً من ملفك الشخصي" },
  "Pickup location *": { en: "Pickup location *", sv: "Upphämtningsplats *", ar: "موقع الاستلام *" },
  "Round trip": { en: "Round trip", sv: "Tur och retur", ar: "ذهاب وعودة" },
  "Return date *": { en: "Return date *", sv: "Retur datum *", ar: "تاريخ العودة *" },
  "Return time *": { en: "Return time *", sv: "Retur tid *", ar: "وقت العودة *" },
  "Payment failed": { en: "Payment failed", sv: "Betalningsfel", ar: "فشل الدفع" },
  "Top up points": { en: "Top up points", sv: "Fyll på poäng", ar: "شحن النقاط" },
  "Return time must be after pickup time.": { en: "Return time must be after pickup time.", sv: "Retur-tiden måste vara efter upphämtningstiden.", ar: "يجب أن يكون وقت العودة بعد وقت الاستلام." },
  "Stripe is not available on web": { en: "Stripe is not available on web", sv: "Stripe är inte tillgängligt på web", ar: "Stripe غير متاح على الويب" },
  "Taxi booking confirmed! 🚕": { en: "Taxi booking confirmed! 🚕", sv: "Taxi-bokning bekräftad! 🚕", ar: "تم تأكيد حجز التاكسي! 🚕" },
  "Please select a return date and time for round trips.": { en: "Please select a return date and time for round trips.", sv: "Vänligen välj returdatum och tid för tur-och-retur resa.", ar: "يرجى اختيار تاريخ ووقت العودة لرحلات الذهاب والعودة." },
  "Invalid email address.": { en: "Invalid email address.", sv: "Ogiltig e-postadress.", ar: "بريد إلكتروني غير صالح." },
  "Number of people *": { en: "Number of people *", sv: "Antal personer *", ar: "عدد الأشخاص *" },
  "Number of items": { en: "Number of items", sv: "Antal föremål", ar: "عدد العناصر" },
  "Cancel payment": { en: "Cancel payment", sv: "Avbryt betalning", ar: "إلغاء الدفع" },
  "Contact details": { en: "Contact details", sv: "Kontaktuppgifter", ar: "بيانات التواصل" },
  "Elevator available?": { en: "Elevator available?", sv: "Hiss tillgänglig?", ar: "هل يوجد مصعد؟" },
  "Complete payment": { en: "Complete payment", sv: "Slutför betalning", ar: "إتمام الدفع" },
  "Creating order...": { en: "Creating order...", sv: "Skapar beställning...", ar: "جارٍ إنشاء الطلب..." },
  "Order created! 🎉": { en: "Order created! 🎉", sv: "Beställning skapad! 🎉", ar: "تم إنشاء الطلب! 🎉" },
  "Name is required.": { en: "Name is required.", sv: "Namn är obligatoriskt.", ar: "الاسم مطلوب." },
  "Phone number is required.": { en: "Phone number is required.", sv: "Telefonnummer är obligatoriskt.", ar: "رقم الهاتف مطلوب." },
  "Pickup location is required.": { en: "Pickup location is required.", sv: "Avhämtningsplats är obligatoriskt.", ar: "موقع الاستلام مطلوب." },
  "Destination is required.": { en: "Destination is required.", sv: "Destination är obligatoriskt.", ar: "الوجهة مطلوبة." },
  "Number of people must be at least 1.": { en: "Number of people must be at least 1.", sv: "Antal personer måste vara minst 1.", ar: "يجب أن يكون عدد الأشخاص 1 على الأقل." },
  "Number of items must be at least 1.": { en: "Number of items must be at least 1.", sv: "Antal föremål måste vara minst 1.", ar: "يجب أن يكون عدد العناصر 1 على الأقل." },
  "Please select at least one item type.": { en: "Please select at least one item type.", sv: "Du måste välja minst en typ av föremål.", ar: "يرجى اختيار نوع عنصر واحد على الأقل." },
  "Please select at least one cleaning area.": { en: "Please select at least one cleaning area.", sv: "Du måste välja minst ett städområde.", ar: "يرجى اختيار منطقة تنظيف واحدة على الأقل." },
  "Confirm payment": { en: "Confirm payment", sv: "Bekräfta betalning", ar: "تأكيد الدفع" },
  "Cleaning intensity *": { en: "Cleaning intensity *", sv: "Städintensitet *", ar: "كثافة التنظيف *" },
  "Cleaning supplies included?": { en: "Cleaning supplies included?", sv: "Städmaterial ingår?", ar: "هل مستلزمات التنظيف مشمولة؟" },
  "Cleaning areas *": { en: "Cleaning areas *", sv: "Städområden *", ar: "مناطق التنظيف *" },
  Kitchen: { en: "Kitchen", sv: "Kök", ar: "المطبخ" },
  "Entire apartment": { en: "Entire apartment", sv: "Hela lägenheten", ar: "الشقة بأكملها" },
  "Basic cleaning": { en: "Basic cleaning", sv: "Grundläggande städning", ar: "تنظيف أساسي" },
  "Deep cleaning": { en: "Deep cleaning", sv: "Djupstädning", ar: "تنظيف عميق" },
  "Move-out cleaning": { en: "Move-out cleaning", sv: "Flyttstädning", ar: "تنظيف عند الانتقال" },
  "Book taxi": { en: "Book taxi", sv: "Boka taxi", ar: "احجز تاكسي" },
  "Creating booking...": { en: "Creating booking...", sv: "Skapar bokning...", ar: "جارٍ إنشاء الحجز..." },
  "Secure card payment, charged instantly.": { en: "Secure card payment, charged instantly.", sv: "Betalning sker säkert via kort och debiteras direkt.", ar: "دفع آمن بالبطاقة، يُخصم فوراً." },
  "Payment succeeded but the order could not be created. Contact support.": { en: "Payment succeeded but the order could not be created. Contact support.", sv: "Betalningen lyckades men beställningen kunde inte skapas. Kontakta support.", ar: "نجح الدفع لكن تعذّر إنشاء الطلب. تواصل مع الدعم." },
  "Could not create booking. Please try again.": { en: "Could not create booking. Please try again.", sv: "Kunde inte skapa bokning. Försök igen.", ar: "تعذّر إنشاء الحجز. يرجى المحاولة مرة أخرى." },
  "Something went wrong. Please try again.": { en: "Something went wrong. Please try again.", sv: "Ett oväntat fel inträffade. Försök igen.", ar: "حدث خطأ ما. يرجى المحاولة مرة أخرى." },
  "Your taxi is booked! You will receive a confirmation soon.": { en: "Your taxi is booked! You will receive a confirmation soon.", sv: "Din taxi har blivit bokad! Du kommer att få en bekräftelse snart.", ar: "تم حجز التاكسي! ستصلك رسالة تأكيد قريباً." },
  "Booking failed": { en: "Booking failed", sv: "Bokningen misslyckades", ar: "فشلت عملية الحجز" },

  // ── Service screens (shipping, container, taxi, move, cleaning) ──────────
  Shipping: { en: "Shipping", sv: "Frakt", ar: "الشحن" },
  "Book between Sweden and Tunisia": { en: "Book between Sweden and Tunisia", sv: "Boka mellan Sverige och Tunisien", ar: "احجز بين السويد وتونس" },
  "Container shipping": { en: "Container shipping", sv: "Containerfrakt", ar: "الشحن بالحاويات" },
  "Plan a larger shipment between Sweden and Tunisia": { en: "Plan a larger shipment between Sweden and Tunisia", sv: "Planera en större sändning mellan Sverige och Tunisien", ar: "خطّط لشحنة أكبر بين السويد وتونس" },
  "Airport taxi": { en: "Airport taxi", sv: "Flygtaxi", ar: "تاكسي المطار" },
  "Reliable airport transfer": { en: "Reliable airport transfer", sv: "Pålitlig flygtransfer", ar: "نقل موثوق إلى المطار" },
  "Moving service": { en: "Moving service", sv: "Flyttservice", ar: "خدمة النقل" },
  "Moving & cleaning": { en: "Moving & cleaning", sv: "Flytt & städ", ar: "النقل والتنظيف" },
  "Moving and cleaning in one booking": { en: "Moving and cleaning in one booking", sv: "Flytt och städning i en bokning", ar: "النقل والتنظيف في حجز واحد" },
  Time: { en: "Time", sv: "Tid", ar: "الوقت" },
  "Select date *": { en: "Select date *", sv: "Välj datum *", ar: "اختر التاريخ *" },
  "Select time *": { en: "Select time *", sv: "Välj tid *", ar: "اختر الوقت *" },
  "Destination *": { en: "Destination *", sv: "Destination *", ar: "الوجهة *" },
  "Extra information": { en: "Extra information", sv: "Extra information", ar: "معلومات إضافية" },
  "Special requests or instructions": { en: "Special requests or instructions", sv: "Särskilda önskemål eller instruktioner", ar: "طلبات أو تعليمات خاصة" },
  "Special requests or instructions...": { en: "Special requests or instructions...", sv: "Särskilda önskemål eller instruktioner...", ar: "طلبات أو تعليمات خاصة..." },
  "Tell us about your move": { en: "Tell us about your move", sv: "Berätta om din flytt", ar: "أخبرنا عن نقل أثاثك" },
  "Secure payment": { en: "Secure payment", sv: "Säker betalning", ar: "دفع آمن" },
  "Secure payment via Stripe": { en: "Secure payment via Stripe", sv: "Säker betalning via Stripe", ar: "دفع آمن عبر Stripe" },
  "Payment could not be completed. Please try again.": { en: "Payment could not be completed. Please try again.", sv: "Betalningen kunde inte slutföras. Försök igen.", ar: "تعذّر إتمام الدفع. يرجى المحاولة مرة أخرى." },
  "Payment failed: ": { en: "Payment failed: ", sv: "Betalningen misslyckades: ", ar: "فشل الدفع: " },
  "Creating payment...": { en: "Creating payment...", sv: "Skapar betalning...", ar: "جارٍ إنشاء الدفع..." },
  "Payment initiated": { en: "Payment initiated", sv: "Betalning initierad", ar: "تم بدء الدفع" },
  "The payment page opens in your browser. Come back after paying.": { en: "The payment page opens in your browser. Come back after paying.", sv: "Betalningssidan öppnas i din webbläsare. Kom tillbaka efter betalning.", ar: "تُفتح صفحة الدفع في المتصفح. عُد بعد إتمام الدفع." },
  "Payment completed! 🎉": { en: "Payment completed! 🎉", sv: "Betalning genomförd! 🎉", ar: "تم الدفع بنجاح! 🎉" },
  "Payment was cancelled.": { en: "Payment was cancelled.", sv: "Betalningen avbröts.", ar: "تم إلغاء الدفع." },
  Failed: { en: "Failed", sv: "Fel", ar: "خطأ" },
  "Could not create payment session: ": { en: "Could not create payment session: ", sv: "Kunde inte skapa betalningssession: ", ar: "تعذّر إنشاء جلسة الدفع: " },
  "Your payment of": { en: "Your payment of", sv: "Din betalning på", ar: "دفعتك بمبلغ" },
  "is confirmed!": { en: "is confirmed!", sv: "är bekräftad!", ar: "تم تأكيدها!" },
  "You earned": { en: "You earned", sv: "Du fick", ar: "لقد حصلت على" },
  points: { en: "points", sv: "poäng", ar: "نقطة" },

  // ── Shipping categories ─────────────────────────────────────────────────
  Category: { en: "Category", sv: "Kategori", ar: "الفئة" },
  "Select category": { en: "Select category", sv: "Välj kategori", ar: "اختر الفئة" },
  "Mobile phones": { en: "Mobile phones", sv: "Mobiltelefoner", ar: "الهواتف المحمولة" },
  Electronics: { en: "Electronics", sv: "Elektronik", ar: "الإلكترونيات" },
  Clothing: { en: "Clothing", sv: "Kläder", ar: "الملابس" },
  "Food & dry goods": { en: "Food & dry goods", sv: "Mat & Torrvaror", ar: "الطعام والمواد الجافة" },
  "Household items": { en: "Household items", sv: "Hushållsartiklar", ar: "الأدوات المنزلية" },
  "Books & documents": { en: "Books & documents", sv: "Böcker & Dokument", ar: "الكتب والمستندات" },
  "Accessories & jewellery": { en: "Accessories & jewellery", sv: "Accessoarer & Smycken", ar: "الإكسسوارات والمجوهرات" },
  "Beauty & health": { en: "Beauty & health", sv: "Skönhet & Hälsa", ar: "الجمال والصحة" },
  "Baby items": { en: "Baby items", sv: "Barnartiklar", ar: "مستلزمات الأطفال" },
  "Car & spare parts": { en: "Car & spare parts", sv: "Bil & Reservdelar", ar: "السيارات وقطع الغيار" },
  "Furniture (small)": { en: "Furniture (small)", sv: "Möbler (små)", ar: "الأثاث (صغير)" },
  Other: { en: "Other", sv: "Annat", ar: "أخرى" },

  // ── Input placeholders ──────────────────────────────────────────────────
  "E.g. 10": { en: "E.g. 10", sv: "T.ex. 10", ar: "مثال: 10" },
  "E.g. Stockholm": { en: "E.g. Stockholm", sv: "T.ex. Stockholm", ar: "مثال: ستوكهولم" },
  "E.g. Uppsala": { en: "E.g. Uppsala", sv: "T.ex. Uppsala", ar: "مثال: أوبسالا" },
  "E.g. John Doe": { en: "E.g. John Doe", sv: "T.ex. John Doe", ar: "مثال: John Doe" },
  "E.g. Arlanda, Stockholm": { en: "E.g. Arlanda, Stockholm", sv: "T.ex. Arlanda, Stockholm", ar: "مثال: Arlanda، ستوكهولم" },
  "E.g. Bromma, Stockholm": { en: "E.g. Bromma, Stockholm", sv: "T.ex. Bromma, Stockholm", ar: "مثال: Bromma، ستوكهولم" },
  "E.g. john@example.com": { en: "E.g. john@example.com", sv: "T.ex. john@example.com", ar: "مثال: john@example.com" },
  "E.g. +46 70 123 45 67": { en: "E.g. +46 70 123 45 67", sv: "T.ex. +46 70 123 45 67", ar: "مثال: +46 70 123 45 67" },
  "E.g. child seat needed, lots of luggage, etc.": { en: "E.g. child seat needed, lots of luggage, etc.", sv: "T.ex. bilbarnstol behövs, mycket bagage, m.m.", ar: "مثال: كرسي أطفال، أمتعة كثيرة، إلخ." },
  "Unknown Route": { en: "Unknown Route", sv: "Okänd rutt", ar: "مسار غير معروف" },
  "Cash payment": { en: "Cash payment", sv: "Betalning kontant", ar: "الدفع نقداً" },
  Prepaid: { en: "Prepaid", sv: "Förbetald", ar: "مدفوع مسبقاً" },
  Taxi: { en: "Taxi", sv: "Taxi", ar: "تاكسي" },
  Pay: { en: "Pay", sv: "Betala", ar: "ادفع" },
  for: { en: "for", sv: "för", ar: "مقابل" },

  // ── Services hub ────────────────���─────────────────────────────
  "Cleaning & Moving": { en: "Cleaning & Moving", sv: "Städning & Flytt", ar: "التنظيف والنقل" },
  Moving: { en: "Moving", sv: "Flytt", ar: "النقل" },
  Furniture: { en: "Furniture", sv: "Möbler", ar: "الأثاث" },
  Boxes: { en: "Boxes", sv: "Lådor", ar: "صناديق" },
  Fragile: { en: "Fragile", sv: "Ömtåligt", ar: "قابل للكسر" },
  "Heavy items": { en: "Heavy items", sv: "Tunga föremål", ar: "عناصر ثقيلة" },
  Appliances: { en: "Appliances", sv: "Vitvaror", ar: "الأجهزة المنزلية" },
  "Item type": { en: "Item type", sv: "Typ av föremål", ar: "نوع العناصر" },
  "Shipping Sweden & Tunisia": { en: "Shipping Sweden & Tunisia", sv: "Frakt Sverige & Tunisien", ar: "الشحن بين السويد وتونس" },
  "Fast and secure shipping of packages between Sweden and Tunisia.": { en: "Fast and secure shipping of packages between Sweden and Tunisia.", sv: "Snabb och säker frakt av paket mellan Sverige och Tunisien.", ar: "شحن سريع وآمن للطرود بين السويد وتونس." },
  "Book large containers for shipping between Sweden and Tunisia.": { en: "Book large containers for shipping between Sweden and Tunisia.", sv: "Boka stora containrar för frakt mellan Sverige och Tunisien.", ar: "احجز حاويات كبيرة للشحن بين السويد وتونس." },
  "Moving & cleaning help": { en: "Moving & cleaning help", sv: "Hjälp med flytt & städ", ar: "مساعدة في النقل والتنظيف" },
  "Book professional moving and cleaning together.": { en: "Book professional moving and cleaning together.", sv: "Boka professionell flytt och städning tillsammans.", ar: "احجز نقلًا وتنظيفًا احترافيًا معاً." },
  "Moving without cleaning": { en: "Moving without cleaning", sv: "Flytt utan städning", ar: "نقل بدون تنظيف" },
  "Simple moving help for furniture and belongings.": { en: "Simple moving help for furniture and belongings.", sv: "Enkel flytthjälp för möbler och tillhörigheter.", ar: "مساعدة بسيطة في نقل الأثاث والمتعلقات." },
  "Taxi to the airport": { en: "Taxi to the airport", sv: "Taxi till flygplats", ar: "تاكسي إلى المطار" },
  "Book transport to and from airports.": { en: "Book transport to and from airports.", sv: "Boka transport till och från flygplatser.", ar: "احجز نقلًا إلى المطارات ومنها." },
  "Everything we offer, in one place": { en: "Everything we offer, in one place", sv: "Allt vi erbjuder, på ett ställe", ar: "كل ما نقدمه في مكان واحد" },
  Tools: { en: "Tools", sv: "Verktyg", ar: "أدوات" },
  Map: { en: "Map", sv: "Karta", ar: "الخريطة" },

  // ── Map ─────────────────────────────────────────────────────────────────
  Distance: { en: "Distance", sv: "Avstånd", ar: "المسافة" },
  Duration: { en: "Duration", sv: "Restid", ar: "المدة" },
  Collection: { en: "Collection", sv: "Upphämtning", ar: "الاستلام" },
  Delivery: { en: "Delivery", sv: "Leverans", ar: "التسليم" },
  "Upcoming departures": { en: "Upcoming departures", sv: "Kommande avgångar", ar: "المغادرات القادمة" },
  "Loading departures...": { en: "Loading departures...", sv: "Laddar avgångar...", ar: "جارٍ تحميل المغادرات..." },
  "No upcoming departures to map.": { en: "No upcoming departures to map.", sv: "Inga kommande avgångar att visa på kartan.", ar: "لا توجد مغادرات قادمة لعرضها على الخريطة." },
  "This delivery's route could not be located on the map.": { en: "This delivery's route could not be located on the map.", sv: "Den här leveransens rutt kunde inte hittas på kartan.", ar: "تعذّر تحديد مسار هذا التسليم على الخريطة." },
  "Driver to be assigned": { en: "Driver to be assigned", sv: "Förare tilldelas senare", ar: "سيتم تعيين سائق" },
  "No phone yet": { en: "No phone yet", sv: "Inget telefonnummer än", ar: "لا يوجد رقم هاتف بعد" },
  "This notification will be removed from your inbox.": { en: "This notification will be removed from your inbox.", sv: "Den här notisen tas bort från din inkorg.", ar: "سيتم حذف هذا الإشعار من صندوق الوارد." },
  "Clear all notifications": { en: "Clear all notifications", sv: "Rensa alla notiser", ar: "مسح كل الإشعارات" },
  "Clear all": { en: "Clear all", sv: "Rensa alla", ar: "مسح الكل" },
  "Every notification will be removed from your inbox.": { en: "Every notification will be removed from your inbox.", sv: "Alla notiser tas bort från din inkorg.", ar: "ستتم إزالة كل الإشعارات من صندوق الوارد." },
  "YOUR JOURNEY": { en: "YOUR JOURNEY", sv: "DIN RESA", ar: "رحلتك" },
  "Route overview": { en: "Route overview", sv: "Ruttöversikt", ar: "نظرة عامة على المسار" },
  DEPARTURE: { en: "DEPARTURE", sv: "AVGÅNG", ar: "المغادرة" },
  "Individual parcel records are available in My Shipments. This screen shows the published capacity for this trip.": {
    en: "Individual parcel records are available in My Shipments. This screen shows the published capacity for this trip.",
    sv: "Enskilda paketposter finns i Mina sändningar. Här visas den publicerade kapaciteten för den här avgången.",
    ar: "سجلات الطرود الفردية متاحة في شحناتي. تعرض هذه الشاشة السعة المنشورة لهذه الرحلة.",
  },
  "Wallet & points": { en: "Wallet & points", sv: "Plånbok & poäng", ar: "المحفظة والنقاط" },
  "Live status": { en: "Live status", sv: "Live-status", ar: "الحالة المباشرة" },
  service: { en: "service", sv: "tjänst", ar: "خدمة" },
  services: { en: "services", sv: "tjänster", ar: "خدمات" },
  OK: { en: "OK", sv: "OK", ar: "حسناً" },
  "Parcel Delivery": { en: "Parcel Delivery", sv: "Paketleverans", ar: "تسليم الطرد" },
  "In Tunisia:": { en: "In Tunisia:", sv: "I Tunisien:", ar: "في تونس:" },
  "Select your governorate": { en: "Select your governorate", sv: "Välj ditt guvernement", ar: "اختر مدينتك" },
  "Not served on this departure": { en: "Not served on this departure", sv: "Tjänas inte på denna avgång", ar: "غير مخدوم في هذه المغادرة" },
  "View Details": { en: "View Details", sv: "Visa detaljer", ar: "عرض التفاصيل" },
  "Hide details": { en: "Hide details", sv: "Dölj detaljer", ar: "إخفاء التفاصيل" },
  "Collection points": { en: "Collection points", sv: "Upphämtningspunkter", ar: "نقاط الاستلام" },
  "Delivery points": { en: "Delivery points", sv: "Leveranspunkter", ar: "نقاط التسليم" },
  "Detailed addresses for {governorate} have not been published yet.": {
    en: "Detailed addresses for {governorate} have not been published yet.",
    sv: "Detaljerade adresser för {governorate} har inte publicerats än.",
    ar: "لم يتم نشر العناوين التفصيلية لـ {governorate} بعد.",
  },
  "Collection in Sweden": { en: "Collection in Sweden", sv: "Upphämtning i Sverige", ar: "الاستلام في السويد" },
  "Postal service": { en: "Postal service", sv: "Posttjänst", ar: "الخدمة البريدية" },
  "Personal handover": { en: "Personal handover", sv: "Personlig överlämning", ar: "التسليم الشخصي" },
  "Notes": { en: "Notes", sv: "Anteckningar", ar: "ملاحظات" },
  "Trip information": { en: "Trip information", sv: "Resinformation", ar: "معلومات الرحلة" },
  "Track a shipment": { en: "Track a shipment", sv: "Spåra en försändelse", ar: "تتبع شحنة" },
  "You have {have} points but need {need} points for this payment. Would you like to top up?": {
    en: "You have {have} points but need {need} points for this payment. Would you like to top up?",
    sv: "Du har {have} poäng men behöver {need} poäng för den här betalningen. Vill du fylla på?",
    ar: "لديك {have} نقطة وتحتاج {need} نقطة لهذه الدفعة. هل تريد الشحن؟",
  },
};

/**
 * Admin panel copy.
 *
 * Kept apart from `CORE_COPY` so the admin surface can be reviewed on its own.
 * Those screens mix English and Swedish source strings, so both directions are
 * present: an English label resolves to Swedish/Arabic and a Swedish one back
 * to English/Arabic. Anything missing here still goes through the batched
 * network path, so nothing is ever left untranslated at runtime.
 */
const ADMIN_COPY: Record<string, Partial<Record<"en" | "sv" | "ar", string>>> = {
  // Notification center
  "Notification center": { en: "Notification center", sv: "Notifikationscenter", ar: "مركز الإشعارات" },
  "Send and review notifications": { en: "Send and review notifications", sv: "Skicka och granska notifikationer", ar: "أرسل الإشعارات وراجعها" },
  Send: { en: "Send", sv: "Skicka", ar: "إرسال" },
  Sent: { en: "Sent", sv: "Skickade", ar: "المُرسَلة" },
  "Send a notification": { en: "Send a notification", sv: "Skicka en notifikation", ar: "أرسل إشعارًا" },
  "Share an update with customers": { en: "Share an update with customers", sv: "Dela en uppdatering med kunderna", ar: "شارك تحديثًا مع العملاء" },
  "Notification type": { en: "Notification type", sv: "Typ av notifikation", ar: "نوع الإشعار" },
  Title: { en: "Title", sv: "Titel", ar: "العنوان" },
  "Enter a title": { en: "Enter a title", sv: "Ange rubrik", ar: "أدخل عنوانًا" },
  Message: { en: "Message", sv: "Meddelande", ar: "الرسالة" },
  "Write your message…": { en: "Write your message…", sv: "Skriv ditt meddelande…", ar: "اكتب رسالتك…" },
  "Media (optional)": { en: "Media (optional)", sv: "Media (frivilligt)", ar: "الوسائط (اختياري)" },
  Image: { en: "Image", sv: "Bild", ar: "صورة" },
  Video: { en: "Video", sv: "Video", ar: "فيديو" },
  "Send notification": { en: "Send notification", sv: "Skicka notifikation", ar: "إرسال الإشعار" },
  "Test on this device": { en: "Test on this device", sv: "Testa på den här enheten", ar: "اختبار على هذا الجهاز" },
  "No notifications sent yet": { en: "No notifications sent yet", sv: "Inga notifikationer skickade ännu", ar: "لم يتم إرسال أي إشعار بعد" },
  "Sent notifications and delivery results appear here.": { en: "Sent notifications and delivery results appear here.", sv: "Skickade notifikationer och leveransresultat visas här.", ar: "تظهر الإشعارات المرسلة ونتائج التسليم هنا." },
  Delivered: { en: "Delivered", sv: "Levererad", ar: "تم التسليم" },
  Failed: { en: "Failed", sv: "Misslyckad", ar: "فشل" },
  "Saved only": { en: "Saved only", sv: "Endast sparad", ar: "محفوظ فقط" },
  Sending: { en: "Sending", sv: "Skickar", ar: "جارٍ الإرسال" },
  "Delivery result": { en: "Delivery result", sv: "Leveransresultat", ar: "نتيجة التسليم" },
  "Delete notification": { en: "Delete notification", sv: "Radera notifikation", ar: "حذف الإشعار" },
  "Show delete action": { en: "Show delete action", sv: "Visa raderingsknapp", ar: "إظهار زر الحذف" },
  "Delete this notification? It disappears from the history for every admin, and customers no longer receive it on their next sync.": { en: "Delete this notification? It disappears from the history for every admin, and customers no longer receive it on their next sync.", sv: "Radera den här notifikationen? Den försvinner från historiken för alla admins och kunderna får den inte vid nästa synkronisering.", ar: "هل تريد حذف هذا الإشعار؟ سيختفي من السجل لكل المسؤولين ولن يستلمه العملاء عند المزامنة التالية." },
  Deleted: { en: "Deleted", sv: "Raderad", ar: "تم الحذف" },
  "The notification was deleted.": { en: "The notification was deleted.", sv: "Notifikationen har raderats.", ar: "تم حذف الإشعار." },
  "The notification could not be deleted. Please try again.": { en: "The notification could not be deleted. Please try again.", sv: "Det gick inte att radera notifikationen. Försök igen.", ar: "تعذّر حذف الإشعار. يرجى المحاولة مرة أخرى." },
  Warning: { en: "Warning", sv: "Varning", ar: "تحذير" },
  Error: { en: "Error", sv: "Fel", ar: "خطأ" },
  "Enter both a title and a message.": { en: "Enter both a title and a message.", sv: "Ange både titel och meddelande.", ar: "أدخل العنوان والرسالة معًا." },
  "Uploading…": { en: "Uploading…", sv: "Laddar upp…", ar: "جارٍ التحميل…" },
  "Please wait": { en: "Please wait", sv: "Vänligen vänta", ar: "يرجى الانتظار" },
  Uploaded: { en: "Uploaded", sv: "Uppladdat", ar: "تم التحميل" },
  "The file has been uploaded.": { en: "The file has been uploaded.", sv: "Filen har laddats upp.", ar: "تم تحميل الملف." },
  "The file could not be uploaded.": { en: "The file could not be uploaded.", sv: "Det gick inte att ladda upp filen.", ar: "تعذّر تحميل الملف." },
  "The photo library could not be opened.": { en: "The photo library could not be opened.", sv: "Kunde inte öppna bildbiblioteket.", ar: "تعذّر فتح مكتبة الصور." },
  "The notification could not be saved.": { en: "The notification could not be saved.", sv: "Det gick inte att spara notifikationen.", ar: "تعذّر حفظ الإشعار." },
  Saved: { en: "Saved", sv: "Sparat", ar: "تم الحفظ" },
  "The notification was saved to the history. No devices with a push token were found.": { en: "The notification was saved to the history. No devices with a push token were found.", sv: "Notifikationen sparades i historiken. Inga enheter med push-token hittades.", ar: "تم حفظ الإشعار في السجل. لم يتم العثور على أجهزة لديها رمز إشعارات." },
  "Push failed": { en: "Push failed", sv: "Push misslyckades", ar: "فشل الإرسال" },
  "No device received the notification. It remains in the history.": { en: "No device received the notification. It remains in the history.", sv: "Ingen enhet tog emot notifikationen. Den finns kvar i historiken.", ar: "لم يستلم أي جهاز الإشعار. لا يزال محفوظًا في السجل." },
  "Test notification sent": { en: "Test notification sent", sv: "Testnotis skickad", ar: "تم إرسال إشعار تجريبي" },
  "The notification appeared on this device.": { en: "The notification appeared on this device.", sv: "Notisen visades på den här enheten.", ar: "ظهر الإشعار على هذا الجهاز." },
  "Permission missing": { en: "Permission missing", sv: "Behörighet saknas", ar: "الإذن مفقود" },
  "Allow notifications for the app in device settings and try again.": { en: "Allow notifications for the app in device settings and try again.", sv: "Tillåt notiser för appen i enhetens inställningar och försök igen.", ar: "اسمح بالإشعارات للتطبيق من إعدادات الجهاز ثم حاول مرة أخرى." },
  "Could not show the notification": { en: "Could not show the notification", sv: "Kunde inte visa notis", ar: "تعذّر عرض الإشعار" },
  "The notification module is not available on this device.": { en: "The notification module is not available on this device.", sv: "Notifikationsmodulen är inte tillgänglig på den här enheten.", ar: "وحدة الإشعارات غير متاحة على هذا الجهاز." },
  "Test notification": { en: "Test notification", sv: "Testnotis", ar: "إشعار تجريبي" },
  "Test of notifications from Tunisiska Mega.": { en: "Test of notifications from Tunisiska Mega.", sv: "Test av notifikationer från Tunisiska Mega.", ar: "اختبار الإشعارات من Tunisiska Mega." },

  // Collections and shared admin labels
  "Add record": { en: "Add record", sv: "Lägg till post", ar: "إضافة سجل" },
  Name: { en: "Name", sv: "Namn", ar: "الاسم" },
  Email: { en: "Email", sv: "E-post", ar: "البريد الإلكتروني" },
  Created: { en: "Created", sv: "Skapad", ar: "تم الإنشاء" },
  Customer: { en: "Customer", sv: "Kund", ar: "العميل" },
  Price: { en: "Price", sv: "Pris", ar: "السعر" },
  Status: { en: "Status", sv: "Status", ar: "الحالة" },
  Date: { en: "Date", sv: "Datum", ar: "التاريخ" },
  Driver: { en: "Driver", sv: "Förare", ar: "السائق" },
  Admin: { en: "Admin", sv: "Admin", ar: "مدير" },
  Users: { en: "Users", sv: "Användare", ar: "المستخدمون" },
  "Shipping orders": { en: "Shipping orders", sv: "Fraktorder", ar: "طلبات الشحن" },
  "Taxi bookings": { en: "Taxi bookings", sv: "Taxibokningar", ar: "حجوزات التاكسي" },
  "Review and manage deliveries": { en: "Review and manage deliveries", sv: "Granska och hantera leveranser", ar: "راجع التسليمات وأدرها" },
  "Review and manage taxi journeys": { en: "Review and manage taxi journeys", sv: "Granska och hantera taxiresor", ar: "راجع رحلات التاكسي وأدرها" },
  "Publish updates and offers": { en: "Publish updates and offers", sv: "Publicera uppdateringar och erbjudanden", ar: "انشر التحديثات والعروض" },
  "Manage registered accounts and access": { en: "Manage registered accounts and access", sv: "Hantera registrerade konton och åtkomst", ar: "إدارة الحسابات المسجلة والوصول" },
  "Manage content": { en: "Manage content", sv: "Hantera innehåll", ar: "إدارة المحتوى" },
  "Choose a collection to continue": { en: "Choose a collection to continue", sv: "Välj en samling för att fortsätta", ar: "اختر مجموعة للمتابعة" },
  "This collection is unavailable.": { en: "This collection is unavailable.", sv: "Den här samlingen är inte tillgänglig.", ar: "هذه المجموعة غير متاحة." },
  "Return to Operations and choose one of the listed collections.": { en: "Return to Operations and choose one of the listed collections.", sv: "Gå tillbaka till Drift och välj en av de listade samlingarna.", ar: "ارجع إلى العمليات واختر إحدى المجموعات المدرجة." },
  "Delete record": { en: "Delete record", sv: "Radera post", ar: "حذف السجل" },
  "Delete this record from the content collection?": { en: "Delete this record from the content collection?", sv: "Radera den här posten från innehållssamlingen?", ar: "هل تريد حذف هذا السجل من مجموعة المحتوى؟" },
  "Could not delete": { en: "Could not delete", sv: "Kunde inte radera", ar: "تعذّر الحذف" },
  "Please try again.": { en: "Please try again.", sv: "Försök igen.", ar: "يرجى المحاولة مرة أخرى." },
  Delete: { en: "Delete", sv: "Radera", ar: "حذف" },

  // Swedish source labels used by the admin collection screen
  "Användare": { en: "Users", sv: "Användare", ar: "المستخدمون" },
  "Hantera alla registrerade brukare": { en: "Manage all registered users", sv: "Hantera alla registrerade brukare", ar: "إدارة جميع المستخدمين المسجلين" },
  "Sändningar": { en: "Shipments", sv: "Sändningar", ar: "الشحنات" },
  "Hantera logistik och frakt": { en: "Manage logistics and shipping", sv: "Hantera logistik och frakt", ar: "إدارة الخدمات اللوجستية والشحن" },
  "Container Bokningar": { en: "Container bookings", sv: "Containerbokningar", ar: "حجوزات الحاويات" },
  "Större fraktuppdrag": { en: "Larger freight jobs", sv: "Större fraktuppdrag", ar: "عمليات شحن أكبر" },
  "Taxibokningar": { en: "Taxi bookings", sv: "Taxibokningar", ar: "حجوزات التاكسي" },
  "Övervaka och hantera taxiresor": { en: "Monitor and manage taxi journeys", sv: "Övervaka och hantera taxiresor", ar: "راقب رحلات التاكسي وأدرها" },
  "Flyttordrar": { en: "Moving orders", sv: "Flyttordrar", ar: "طلبات النقل" },
  "Hantera flyttbeställningar": { en: "Manage moving orders", sv: "Hantera flyttbeställningar", ar: "إدارة طلبات النقل" },
  "Annonser": { en: "Announcements", sv: "Annonser", ar: "الإعلانات" },
  "Dela nyheter och erbjudanden": { en: "Share news and offers", sv: "Dela nyheter och erbjudanden", ar: "شارك الأخبار والعروض" },
  "Vänförfrågningar": { en: "Friend requests", sv: "Vänförfrågningar", ar: "طلبات الصداقة" },
  "Hantera nätverk & Poäng": { en: "Manage network & points", sv: "Hantera nätverk och poäng", ar: "إدارة الشبكة والنقاط" },
  "Sändningsschema": { en: "Shipping schedule", sv: "Sändningsschema", ar: "جدول الشحن" },
  "Planera rutter och avgångar": { en: "Plan routes and departures", sv: "Planera rutter och avgångar", ar: "خطط المسارات والمواعيد" },
  "Container Schema": { en: "Container schedule", sv: "Containerschema", ar: "جدول الحاويات" },
  "Båtrutter och tider": { en: "Ship routes and times", sv: "Båtrutter och tider", ar: "مسارات وأوقات السفن" },
  "Flytt & Städ": { en: "Moving & cleaning", sv: "Flytt och städ", ar: "النقل والتنظيف" },
  "Kombinerade uppdrag": { en: "Combined jobs", sv: "Kombinerade uppdrag", ar: "مهام مشتركة" },
  "Live Status": { en: "Live status", sv: "Live-status", ar: "الحالة المباشرة" },
  "Systemets hälsa": { en: "System health", sv: "Systemets hälsa", ar: "صحة النظام" },
  "Applikationens fot": { en: "Application footer", sv: "Applikationens sidfot", ar: "تذييل التطبيق" },
  "Användarvillkor": { en: "Terms of service", sv: "Användarvillkor", ar: "شروط الاستخدام" },
  "Legal text": { en: "Legal text", sv: "Juridisk text", ar: "نص قانوني" },
  "Integritetspolicy": { en: "Privacy policy", sv: "Integritetspolicy", ar: "سياسة الخصوصية" },
  "GDPR Information": { en: "GDPR information", sv: "GDPR-information", ar: "معلومات GDPR" },
  "Notifikationer": { en: "Notifications", sv: "Notifikationer", ar: "الإشعارات" },
  "Notifikationshistorik": { en: "Notification history", sv: "Notifikationshistorik", ar: "سجل الإشعارات" },
  "Skapad": { en: "Created", sv: "Skapad", ar: "تم الإنشاء" },
  "Pris": { en: "Price", sv: "Pris", ar: "السعر" },
  "Datum": { en: "Date", sv: "Datum", ar: "التاريخ" },
  "Titel": { en: "Title", sv: "Titel", ar: "العنوان" },
  "Meddelande": { en: "Message", sv: "Meddelande", ar: "الرسالة" },
  "Från": { en: "From", sv: "Från", ar: "من" },
  "Rutt": { en: "Route", sv: "Rutt", ar: "المسار" },
  "Avgång": { en: "Departure", sv: "Avgång", ar: "المغادرة" },
  "Aktiv": { en: "Active", sv: "Aktiv", ar: "نشط" },
  "Uppdaterad": { en: "Updated", sv: "Uppdaterad", ar: "آخر تحديث" },

  // Record editor
  "Create record": { en: "Create record", sv: "Skapa post", ar: "إنشاء سجل" },
  "Edit record": { en: "Edit record", sv: "Redigera post", ar: "تعديل السجل" },
  "Add operational information": { en: "Add operational information", sv: "Lägg till driftinformation", ar: "أضف معلومات التشغيل" },
  "Update operational information": { en: "Update operational information", sv: "Uppdatera driftinformation", ar: "حدّث معلومات التشغيل" },
  "No fields defined for this type": { en: "No fields defined for this type", sv: "Inga fält definierade för denna typ", ar: "لا توجد حقول محددة لهذا النوع" },
  "Inga fält för denna typ": { en: "No fields for this type", sv: "Inga fält för denna typ", ar: "لا توجد حقول لهذا النوع" },
  Klar: { en: "Done", sv: "Klar", ar: "تم" },
  Create: { en: "Create", sv: "Skapa", ar: "إنشاء" },
  "Created successfully": { en: "Created successfully", sv: "Skapades", ar: "تم الإنشاء بنجاح" },
  "Updated successfully": { en: "Updated successfully", sv: "Uppdaterades", ar: "تم التحديث بنجاح" },
  "Failed to save": { en: "Failed to save", sv: "Kunde inte spara", ar: "تعذّر الحفظ" },
  Success: { en: "Success", sv: "Klart", ar: "نجح" },
  Type: { en: "Type", sv: "Typ", ar: "النوع" },
  Content: { en: "Content", sv: "Innehåll", ar: "المحتوى" },
  Footer: { en: "Footer", sv: "Sidfot", ar: "التذييل" },
  Notes: { en: "Notes", sv: "Anteckningar", ar: "ملاحظات" },
  Vehicle: { en: "Vehicle", sv: "Fordon", ar: "المركبة" },
  Points: { en: "Points", sv: "Poäng", ar: "النقاط" },
  "Clerk ID": { en: "Clerk ID", sv: "Clerk-ID", ar: "معرّف Clerk" },
  "User ID": { en: "User ID", sv: "Användar-ID", ar: "معرّف المستخدم" },
  "To User ID": { en: "To user ID", sv: "Till användar-ID", ar: "معرّف المستخدم المستقبل" },
  "From User ID": { en: "From user ID", sv: "Från användar-ID", ar: "معرّف المستخدم المُرسل" },
  "From User Name": { en: "From user name", sv: "Från användarnamn", ar: "اسم المستخدم المُرسل" },
  "From User Image URL": { en: "From user image URL", sv: "Från användarens bild-URL", ar: "رابط صورة المستخدم المُرسل" },
  "From User Points": { en: "From user points", sv: "Från användarens poäng", ar: "نقاط المستخدم المُرسل" },
  "NativeNotify ID": { en: "NativeNotify ID", sv: "NativeNotify-ID", ar: "معرّف NativeNotify" },
  "Is Admin": { en: "Is admin", sv: "Är admin", ar: "مدير" },
  "Is Driver": { en: "Is driver", sv: "Är förare", ar: "سائق" },
  "Is Active?": { en: "Is active?", sv: "Aktiv?", ar: "نشط؟" },
  "Customer Information": { en: "Customer information", sv: "Kundinformation", ar: "بيانات العميل" },
  "Pickup Address": { en: "Pickup address", sv: "Upphämtningsadress", ar: "عنوان الاستلام" },
  "Delivery Address": { en: "Delivery address", sv: "Leveransadress", ar: "عنوان التسليم" },
  "Destination Address": { en: "Destination address", sv: "Destinationsadress", ar: "عنوان الوجهة" },
  Route: { en: "Route", sv: "Rutt", ar: "المسار" },
  "Active Route": { en: "Active route", sv: "Aktiv rutt", ar: "المسار النشط" },
  "Scheduled Date & Time": { en: "Scheduled date & time", sv: "Schemalagt datum och tid", ar: "التاريخ والوقت المجدول" },
  "Return Date & Time": { en: "Return date & time", sv: "Returdatum och tid", ar: "تاريخ ووقت العودة" },
  "Departure Time": { en: "Departure time", sv: "Avgångstid", ar: "وقت المغادرة" },
  "Created At": { en: "Created at", sv: "Skapad", ar: "تاريخ الإنشاء" },
  "Updated At": { en: "Updated at", sv: "Uppdaterad", ar: "آخر تحديث" },
  "Date Sent": { en: "Date sent", sv: "Skickad", ar: "تاريخ الإرسال" },
  "Last Updated": { en: "Last updated", sv: "Senast uppdaterad", ar: "آخر تحديث" },
  "Package Details": { en: "Package details", sv: "Paketdetaljer", ar: "تفاصيل الطرد" },
  "Container Details": { en: "Container details", sv: "Containerdetaljer", ar: "تفاصيل الحاوية" },
  "Shipping Speed": { en: "Shipping speed", sv: "Leveranshastighet", ar: "سرعة الشحن" },
  "Requires Signature": { en: "Requires signature", sv: "Kräver signatur", ar: "يتطلب توقيعًا" },
  "Insurance Value (SEK)": { en: "Insurance value (SEK)", sv: "Försäkringsvärde (SEK)", ar: "قيمة التأمين (كرونة)" },
  "Tracking Number": { en: "Tracking number", sv: "Spårningsnummer", ar: "رقم التتبع" },
  "Total Price (SEK)": { en: "Total price (SEK)", sv: "Totalt pris (SEK)", ar: "السعر الإجمالي (كرونة)" },
  "Points Used": { en: "Points used", sv: "Använda poäng", ar: "النقاط المستخدمة" },
  "Points to Transfer": { en: "Points to transfer", sv: "Poäng att överföra", ar: "النقاط المراد تحويلها" },
  "Payment Method": { en: "Payment method", sv: "Betalningsmetod", ar: "طريقة الدفع" },
  "Special Notes/Instructions": { en: "Special notes/instructions", sv: "Särskilda anteckningar/instruktioner", ar: "ملاحظات/تعليمات خاصة" },
  "Special Requirements": { en: "Special requirements", sv: "Särskilda krav", ar: "متطلبات خاصة" },
  "Status Messages": { en: "Status messages", sv: "Statusmeddelanden", ar: "رسائل الحالة" },
  "Number of Passengers": { en: "Number of passengers", sv: "Antal passagerare", ar: "عدد الركاب" },
  "Number of Items": { en: "Number of items", sv: "Antal föremål", ar: "عدد العناصر" },
  "Number of Persons": { en: "Number of persons", sv: "Antal personer", ar: "عدد الأشخاص" },
  "Round Trip": { en: "Round trip", sv: "Tur och retur", ar: "رحلة ذهاب وعودة" },
  "Estimated Distance (km)": { en: "Estimated distance (km)", sv: "Uppskattad sträcka (km)", ar: "المسافة التقديرية (كم)" },
  "Estimated Hours": { en: "Estimated hours", sv: "Uppskattade timmar", ar: "الساعات التقديرية" },
  "Has Elevator": { en: "Has elevator", sv: "Hiss finns", ar: "يوجد مصعد" },
  "Item Categories": { en: "Item categories", sv: "Artikelkategorier", ar: "فئات العناصر" },
  "Cleaning Areas": { en: "Cleaning areas", sv: "Städytor", ar: "مناطق التنظيف" },
  "Cleaning Intensity": { en: "Cleaning intensity", sv: "Städintensitet", ar: "كثافة التنظيف" },
  "Cleaning Supplies Provided": { en: "Cleaning supplies provided", sv: "Städmaterial ingår", ar: "مستلزمات التنظيف متوفرة" },
  "Assigned Driver": { en: "Assigned driver", sv: "Tilldelad förare", ar: "السائق المعيّن" },
  "Available Capacity": { en: "Available capacity", sv: "Tillgänglig kapacitet", ar: "السعة المتاحة" },
  "Available Capacity (kg)": { en: "Available capacity (kg)", sv: "Tillgänglig kapacitet (kg)", ar: "السعة المتاحة (كجم)" },
  "Capacity (kg)": { en: "Capacity (kg)", sv: "Kapacitet (kg)", ar: "السعة (كجم)" },
  "Capacity (Number of containers)": { en: "Capacity (number of containers)", sv: "Kapacitet (antal containrar)", ar: "السعة (عدد الحاويات)" },
  "Container Ship": { en: "Container ship", sv: "Containerfartyg", ar: "سفينة حاويات" },
  "Air Freight": { en: "Air freight", sv: "Flygfrakt", ar: "شحن جوي" },
  "Footer Links": { en: "Footer links", sv: "Sidfotslänkar", ar: "روابط التذييل" },
  "Social Media Links": { en: "Social media links", sv: "Länkar till sociala medier", ar: "روابط التواصل الاجتماعي" },
  "Copyright Text": { en: "Copyright text", sv: "Copyrighttext", ar: "نص حقوق النشر" },
  Copyright: { en: "Copyright", sv: "Copyright", ar: "حقوق النشر" },
  "Tunis → Sfax": { en: "Tunis → Sfax", sv: "Tunis → Sfax", ar: "تونس → صفاقس" },
  "Tunis → Sousse": { en: "Tunis → Sousse", sv: "Tunis → Sousse", ar: "تونس → سوسة" },

  // Data backup
  "Data backup": { en: "Data backup", sv: "Datasäkerhetskopiering", ar: "نسخة احتياطية للبيانات" },
  "Secure operations": { en: "Secure operations", sv: "Säker drift", ar: "عمليات آمنة" },
  "Keep your data protected": { en: "Keep your data protected", sv: "Skydda dina uppgifter", ar: "احمِ بياناتك" },
  "Create a shareable export of your Sanity dataset.": { en: "Create a shareable export of your Sanity dataset.", sv: "Skapa en delbar export av din Sanity-datamängd.", ar: "أنشئ نسخة تصدير قابلة للمشاركة من مجموعة بيانات Sanity." },
  "Last backup": { en: "Last backup", sv: "Senaste säkerhetskopiering", ar: "آخر نسخة احتياطية" },
  "No recent backup details": { en: "No recent backup details", sv: "Inga uppgifter om senaste säkerhetskopiering", ar: "لا توجد تفاصيل عن نسخة احتياطية حديثة" },
  "Not recorded": { en: "Not recorded", sv: "Inte registrerad", ar: "غير مسجل" },
  "Export data": { en: "Export data", sv: "Exportera data", ar: "تصدير البيانات" },
  "Download the configured Sanity dataset as an NDJSON file, then save or share it from the system sheet.": { en: "Download the configured Sanity dataset as an NDJSON file, then save or share it from the system sheet.", sv: "Ladda ned den konfigurerade Sanity-datamängden som en NDJSON-fil och spara eller dela den sedan från systemmenyn.", ar: "نزّل مجموعة بيانات Sanity المهيأة كملف NDJSON ثم احفظه أو شاركه من قائمة النظام." },
  "Sanity dataset · NDJSON": { en: "Sanity dataset · NDJSON", sv: "Sanity-datamängd · NDJSON", ar: "مجموعة بيانات Sanity · NDJSON" },
  "Export dataset": { en: "Export dataset", sv: "Exportera datamängd", ar: "تصدير مجموعة البيانات" },
  "This admin tool exports data. Restore and automatic backup history are not available here.": { en: "This admin tool exports data. Restore and automatic backup history are not available here.", sv: "Det här adminverktyget exporterar data. Återställning och automatiskt backuphistorik finns inte här.", ar: "أداة الإدارة هذه تصدّر البيانات. الاستعادة وسجل النسخ الاحتياطي التلقائي غير متاحين هنا." },
  "Preparing your export…": { en: "Preparing your export…", sv: "Förbereder din export…", ar: "جارٍ تحضير التصدير…" },
  "Export unavailable": { en: "Export unavailable", sv: "Exporten är inte tillgänglig", ar: "التصدير غير متاح" },
  "Sanity project settings are missing from this build.": { en: "Sanity project settings are missing from this build.", sv: "Sanity-projektets inställningar saknas i den här versionen.", ar: "إعدادات مشروع Sanity مفقودة من هذا الإصدار." },
  "Export failed": { en: "Export failed", sv: "Exporten misslyckades", ar: "فشل التصدير" },
  "Could not export Sanity data. Please try again.": { en: "Could not export Sanity data. Please try again.", sv: "Det gick inte att exportera Sanity-data. Försök igen.", ar: "تعذّر تصدير بيانات Sanity. يرجى المحاولة مرة أخرى." },
  "Export ready": { en: "Export ready", sv: "Exporten är klar", ar: "التصدير جاهز" },
  "The data export is ready to save or share.": { en: "The data export is ready to save or share.", sv: "Dataexporten är klar att spara eller dela.", ar: "تصدير البيانات جاهز للحفظ أو المشاركة." },

  // Record list
  "Could not load records. Check your connection and try again.": { en: "Could not load records. Check your connection and try again.", sv: "Det gick inte att hämta poster. Kontrollera anslutningen och försök igen.", ar: "تعذّر تحميل السجلات. تحقق من اتصالك وحاول مرة أخرى." },
  "Loading records": { en: "Loading records", sv: "Laddar poster", ar: "جارٍ تحميل السجلات" },
  "New records will appear here when they are added.": { en: "New records will appear here when they are added.", sv: "Nya poster visas här när de läggs till.", ar: "ستظهر السجلات الجديدة هنا عند إضافتها." },
  "No matching records": { en: "No matching records", sv: "Inga matchande poster", ar: "لا توجد سجلات مطابقة" },
  "Records could not load": { en: "Records could not load", sv: "Posterna kunde inte hämtas", ar: "تعذّر تحميل السجلات" },
  Record: { en: "Record", sv: "Post", ar: "سجل" },
  "Try another name or search term.": { en: "Try another name or search term.", sv: "Prova ett annat namn eller sökord.", ar: "جرّب اسمًا أو كلمة بحث أخرى." },
  Yes: { en: "Yes", sv: "Ja", ar: "نعم" },
  No: { en: "No", sv: "Nej", ar: "لا" },
  records: { en: "records", sv: "poster", ar: "سجلات" },
  record: { en: "record", sv: "post", ar: "سجل" },
  Filtered: { en: "Filtered", sv: "Filtrerat", ar: "مُفلتر" },

  // Admin history (Swedish sources + shared labels)
  "Notification history": { en: "Notification history", sv: "Notifikationshistorik", ar: "سجل الإشعارات" },
  "Sök i historiken...": { en: "Search history...", sv: "Sök i historiken...", ar: "ابحث في السجل..." },
  "Hämtar historik...": { en: "Loading history...", sv: "Hämtar historik...", ar: "جارٍ تحميل السجل..." },
  "Inga notiser hittades": { en: "No notifications found", sv: "Inga notiser hittades", ar: "لم يتم العثور على إشعارات" },
  "Skickade notifikationer visas här. Dra ned för att uppdatera.": { en: "Sent notifications appear here. Pull down to refresh.", sv: "Skickade notifikationer visas här. Dra ned för att uppdatera.", ar: "تظهر الإشعارات المرسلة هنا. اسحب للأسفل للتحديث." },
  "Radera notifikation": { en: "Delete notification", sv: "Radera notifikation", ar: "حذف الإشعار" },
  Raderad: { en: "Deleted", sv: "Raderad", ar: "تم الحذف" },
  "Notifikationen har tagits bort för alla användare.": { en: "The notification was deleted.", sv: "Notifikationen har tagits bort för alla användare.", ar: "تم حذف الإشعار." },
  Fel: { en: "Error", sv: "Fel", ar: "خطأ" },
  "Kunde inte radera notifikationen globalt.": { en: "The notification could not be deleted. Please try again.", sv: "Kunde inte radera notifikationen globalt.", ar: "تعذّر حذف الإشعار. يرجى المحاولة مرة أخرى." },
  "Okänd titel": { en: "Unknown title", sv: "Okänd titel", ar: "عنوان غير معروف" },
  "Unknown title": { en: "Unknown title", sv: "Okänd titel", ar: "عنوان غير معروف" },
  "Radera för alla": { en: "Delete for everyone", sv: "Radera för alla", ar: "حذف للجميع" },
  "Refresh history": { en: "Refresh history", sv: "Uppdatera historik", ar: "تحديث السجل" },
  "Remove media": { en: "Remove media", sv: "Ta bort media", ar: "إزالة الوسائط" },
  Refresh: { en: "Refresh", sv: "Uppdatera", ar: "تحديث" },
  "sent notifications": { en: "sent notifications", sv: "skickade notifikationer", ar: "إشعارات مرسلة" },
  "sent notification": { en: "sent notification", sv: "skickad notifikation", ar: "إشعار مرسَل" },
  items: { en: "items", sv: "objekt", ar: "عناصر" },
  "Inga länkar": { en: "No links", sv: "Inga länkar", ar: "لا توجد روابط" },
  "Inga sociala medier": { en: "No social media", sv: "Inga sociala medier", ar: "لا توجد وسائل تواصل" },
  "No links": { en: "No links", sv: "Inga länkar", ar: "لا توجد روابط" },
  "No social media": { en: "No social media", sv: "Inga sociala medier", ar: "لا توجد وسائل تواصل" },

  // Notification type labels (Swedish sources used by NOTIFICATION_TYPE_CONFIGS)
  "Allmänt": { en: "General", sv: "Allmänt", ar: "عام" },
  Bokning: { en: "Booking", sv: "Bokning", ar: "حجز" },
  Varning: { en: "Warning", sv: "Varning", ar: "تحذير" },
  Info: { en: "Info", sv: "Info", ar: "معلومات" },
  "Framgång": { en: "Success", sv: "Framgång", ar: "نجاح" },
  Erbjudande: { en: "Offer", sv: "Erbjudande", ar: "عرض" },
  Leverans: { en: "Delivery", sv: "Leverans", ar: "توصيل" },
  Service: { en: "Service", sv: "Service", ar: "خدمة" },
  "Säkerhet": { en: "Security", sv: "Säkerhet", ar: "الأمان" },
  Recension: { en: "Review", sv: "Recension", ar: "مراجعة" },
  System: { en: "System", sv: "System", ar: "النظام" },
  Uppdatering: { en: "Update", sv: "Uppdatering", ar: "تحديث" },
  Annons: { en: "Announcement", sv: "Annons", ar: "إعلان" },
  "Underhåll": { en: "Maintenance", sv: "Underhåll", ar: "صيانة" },
  Kampanj: { en: "Campaign", sv: "Kampanj", ar: "حملة" },
  General: { en: "General", sv: "Allmänt", ar: "عام" },
  Booking: { en: "Booking", sv: "Bokning", ar: "حجز" },
  Offer: { en: "Offer", sv: "Erbjudande", ar: "عرض" },
  Delivery: { en: "Delivery", sv: "Leverans", ar: "توصيل" },
  Security: { en: "Security", sv: "Säkerhet", ar: "الأمان" },
  Review: { en: "Review", sv: "Recension", ar: "مراجعة" },
  Update: { en: "Update", sv: "Uppdatering", ar: "تحديث" },
  Maintenance: { en: "Maintenance", sv: "Underhåll", ar: "صيانة" },
  Campaign: { en: "Campaign", sv: "Kampanj", ar: "حملة" },

  // Shipment / order option values shown as selectable chips
  standard: { en: "Standard", sv: "Standard", ar: "عادي" },
  express: { en: "Express", sv: "Express", ar: "سريع" },
  overnight: { en: "Overnight", sv: "Natt", ar: "ليلي" },
  confirmed: { en: "Confirmed", sv: "Bekräftad", ar: "مؤكد" },
  completed: { en: "Completed", sv: "Slutförd", ar: "مكتمل" },
  cancelled: { en: "Cancelled", sv: "Avbokad", ar: "ملغى" },
  in_progress: { en: "In progress", sv: "Pågående", ar: "قيد التنفيذ" },
  pending: { en: "Pending", sv: "Väntande", ar: "معلق" },
  accepted: { en: "Accepted", sv: "Accepterad", ar: "مقبول" },
  rejected: { en: "Rejected", sv: "Avvisad", ar: "مرفوض" },
  read: { en: "Read", sv: "Läst", ar: "مقروء" },
  deleted: { en: "Deleted", sv: "Raderad", ar: "محذوف" },
  sent: { en: "Sent", sv: "Skickad", ar: "مرسَل" },
  draft: { en: "Draft", sv: "Utkast", ar: "مسودة" },
  stripe: { en: "Stripe", sv: "Stripe", ar: "Stripe" },
  points: { en: "Points", sv: "Poäng", ar: "النقاط" },
  combined: { en: "Combined", sv: "Kombinerad", ar: "مشترك" },
  cash: { en: "Cash", sv: "Kontant", ar: "نقدي" },
  available: { en: "Available", sv: "Tillgänglig", ar: "متاح" },
  full: { en: "Full", sv: "Full", ar: "ممتلئ" },
  departed: { en: "Departed", sv: "Avgången", ar: "غادر" },
  cargo_van: { en: "Cargo van", sv: "Skåpbil", ar: "شاحنة بضائع" },
  truck: { en: "Truck", sv: "Lastbil", ar: "شاحنة" },
  container_ship: { en: "Container ship", sv: "Containerfartyg", ar: "سفينة حاويات" },
  air_freight: { en: "Air freight", sv: "Flygfrakt", ar: "شحن جوي" },

  // Record-list search / empty states per collection
  "Search users": { en: "Search users", sv: "Sök användare", ar: "ابحث عن المستخدمين" },
  "Search shipping orders": { en: "Search shipping orders", sv: "Sök fraktorder", ar: "ابحث في طلبات الشحن" },
  "Search taxi bookings": { en: "Search taxi bookings", sv: "Sök taxibokningar", ar: "ابحث في حجوزات التاكسي" },
  "Search announcements": { en: "Search announcements", sv: "Sök annonser", ar: "ابحث في الإعلانات" },
  "No users yet": { en: "No users yet", sv: "Inga användare ännu", ar: "لا يوجد مستخدمون بعد" },
  "No shipping orders yet": { en: "No shipping orders yet", sv: "Inga fraktorder ännu", ar: "لا توجد طلبات شحن بعد" },
  "No taxi bookings yet": { en: "No taxi bookings yet", sv: "Inga taxibokningar ännu", ar: "لا توجد حجوزات تاكسي بعد" },
  "No announcements yet": { en: "No announcements yet", sv: "Inga annonser ännu", ar: "لا توجد إعلانات بعد" },
  Search: { en: "Search", sv: "Sök", ar: "بحث" },
};

function knownTranslation(text: string, lang: string) {
  const entry = CORE_COPY[text] ?? ADMIN_COPY[text];
  return entry?.[lang as "en" | "sv" | "ar"];
}

/**
 * Synchronous dictionary lookup for code that cannot use hooks — alert
 * callbacks, event handlers, service-layer messages. Falls back to the source
 * text so a caller never renders nothing.
 */
export function translateNow(text: string, lang: string): string {
  if (!text) return text;
  return knownTranslation(text, lang) ?? text;
}

type QueuedBatch = {
  texts: Set<string>;
  waiters: Map<string, Array<(value: string) => void>>;
};

const queues = new Map<string, QueuedBatch>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function key(lang: string, text: string) {
  return `${lang}:${text}`;
}

/** Skip strings that cannot carry meaning worth a request. */
function isTranslatable(text: string) {
  return /[A-Za-zÀ-ÿ\u0600-\u06FF]/.test(text);
}

/** Don't treat an API echo as a successful translation and cache it forever. */
function alreadyInLanguage(text: string, lang: string) {
  if (lang === "ar") return /[\u0600-\u06FF]/.test(text);
  if (lang === "sv") {
    return /[åäö]/i.test(text) ||
      /\b(och|att|är|för|med|till|från|vår|ditt|du|dig|här|inte|på|om|kan|som|senaste|nyheter|aviseringar|resan|boka)\b/i.test(text);
  }
  if (lang === "en") {
    return !/[åäö\u0600-\u06FF]/i.test(text) &&
      /\b(the|and|your|you|from|with|for|is|are|can|new|latest|read|terms|privacy|account|updates|news|home|profile|trip|shipment)\b/i.test(text);
  }
  return false;
}

function resolveText(lang: string, text: string, value: string) {
  const settled = value.trim() || text;
  if (settled !== text || alreadyInLanguage(text, lang)) {
    memory.set(key(lang, text), settled);
  }
  return settled;
}

/** One request per batch; returns [] when the response cannot be mapped back. */
async function requestBatch(lang: string, texts: string[]): Promise<string[]> {
  const joined = texts.join(SEPARATOR);
  const response = await fetch(
    `${ENDPOINT}?dl=${lang}&text=${encodeURIComponent(joined)}`,
  );
  if (!response.ok) return [];

  const result = await response.json();
  const raw = String(result?.["destination-text"] ?? "");
  if (!raw) return [];

  const parts = raw.split(SEPARATOR).map((part) => part.trim());
  if (parts.length !== texts.length || parts.some((part) => !part)) return [];
  if (parts.some((part, index) => part === texts[index] && !alreadyInLanguage(texts[index], lang))) return [];

  return parts;
}

async function requestSingle(lang: string, text: string): Promise<string> {
  try {
    const response = await fetch(
      `${ENDPOINT}?dl=${lang}&text=${encodeURIComponent(text)}`,
    );
    if (!response.ok) return text;
    const result = await response.json();
    const translated = String(result?.["destination-text"] ?? "").trim();
    // Some translation providers return HTTP 200 with the source unchanged.
    // Treat that as a miss so it won't be cached as if it were translated.
    if (!translated || (translated === text && !alreadyInLanguage(text, lang))) {
      return text;
    }
    return translated;
  } catch {
    return text;
  }
}

/** Send everything queued, one request per language, then persist the results. */
async function flushQueues() {
  const entries = Array.from(queues.entries());
  queues.clear();

  for (const [lang, batch] of entries) {
    const texts = Array.from(batch.texts).slice(0, MAX_BATCH);
    const remainder = Array.from(batch.texts).slice(MAX_BATCH);

    // Anything beyond the batch ceiling goes back into the queue.
    if (remainder.length > 0) {
      const queue = queues.get(lang) ?? { texts: new Set<string>(), waiters: new Map() };
      remainder.forEach((text) => queue.texts.add(text));
      batch.waiters.forEach((waitersForText, text) => {
        if (!remainder.includes(text)) return;
        const existing = queue.waiters.get(text) ?? [];
        queue.waiters.set(text, [...existing, ...waitersForText]);
      });
      batch.waiters.forEach((waitersForText, text) => {
        if (remainder.includes(text)) return;
        batch.waiters.set(text, waitersForText);
      });
      queues.set(lang, queue);
      scheduleFlush();
    }

    let translated = await requestBatch(lang, texts).catch(() => [] as string[]);

    // Fall back to individual requests when the batch cannot be split back.
    if (translated.length !== texts.length) {
      const fallbackResults: string[] = new Array(texts.length);
      // Keep the fallback bounded while avoiding a slow one-request-at-a-time
      // chain for busy screens with many distinct labels.
      const concurrency = 5;
      for (let start = 0; start < texts.length; start += concurrency) {
        const chunk = texts.slice(start, start + concurrency);
        const results = await Promise.all(chunk.map((text) => requestSingle(lang, text)));
        results.forEach((value, index) => {
          fallbackResults[start + index] = value;
        });
      }
      translated = fallbackResults;
    }

    const persisted: Array<[string, string]> = [];

    texts.forEach((text, index) => {
      const value = resolveText(lang, text, translated[index] ?? text);
      if (value !== text || alreadyInLanguage(text, lang)) {
        persisted.push([key(lang, text), value]);
      }
      const waiters = batch.waiters.get(text) ?? [];
      waiters.forEach((resolve) => resolve(value));
      batch.waiters.delete(text);
      inflight.delete(key(lang, text));
    });

    if (persisted.length > 0) {
      AsyncStorage.multiSet(persisted).catch(() => {
        // Persistence is an optimisation; a failure must not break the UI.
      });
    }

    // Any string that never got picked up resolves to its original text.
    batch.waiters.forEach((waiters, text) => {
      waiters.forEach((resolve) => resolve(text));
      inflight.delete(key(lang, text));
    });
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueues().catch(() => undefined);
  }, BATCH_WINDOW_MS);
}

/**
 * Translate one string.
 *
 * Returns quickly from cache; otherwise the string joins the next batch. The
 * original text is always the fallback, so a caller never renders nothing.
 */
export async function translate(
  text: Translatable,
  targetLang: string,
): Promise<string> {
  const source = Array.isArray(text) ? text.join(" ") : String(text ?? "");
  if (!source) return source;
  const known = knownTranslation(source, targetLang);
  if (known) return known;
  if (!targetLang || !isTranslatable(source)) return source;

  // The public endpoint sends no `Access-Control-Allow-Origin` header, so a
  // browser request is rejected by CORS before the response is readable — the
  // network error shows up on every web screen. Native is unaffected. Web
  // keeps the bundled copy above and otherwise falls back to the source text.
  if (Platform.OS === "web") return source;

  const cached = memory.get(key(targetLang, source));
  if (cached && (cached !== source || alreadyInLanguage(source, targetLang))) return cached;
  if (cached === source) memory.delete(key(targetLang, source));

  const pending = inflight.get(key(targetLang, source));
  if (pending) return pending;

  try {
    const stored = await AsyncStorage.getItem(key(targetLang, source));
    if (stored && (stored !== source || alreadyInLanguage(source, targetLang))) {
      memory.set(key(targetLang, source), stored);
      return stored;
    }
    if (stored === source) await AsyncStorage.removeItem(key(targetLang, source));
  } catch {
    // Storage unavailable (web private mode) — continue to the network path.
  }

  const promise = new Promise<string>((resolve) => {
    const queue =
      queues.get(targetLang) ?? { texts: new Set<string>(), waiters: new Map() };
    queue.texts.add(source);
    const waiters = queue.waiters.get(source) ?? [];
    waiters.push(resolve);
    queue.waiters.set(source, waiters);
    queues.set(targetLang, queue);
    scheduleFlush();
  });

  inflight.set(key(targetLang, source), promise);
  return promise;
}

/**
 * Translate a string inside a component.
 *
 * Renders the source text immediately and swaps in the translation when the
 * batch resolves, so nothing flashes empty.
 */
export function useTranslationText(text: Translatable, lang?: string) {
  const source = Array.isArray(text) ? text.join(" ") : String(text ?? "");
  const [translated, setTranslated] = useState(source);
  const deviceLang = Localization.getLocales()[0]?.languageCode || "sv";

  useEffect(() => {
    const targetLang = lang || deviceLang;
    let active = true;

    const known = knownTranslation(source, targetLang);
    setTranslated(known ?? source);
    if (known) return;

    if (!isTranslatable(source)) return;

    translate(source, targetLang)
      .then((value) => {
        if (active) setTranslated(value);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [source, lang, deviceLang]);

  return translated;
}
