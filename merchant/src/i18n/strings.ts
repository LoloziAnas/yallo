// Every string the merchant app shows, in English (the key), French and Arabic. `{name}` placeholders are
// filled by `t`. Arabic switches the page to right-to-left.

export type Lang = 'en' | 'fr' | 'ar';
export const LANGS: { key: Lang; label: string }[] = [
  { key: 'fr', label: 'Français' },
  { key: 'ar', label: 'العربية' },
  { key: 'en', label: 'English' },
];

type Entry = [fr: string, ar: string];

export const STRINGS: Record<string, Entry> = {
  // Sign-in
  'Yallo for stores': ['Yallo pour les commerces', 'يالو للمتاجر'],
  'Take orders, set prep times and hand them to couriers.': [
    'Recevez les commandes, fixez le temps de préparation et remettez-les aux livreurs.',
    'استقبل الطلبات وحدّد وقت التحضير وسلّمها للموصّلين.',
  ],
  'Store phone number': ['Numéro du commerce', 'رقم هاتف المتجر'],
  'Send code': ['Envoyer le code', 'أرسل الرمز'],
  'Enter the code': ['Entrez le code', 'أدخل الرمز'],
  'Sent by SMS to {phone}': ['Envoyé par SMS au {phone}', 'أُرسل عبر SMS إلى {phone}'],
  'Demo code: {code}': ['Code de démo : {code}', 'رمز العرض: {code}'],
  'Sign in': ['Se connecter', 'تسجيل الدخول'],
  'Use another number': ['Utiliser un autre numéro', 'استعمل رقماً آخر'],
  'Connecting…': ['Connexion…', 'جارٍ الاتصال…'],
  'Wrong code': ['Code incorrect', 'رمز خاطئ'],
  'Enter a valid phone number': ['Entrez un numéro valide', 'أدخل رقماً صحيحاً'],
  'Cannot reach the Yallo API': ['Impossible de joindre Yallo', 'تعذّر الاتصال بيالو'],
  'No store account for this number': ['Aucun compte commerce pour ce numéro', 'لا يوجد حساب متجر لهذا الرقم'],
  'Your session ended. Sign in again': ['Votre session a expiré. Reconnectez-vous', 'انتهت جلستك. سجّل الدخول من جديد'],

  // Header and navigation
  Orders: ['Commandes', 'الطلبات'],
  Today: ["Aujourd'hui", 'اليوم'],
  Menu: ['Menu', 'القائمة'],
  'Open · taking orders': ['Ouvert · commandes actives', 'مفتوح · يستقبل الطلبات'],
  'Paused · no new orders': ['En pause · pas de nouvelles commandes', 'متوقف · لا طلبات جديدة'],
  'Pause orders': ['Mettre en pause', 'إيقاف الطلبات'],
  'Resume orders': ['Reprendre', 'استئناف الطلبات'],
  'Pause new orders?': ['Mettre les commandes en pause ?', 'إيقاف الطلبات الجديدة؟'],
  'Customers will see the store as closed. Orders in progress are not affected.': [
    'Les clients verront le commerce fermé. Les commandes en cours continuent.',
    'سيرى الزبائن المتجر مغلقاً. الطلبات الجارية لا تتأثر.',
  ],
  Pause: ['Pause', 'إيقاف'],
  Cancel: ['Annuler', 'إلغاء'],
  'Sign out': ['Se déconnecter', 'تسجيل الخروج'],
  Language: ['Langue', 'اللغة'],
  'Reconnecting…': ['Reconnexion…', 'جارٍ إعادة الاتصال…'],
  'Connecting to Yallo…': ['Connexion à Yallo…', 'جارٍ الاتصال بيالو…'],
  'Offline: actions are paused until the connection is back.': [
    'Hors ligne : les actions reprendront avec la connexion.',
    'غير متصل: الإجراءات متوقفة حتى عودة الاتصال.',
  ],
  'Turn on order alerts': ['Activer les alertes', 'تفعيل تنبيهات الطلبات'],
  'Tap once so the tablet can ring for new orders.': [
    'Touchez une fois pour que la tablette sonne à chaque commande.',
    'المس مرة واحدة ليرنّ الجهاز عند كل طلب جديد.',
  ],
  'Alerts on': ['Alertes activées', 'التنبيهات مفعّلة'],
  'Demo store': ['Commerce de démo', 'متجر تجريبي'],

  // Lanes
  New: ['Nouvelles', 'جديدة'],
  Preparing: ['En préparation', 'قيد التحضير'],
  'Ready for pickup': ['Prêtes à emporter', 'جاهزة للاستلام'],
  'No new orders': ['Aucune nouvelle commande', 'لا طلبات جديدة'],
  'Nothing cooking': ['Rien en préparation', 'لا شيء قيد التحضير'],
  'Nothing waiting': ['Rien en attente', 'لا شيء في الانتظار'],
  'Waiting for orders…': ['En attente de commandes…', 'في انتظار الطلبات…'],
  'The store is paused. Resume to receive orders.': [
    'Le commerce est en pause. Reprenez pour recevoir des commandes.',
    'المتجر متوقف. استأنف لاستقبال الطلبات.',
  ],
  'Select an order to see it here.': ['Sélectionnez une commande pour la voir ici.', 'اختر طلباً لعرضه هنا.'],

  // Order card and detail
  'New order': ['Nouvelle commande', 'طلب جديد'],
  'New order · {id}': ['Nouvelle commande · {id}', 'طلب جديد · {id}'],
  '{n} new orders': ['{n} nouvelles commandes', '{n} طلبات جديدة'],
  'Tap to open': ['Touchez pour ouvrir', 'المس للفتح'],
  '{n} items': ['{n} articles', '{n} عناصر'],
  '1 item': ['1 article', 'عنصر واحد'],
  'Placed {time}': ['Passée à {time}', 'طُلب {time}'],
  'waiting {min} min': ['en attente depuis {min} min', 'ينتظر منذ {min} د'],
  'Ready in {min} min': ['Prête dans {min} min', 'جاهز خلال {min} د'],
  'Due now': ['À servir maintenant', 'مستحق الآن'],
  'Accepted {time}': ['Acceptée à {time}', 'قُبل {time}'],
  '{min} min late': ['{min} min de retard', 'متأخر {min} د'],
  'Courier arriving · {min} min': ['Livreur en route · {min} min', 'الموصّل في الطريق · {min} د'],
  'Courier assigned': ['Livreur assigné', 'تم تعيين موصّل'],
  '{name} is at the counter': ['{name} est au comptoir', '{name} عند الكاونتر'],
  '{name} arriving · {min} min': ['{name} arrive · {min} min', '{name} قادم · {min} د'],
  'Looking for a courier': ['Recherche d’un livreur', 'جارٍ البحث عن موصّل'],
  'Picked up by {name}': ['Récupérée par {name}', 'استلمها {name}'],
  'Picked up': ['Récupérée', 'تم الاستلام'],
  Delivered: ['Livrée', 'تم التوصيل'],
  Rejected: ['Refusée', 'مرفوضة'],
  'Cancelled by the customer': ['Annulée par le client', 'ألغاها الزبون'],
  Cancelled: ['Annulée', 'ملغاة'],
  'Kitchen note': ['Note pour la cuisine', 'ملاحظة للمطبخ'],
  'Delivery note': ['Note de livraison', 'ملاحظة التوصيل'],
  'Items total': ['Total articles', 'مجموع العناصر'],
  'Cash on delivery': ['Paiement à la livraison', 'الدفع عند الاستلام'],
  'Paid by card': ['Payée par carte', 'مدفوع بالبطاقة'],
  'Order {id}': ['Commande {id}', 'الطلب {id}'],
  Customer: ['Client', 'الزبون'],
  'Prep time': ['Temps de préparation', 'وقت التحضير'],
  '{min} min': ['{min} min', '{min} د'],
  'Accept · {min} min': ['Accepter · {min} min', 'قبول · {min} د'],
  Reject: ['Refuser', 'رفض'],
  'Why are you turning it down?': ['Pourquoi refusez-vous ?', 'لماذا ترفض الطلب؟'],
  'Too busy right now': ['Trop de commandes en ce moment', 'مشغول جداً الآن'],
  'An item is out of stock': ['Un article est en rupture', 'عنصر غير متوفر'],
  'Closing soon': ['Fermeture imminente', 'سنغلق قريباً'],
  Other: ['Autre', 'سبب آخر'],
  'Tell the customer why': ['Expliquez au client', 'أخبر الزبون بالسبب'],
  'Reject order': ['Refuser la commande', 'رفض الطلب'],
  'Mark as ready': ['Marquer prête', 'جاهز للاستلام'],
  'Waiting for the courier': ['En attente du livreur', 'في انتظار الموصّل'],
  'Hand the bag to the courier and check the order number.': [
    'Remettez le sac au livreur et vérifiez le numéro de commande.',
    'سلّم الكيس للموصّل وتحقّق من رقم الطلب.',
  ],
  'Order accepted · ready in {min} min': ['Commande acceptée · prête dans {min} min', 'تم قبول الطلب · جاهز خلال {min} د'],
  'Order rejected': ['Commande refusée', 'تم رفض الطلب'],
  'Marked as ready': ['Marquée prête', 'تم التجهيز'],
  'Back to orders': ['Retour aux commandes', 'العودة للطلبات'],

  // Today
  "Today's orders": ['Commandes du jour', 'طلبات اليوم'],
  Completed: ['Terminées', 'مكتملة'],
  Sales: ['Ventes', 'المبيعات'],
  'Turned down': ['Refusées', 'مرفوضة'],
  'Avg prep': ['Prép. moyenne', 'متوسط التحضير'],
  'Sales are item totals, before Yallo commission.': [
    'Ventes = total des articles, avant commission Yallo.',
    'المبيعات = مجموع العناصر قبل عمولة يالو.',
  ],
  'No orders yet today': ["Pas encore de commande aujourd'hui", 'لا طلبات اليوم بعد'],

  // Menu / stock
  'Out of stock': ['En rupture', 'غير متوفر'],
  Available: ['Disponible', 'متوفر'],
  'Switch off what you can’t make today. Customers see it as unavailable.': [
    'Désactivez ce que vous ne pouvez pas préparer aujourd’hui. Les clients le verront indisponible.',
    'أوقف ما لا يمكنك تحضيره اليوم. سيظهر للزبائن غير متوفر.',
  ],
  '{name} is back on the menu': ['{name} est de retour au menu', '{name} متوفر من جديد'],
  '{name} marked out of stock': ['{name} en rupture', '{name} غير متوفر الآن'],
  '{n} out of stock': ['{n} en rupture', '{n} غير متوفر'],
};

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  let text = lang === 'en' || !entry ? key : entry[lang === 'fr' ? 0 : 1];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
