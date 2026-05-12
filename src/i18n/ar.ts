export default {
  translation: {
    // App
    appName: 'برايدال ERP',
    appDesc: 'نظام إدارة محل الفساتين',

    // Navigation
    nav: {
      dashboard: 'الرئيسية',
      inventory: 'المخزون',
      sales: 'المبيعات',
      rentals: 'التأجير',
      customers: 'العملاء',
      expenses: 'المصاريف',
      reports: 'التقارير',
      settings: 'الإعدادات',
      deliveries: 'التسليمات',
      reminders: 'التذكيرات',
      activityLog: 'سجل النشاط',
      logout: 'تسجيل الخروج',
    },

    // Auth
    auth: {
      login: 'تسجيل الدخول',
      username: 'اسم المستخدم',
      password: 'كلمة المرور',
      loginBtn: 'دخول',
      loginError: 'بيانات الدخول غير صحيحة',
      loggingIn: 'جاري تسجيل الدخول...',
      welcomeBack: 'أهلاً بعودتك',
    },

    // Dashboard
    dashboard: {
      title: 'لوحة التحكم',
      todayRevenue: 'إيرادات اليوم',
      totalRevenue: 'إجمالي الإيرادات',
      totalExpenses: 'إجمالي المصاريف',
      netProfit: 'صافي الربح',
      activeRentals: 'تأجيرات نشطة',
      pendingPayments: 'مدفوعات معلقة',
      quickActions: 'إجراءات سريعة',
      recentActivity: 'النشاط الأخير',
      todayStats: 'إحصائيات اليوم',
      upcomingReturns: 'إرجاعات قادمة',
      overdueReturns: 'إرجاعات متأخرة',
      todayTransactions: 'معاملات اليوم',
      dressStatus: 'حالة الفساتين',
    },

    // Inventory
    inventory: {
      title: 'المخزون',
      addDress: 'إضافة فستان',
      editDress: 'تعديل الفستان',
      deleteDress: 'حذف الفستان',
      dressCode: 'كود الفستان',
      color: 'اللون',
      size: 'المقاس',
      style: 'الطراز',
      price: 'سعر الشراء',
      purchasePrice: 'سعر الشراء',
      salePrice: 'سعر البيع',
      rentalPrice: 'سعر التأجير',
      condition: 'الحالة',
      notes: 'ملاحظات',
      status: 'الحالة',
      history: 'السجل',
      image: 'الصورة',
      searchDresses: 'البحث في الفساتين...',
      noResults: 'لا توجد فساتين',
      totalDresses: 'إجمالي الفساتين',
      dressDetail: 'تفاصيل الفستان',
    },

    // Status
    status: {
      available: 'متاح',
      reserved: 'محجوز',
      rented: 'مؤجَّر',
      cleaning: 'تنظيف',
      sold: 'مباع',
      active: 'نشط',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      pending: 'معلق',
      done: 'منتهي',
    },

    // Condition
    condition: {
      new: 'جديد',
      good: 'جيد',
      fair: 'مقبول',
      poor: 'ضعيف',
    },

    // Sales
    sales: {
      title: 'المبيعات',
      newSale: 'بيع جديد',
      selectCustomer: 'اختر العميل',
      selectDress: 'اختر الفستان',
      price: 'السعر',
      deposit: 'العربون',
      remaining: 'المتبقي',
      paymentMethod: 'طريقة الدفع',
      cash: 'نقدي',
      card: 'بطاقة',
      transfer: 'تحويل',
      saleCreated: 'تم إنشاء البيع بنجاح',
      confirmSale: 'تأكيد البيع',
      saleDetails: 'تفاصيل البيع',
      noSales: 'لا توجد مبيعات',
    },

    // Rentals
    rentals: {
      title: 'التأجير',
      newRental: 'تأجير جديد',
      rentalStart: 'تاريخ الاستلام',
      rentalEnd: 'تاريخ الإرجاع',
      duration: 'المدة',
      returnDress: 'إرجاع الفستان',
      needsCleaning: 'يحتاج تنظيف؟',
      rentalCreated: 'تم إنشاء التأجير بنجاح',
      returnCompleted: 'تم تسجيل الإرجاع بنجاح',
      confirmReturn: 'تأكيد الإرجاع',
      noRentals: 'لا توجد تأجيرات',
      activeRentals: 'التأجيرات النشطة',
      overdueWarning: 'تأخر في الإرجاع',
    },

    // Customers
    customers: {
      title: 'العملاء',
      addCustomer: 'إضافة عميل',
      editCustomer: 'تعديل العميل',
      name: 'الاسم',
      phone: 'الهاتف',
      address: 'العنوان',
      notes: 'ملاحظات',
      history: 'سجل العميل',
      searchCustomers: 'البحث في العملاء...',
      noCustomers: 'لا يوجد عملاء',
      totalCustomers: 'إجمالي العملاء',
      customerDetail: 'تفاصيل العميل',
    },

    // Expenses
    expenses: {
      title: 'المصاريف',
      addExpense: 'إضافة مصروف',
      editExpense: 'تعديل المصروف',
      category: 'الفئة',
      amount: 'المبلغ',
      description: 'الوصف',
      date: 'التاريخ',
      recurring: 'متكرر',
      categories: {
        rent: 'إيجار',
        electricity: 'كهرباء',
        salary: 'رواتب',
        cleaning: 'تنظيف',
        marketing: 'تسويق',
        maintenance: 'صيانة',
        other: 'أخرى',
      },
      noExpenses: 'لا توجد مصاريف',
      totalExpenses: 'إجمالي المصاريف',
    },

    // Reminders
    reminders: {
      title: 'التذكيرات',
      types: {
        pickup: 'استلام',
        return: 'إرجاع',
        payment: 'دفعة',
        cleaning: 'تنظيف',
      },
      priority: {
        low: 'منخفض',
        normal: 'عادي',
        high: 'عالي',
        urgent: 'عاجل',
      },
      markDone: 'تحديد كمنتهٍ',
      noReminders: 'لا توجد تذكيرات',
      today: 'تذكيرات اليوم',
      upcoming: 'القادمة',
    },

    // Reports
    reports: {
      title: 'التقارير',
      financial: 'التقرير المالي',
      inventory: 'تقرير المخزون',
      period: 'الفترة الزمنية',
      from: 'من',
      to: 'إلى',
      generate: 'إنشاء التقرير',
      export: 'تصدير',
      exportPdf: 'تصدير PDF',
      exportCsv: 'تصدير CSV',
      totalRevenue: 'إجمالي الإيرادات',
      totalExpenses: 'إجمالي المصاريف',
      netProfit: 'صافي الربح',
      saleRevenue: 'إيرادات المبيعات',
      rentalRevenue: 'إيرادات التأجير',
    },

    // Deliveries
    deliveries: {
      title: 'التسليمات',
      addDelivery: 'تسليم جديد',
      deliveryNumber: 'رقم التسليم',
      supplier: 'المورد',
      deliveryDate: 'تاريخ التسليم',
      totalCost: 'التكلفة الإجمالية',
      items: 'العناصر',
      noDeliveries: 'لا توجد تسليمات',
    },

    // Settings
    settings: {
      title: 'الإعدادات',
      users: 'إدارة المستخدمين',
      language: 'اللغة',
      theme: 'المظهر',
      light: 'فاتح',
      dark: 'داكن',
      arabic: 'العربية',
      german: 'الألمانية',
      roles: {
        owner: 'مالك',
        employee: 'موظف',
        cashier: 'كاشير',
      },
      addUser: 'إضافة مستخدم',
      editUser: 'تعديل المستخدم',
      changePassword: 'تغيير كلمة المرور',
    },

    // Actions
    actions: {
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      view: 'عرض',
      add: 'إضافة',
      search: 'بحث',
      filter: 'تصفية',
      reset: 'إعادة تعيين',
      confirm: 'تأكيد',
      close: 'إغلاق',
      back: 'رجوع',
      next: 'التالي',
      print: 'طباعة',
      refresh: 'تحديث',
      markDone: 'تحديد كمنتهٍ',
      reserve: 'حجز',
    },

    // Validation
    validation: {
      required: 'هذا الحقل مطلوب',
      minLength: 'يجب أن يكون {{count}} أحرف على الأقل',
      maxLength: 'يجب أن لا يتجاوز {{count}} حرف',
      invalidPrice: 'السعر غير صحيح',
      invalidDate: 'التاريخ غير صحيح',
      endBeforeStart: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
      depositExceedsPrice: 'العربون لا يمكن أن يتجاوز السعر',
    },

    // Messages
    messages: {
      success: 'تمت العملية بنجاح',
      error: 'حدث خطأ، يرجى المحاولة مرة أخرى',
      confirmDelete: 'هل أنت متأكد من الحذف؟',
      confirmSale: 'هل أنت متأكد من إتمام البيع؟',
      confirmReturn: 'هل أنت متأكد من تسجيل الإرجاع؟',
      cannotUndo: 'لا يمكن التراجع عن هذا الإجراء',
      loading: 'جاري التحميل...',
      saved: 'تم الحفظ بنجاح',
      deleted: 'تم الحذف بنجاح',
      noData: 'لا توجد بيانات',
      unauthorized: 'غير مصرح لك بهذا الإجراء',
    },

    // Currency
    currency: 'ر.س',
    noPermission: 'ليس لديك صلاحية لعرض هذه البيانات',
  },
};
