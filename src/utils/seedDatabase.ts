import { api } from '../lib/api';

export async function seedDatabase(onProgress: (msg: string) => void): Promise<void> {

  // 1. Kunden
  onProgress('إنشاء العملاء...');
  const customerInputs = [
    { name: 'رنا محمد',    phone: '0912345678', address: 'دمشق - المزة',      notes: 'عميلة دائمة' },
    { name: 'سارة أحمد',   phone: '0998765432', address: 'دمشق - المالكي',    notes: '' },
    { name: 'هدى حسن',     phone: '0944556677', address: 'حمص',               notes: 'حجز مسبق' },
    { name: 'منى علي',     phone: '0933221144', address: 'حلب',               notes: '' },
    { name: 'ريم سالم',    phone: '0921112233', address: 'دمشق - كفرسوسة',   notes: '' },
    { name: 'لارا خالد',   phone: '0966554433', address: 'دمشق - باب توما',   notes: 'تفضل الألوان الفاتحة' },
    { name: 'دانا يوسف',   phone: '0955443322', address: 'اللاذقية',          notes: '' },
    { name: 'نور أيوب',    phone: '0988776655', address: 'دمشق - القدم',      notes: 'عروس مايو 2026' },
    { name: 'مي عمر',      phone: '0977665544', address: 'طرطوس',             notes: '' },
    { name: 'رولا زيدان',  phone: '0911223344', address: 'دمشق - جرمانا',     notes: '' },
    { name: 'آية حمدان',   phone: '0922334455', address: 'دمشق - المزرعة',    notes: '' },
    { name: 'سلمى جبر',    phone: '0933445566', address: 'دمشق - باب شرقي',   notes: '' },
    { name: 'رهف الأحمد',  phone: '0944667788', address: 'دمشق - المزة 86',   notes: '' },
    { name: 'وسام شحادة',  phone: '0955778899', address: 'دمشق - داريا',      notes: '' },
    { name: 'تالا درويش',  phone: '0966889900', address: 'حمص - الزهراء',     notes: '' },
  ];
  const customers = await Promise.all(customerInputs.map(c => api.customers.create(c)));

  // 2. Kleider (alle Status vertreten)
  onProgress('إنشاء الفساتين...');
  const dressInputs = [
    // available (für Verkauf & Vermietung)
    { code: 'W001', color: 'أبيض',  size: '38', style: 'كلاسيكي',  price: 350000, notes: 'حالة ممتازة' },
    { code: 'W002', color: 'كريمي', size: '40', style: 'أميرة',     price: 420000, notes: '' },
    { code: 'W003', color: 'ذهبي',  size: '36', style: 'فاخر',      price: 580000, notes: 'مطرز يدوي' },
    { code: 'W004', color: 'وردي',  size: '42', style: 'رومانسي',   price: 290000, notes: '' },
    { code: 'W005', color: 'أبيض',  size: '44', style: 'بوهيمي',    price: 310000, notes: '' },
    { code: 'W006', color: 'فضي',   size: '38', style: 'حديث',      price: 450000, notes: 'ترتر فضي' },
    // → werden vermietet (rented)
    { code: 'W007', color: 'كريمي', size: '40', style: 'شيك',       price: 380000, notes: '' },
    { code: 'W008', color: 'أبيض',  size: '36', style: 'كلاسيكي',  price: 320000, notes: '' },
    { code: 'W009', color: 'ذهبي',  size: '42', style: 'أميرة',     price: 520000, notes: 'دانتيل فرنسي' },
    { code: 'W010', color: 'أبيض',  size: '40', style: 'فاخر',      price: 680000, notes: 'كريستالات سواروفسكي' },
    // → werden verkauft (sold via sale)
    { code: 'W011', color: 'كريمي', size: '38', style: 'رومانسي',   price: 260000, notes: '' },
    { code: 'W012', color: 'وردي',  size: '36', style: 'حديث',      price: 340000, notes: '' },
    // → Reinigung (cleaning via return)
    { code: 'W013', color: 'فضي',   size: '44', style: 'شيك',       price: 490000, notes: 'إضافة طرحة' },
    { code: 'W014', color: 'أبيض',  size: '42', style: 'بوهيمي',    price: 280000, notes: '' },
    // → reserviert (reserved)
    { code: 'W015', color: 'ذهبي',  size: '40', style: 'فاخر',      price: 750000, notes: 'حصري - قطعة واحدة' },
    { code: 'W016', color: 'أزرق',  size: '38', style: 'حديث',      price: 395000, notes: 'أزرق سماوي' },
    // mehr available
    { code: 'W017', color: 'أحمر',  size: '40', style: 'كلاسيكي',  price: 430000, notes: '' },
    { code: 'W018', color: 'أبيض',  size: '42', style: 'شيك',       price: 510000, notes: 'طراز إيطالي' },
    { code: 'W019', color: 'بيج',   size: '38', style: 'بوهيمي',    price: 375000, notes: '' },
    { code: 'W020', color: 'أبيض',  size: '40', style: 'فاخر',      price: 620000, notes: 'تطريز يدوي ثقيل' },
  ];
  const dresses = await Promise.all(dressInputs.map(d => api.inventory.create(d)));

  // 3. Aktive Vermietungen (Status: rented)
  onProgress('تسجيل الإيجارات النشطة...');
  await api.transactions.createRental({
    customer_id: customers[2].id, dress_id: dresses[6].id,
    price: 180000, deposit: 80000, payment_method: 'cash',
    rental_start: '2026-05-01', rental_end: '2026-05-10',
    notes: 'حفلة في فندق الشام',
  });
  await api.transactions.createRental({
    customer_id: customers[3].id, dress_id: dresses[7].id,
    price: 120000, deposit: 50000, payment_method: 'cash',
    rental_start: '2026-05-03', rental_end: '2026-05-11',
    notes: '',
  });
  await api.transactions.createRental({
    customer_id: customers[6].id, dress_id: dresses[8].id,
    price: 200000, deposit: 100000, payment_method: 'transfer',
    rental_start: '2026-05-04', rental_end: '2026-05-14',
    notes: 'زفاف كبير',
  });
  // überfällige Vermietung (overdue)
  await api.transactions.createRental({
    customer_id: customers[4].id, dress_id: dresses[9].id,
    price: 95000, deposit: 40000, payment_method: 'shamcash',
    rental_start: '2026-04-20', rental_end: '2026-04-28',
    notes: 'مناسبة عائلية — تأخر الإرجاع',
  });

  // 4. Abgeschlossene Vermietungen → Reinigung (cleaning)
  onProgress('تسجيل المرتجعات وإرسال للتنظيف...');
  const ret1 = await api.transactions.createRental({
    customer_id: customers[7].id, dress_id: dresses[12].id,
    price: 150000, deposit: 70000, payment_method: 'cash',
    rental_start: '2026-04-15', rental_end: '2026-04-22',
    notes: '',
  });
  await api.transactions.processReturn({
    transaction_id: ret1.id,
    needs_cleaning: true,
    cleaner_name: 'أبو خالد — مغسلة النور',
  });

  const ret2 = await api.transactions.createRental({
    customer_id: customers[9].id, dress_id: dresses[13].id,
    price: 110000, deposit: 55000, payment_method: 'cash',
    rental_start: '2026-04-18', rental_end: '2026-04-25',
    notes: '',
  });
  await api.transactions.processReturn({
    transaction_id: ret2.id,
    needs_cleaning: true,
    cleaner_name: 'مغسلة النخيل',
  });

  // 5. Abgeschlossene Vermietungen → direkt verfügbar (completed)
  onProgress('تسجيل إيجارات مكتملة...');
  const ret3 = await api.transactions.createRental({
    customer_id: customers[1].id, dress_id: dresses[0].id,
    price: 130000, deposit: 60000, payment_method: 'cash',
    rental_start: '2026-04-10', rental_end: '2026-04-16',
    notes: '',
  });
  await api.transactions.processReturn({
    transaction_id: ret3.id,
    needs_cleaning: false,
  });

  // 6. Reservierungen (reserved)
  onProgress('تسجيل الحجوزات...');
  await api.transactions.reserve(dresses[14].id, customers[5].id, 'حجز لحفل يوم 2026-06-01');
  await api.transactions.reserve(dresses[15].id, customers[10].id, 'حجز مسبق للعرس');

  // 7. Verkäufe (sale)
  onProgress('تسجيل المبيعات...');
  await api.transactions.createSale({
    customer_id: customers[0].id, dress_id: dresses[10].id,
    price: 260000, deposit: 130000, payment_method: 'cash',
    notes: 'دفعة أولى فقط',
  });
  await api.transactions.createSale({
    customer_id: customers[8].id, dress_id: dresses[11].id,
    price: 340000, deposit: 340000, payment_method: 'shamcash',
    notes: 'مدفوعة بالكامل',
  });
  await api.transactions.createSale({
    customer_id: customers[11].id, dress_id: dresses[1].id,
    price: 420000, deposit: 200000, payment_method: 'transfer',
    notes: '',
  });
  await api.transactions.createSale({
    customer_id: customers[12].id, dress_id: dresses[2].id,
    price: 580000, deposit: 580000, payment_method: 'cash',
    notes: 'مبيعة فاخرة — مدفوعة بالكامل',
  });

  // 8. Ausgaben (expenses)
  onProgress('إنشاء المصروفات...');
  const expenseInputs = [
    { category: 'rent',        amount: 500000,  description: 'إيجار المحل — مايو 2026',      date: '2026-05-01', recurring_type: 'monthly' as const },
    { category: 'electricity', amount: 45000,   description: 'فاتورة الكهرباء — مايو',       date: '2026-05-03', recurring_type: 'monthly' as const },
    { category: 'salary',      amount: 200000,  description: 'راتب الموظفة سمر',             date: '2026-05-01', recurring_type: 'monthly' as const },
    { category: 'salary',      amount: 180000,  description: 'راتب الموظف ياسر',             date: '2026-05-01', recurring_type: 'monthly' as const },
    { category: 'cleaning',    amount: 30000,   description: 'تنظيف فستانين W013 و W014',    date: '2026-05-02', recurring_type: 'none'    as const },
    { category: 'marketing',   amount: 60000,   description: 'إعلانات انستغرام وفيسبوك',     date: '2026-04-25', recurring_type: 'monthly' as const },
    { category: 'maintenance', amount: 25000,   description: 'صيانة مكيفات المحل',           date: '2026-04-20', recurring_type: 'none'    as const },
    { category: 'other',       amount: 15000,   description: 'مستلزمات مكتبية وأكياس تغليف', date: '2026-04-15', recurring_type: 'none'    as const },
    { category: 'rent',        amount: 500000,  description: 'إيجار المحل — أبريل 2026',     date: '2026-04-01', recurring_type: 'monthly' as const },
    { category: 'electricity', amount: 38000,   description: 'فاتورة الكهرباء — أبريل',      date: '2026-04-04', recurring_type: 'monthly' as const },
    { category: 'cleaning',    amount: 22000,   description: 'تنظيف فستانين بعد الإرجاع',    date: '2026-04-10', recurring_type: 'none'    as const },
    { category: 'salary',      amount: 200000,  description: 'راتب الموظفة سمر — أبريل',    date: '2026-04-01', recurring_type: 'monthly' as const },
    { category: 'salary',      amount: 180000,  description: 'راتب الموظف ياسر — أبريل',    date: '2026-04-01', recurring_type: 'monthly' as const },
    { category: 'marketing',   amount: 40000,   description: 'تصوير فساتين جديدة',          date: '2026-03-20', recurring_type: 'none'    as const },
    { category: 'maintenance', amount: 18000,   description: 'إصلاح نظام الإضاءة',          date: '2026-03-15', recurring_type: 'none'    as const },
  ];
  await Promise.all(expenseInputs.map(e => api.expenses.create({ ...e, currency: 'SYP', usd_to_syp_snapshot: 14000, usd_to_try_snapshot: 34 })));

  // 9. Erinnerungen (reminders)
  onProgress('إنشاء التذكيرات...');
  const reminderInputs = [
    { reminder_type: 'return',   title: 'إرجاع فستان هدى حسن',        date: '2026-05-10', priority: 'urgent', description: 'موعد إرجاع W007 — فندق الشام' },
    { reminder_type: 'return',   title: 'إرجاع فستان منى علي',         date: '2026-05-11', priority: 'high',   description: 'موعد إرجاع W008' },
    { reminder_type: 'return',   title: 'إرجاع فستان دانا يوسف',       date: '2026-05-14', priority: 'normal', description: 'إرجاع W009' },
    { reminder_type: 'return',   title: 'تأخر إرجاع ريم سالم',         date: '2026-04-28', priority: 'urgent', description: 'W010 — متأخر منذ أسبوع!' },
    { reminder_type: 'pickup',   title: 'استلام فستان رنا محمد',        date: '2026-05-08', priority: 'high',   description: 'موعد استلام فستان الزفاف بعد التعديل' },
    { reminder_type: 'pickup',   title: 'استلام فستان لارا خالد',       date: '2026-05-18', priority: 'low',    description: 'موعد الاستلام المتفق عليه' },
    { reminder_type: 'pickup',   title: 'استلام فستان نور أيوب',        date: '2026-05-20', priority: 'normal', description: 'عروس مايو 2026' },
    { reminder_type: 'payment',  title: 'تحصيل باقي رنا محمد',         date: '2026-05-15', priority: 'high',   description: 'المبلغ المتبقي 130,000 ل.س' },
    { reminder_type: 'payment',  title: 'تحصيل باقي هدى حسن',          date: '2026-05-10', priority: 'normal', description: 'المبلغ المتبقي 100,000 ل.س' },
    { reminder_type: 'payment',  title: 'دفعة منى علي المتبقية',        date: '2026-05-11', priority: 'high',   description: 'المبلغ المتبقي 70,000 ل.س' },
    { reminder_type: 'payment',  title: 'متابعة دفع سلمى جبر',          date: '2026-05-22', priority: 'normal', description: 'المبلغ المتبقي 220,000 ل.س' },
    { reminder_type: 'cleaning', title: 'تنظيف W013 — مغسلة النور',     date: '2026-05-06', priority: 'normal', description: 'المنظِّف: أبو خالد' },
    { reminder_type: 'cleaning', title: 'تنظيف W014 — مغسلة النخيل',    date: '2026-05-07', priority: 'low',    description: 'استلام بعد التنظيف' },
    { reminder_type: 'pickup',   title: 'استلام فستان آية حمدان',       date: '2026-06-01', priority: 'low',    description: 'حجز مسبق يونيو' },
  ];
  await Promise.all(reminderInputs.map(r => api.reminders.create(r as Parameters<typeof api.reminders.create>[0])));

  // 10. Lieferungen (deliveries)
  onProgress('إنشاء التوريدات...');
  await api.deliveries.create({
    delivery_number: 'DEL-2026-001',
    supplier: 'دار الزهراء للأزياء — بيروت',
    delivery_date: '2026-04-15',
    total_cost: 2850000,
    notes: 'طقم ربيع 2026 — 6 فساتين',
    dress_ids: dresses.slice(6, 10).map(d => d.id),
  });
  await api.deliveries.create({
    delivery_number: 'DEL-2026-002',
    supplier: 'ورشة الخياطة الملكية — دمشق',
    delivery_date: '2026-04-28',
    total_cost: 1650000,
    notes: 'طلبية خاصة — 4 فساتين مخصصة',
    dress_ids: dresses.slice(12, 16).map(d => d.id),
  });
  await api.deliveries.create({
    delivery_number: 'DEL-2026-003',
    supplier: 'Novia International — إسطنبول',
    delivery_date: '2026-05-02',
    total_cost: 3200000,
    notes: 'مجموعة صيف 2026 — 4 فساتين',
    dress_ids: dresses.slice(16, 20).map(d => d.id),
  });
  await api.deliveries.create({
    delivery_number: 'DEL-2026-004',
    supplier: 'بيت الأزياء الملكي — حلب',
    delivery_date: '2026-03-10',
    total_cost: 1900000,
    notes: 'فساتين كلاسيكية وأميرة',
    dress_ids: dresses.slice(0, 4).map(d => d.id),
  });

  onProgress('اكتملت التعبئة بنجاح ✓');
}
