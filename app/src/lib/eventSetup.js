export const DEFAULT_REGISTRATION_CATEGORIES = [
  {
    id: null,
    category: 'student',
    label: 'Student',
    is_active: true,
    sort_order: 0,
    require_student_email: true,
    require_admission_number: true,
    ask_graduation_year: true,
    ask_course: true,
    ask_school: true,
    ask_location: true,
    questions: [],
  },
  {
    id: null,
    category: 'alumni',
    label: 'Alumni',
    is_active: true,
    sort_order: 1,
    require_student_email: false,
    require_admission_number: false,
    ask_graduation_year: true,
    ask_course: true,
    ask_school: true,
    ask_location: true,
    questions: [],
  },
  {
    id: null,
    category: 'guest',
    label: 'Guest',
    is_active: true,
    sort_order: 2,
    require_student_email: false,
    require_admission_number: false,
    ask_graduation_year: false,
    ask_course: false,
    ask_school: false,
    ask_location: true,
    questions: [],
  },
];

export const REFUND_POLICY_OPTIONS = ['No Refund', '48 Hours', '7 Days', 'Custom'];

export const TICKET_TYPE_OPTIONS = ['Standard', 'VIP', 'Early Bird', 'Free', 'Donation'];

export const TICKET_CLASS_BY_TYPE = {
  Standard: 'paid',
  VIP: 'vip',
  'Early Bird': 'early_bird',
  Free: 'free',
  Donation: 'donation',
};

export const TICKET_TYPE_BY_CLASS = {
  free: 'Free',
  paid: 'Standard',
  vip: 'VIP',
  early_bird: 'Early Bird',
  donation: 'Donation',
};

const cloneQuestion = (question = {}, questionIndex = 0) => ({
  id: question.id ?? null,
  label: question.label || '',
  field_type: question.field_type || 'text',
  is_required: Boolean(question.is_required),
  options: Array.isArray(question.options) ? [...question.options] : [],
  sort_order: question.sort_order ?? questionIndex,
});

export const createDefaultRegistrationCategories = () =>
  DEFAULT_REGISTRATION_CATEGORIES.map((category, index) => ({
    ...category,
    sort_order: category.sort_order ?? index,
    questions: Array.isArray(category.questions)
      ? category.questions.map((question, questionIndex) => cloneQuestion(question, questionIndex))
      : [],
  }));

export const normalizeRegistrationCategory = (category = {}, index = 0) => {
  const defaults = DEFAULT_REGISTRATION_CATEGORIES.find((entry) => entry.category === category.category) || {};
  const normalized = {
    ...defaults,
    ...category,
    sort_order: category.sort_order ?? defaults.sort_order ?? index,
    questions: Array.isArray(category.questions)
      ? category.questions.map((question, questionIndex) => cloneQuestion(question, questionIndex))
      : [],
  };

  if (normalized.category === 'student') {
    normalized.label = 'Student';
    normalized.require_student_email = true;
    normalized.require_admission_number = true;
  } else if (normalized.category === 'alumni') {
    normalized.label = 'Alumni';
  } else if (normalized.category === 'guest' && !String(normalized.label || '').trim()) {
    normalized.label = 'Guest';
  }

  return normalized;
};

export const mergeRegistrationCategories = (categories = []) => {
  const existing = Array.isArray(categories) ? categories : [];
  const byType = new Map(existing.map((category) => [category.category, category]));
  const orderedExisting = [...existing].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const merged = [
    ...orderedExisting.map((category, index) => normalizeRegistrationCategory(category, index)),
    ...DEFAULT_REGISTRATION_CATEGORIES
      .filter((defaultCategory) => !byType.has(defaultCategory.category))
      .map((category, index) => normalizeRegistrationCategory(category, orderedExisting.length + index)),
  ];

  return merged.map((category, index) => ({
    ...category,
    sort_order: index,
  }));
};

export const mapRefundPolicy = (policy) =>
  ({
    'No Refund': 'no_refund',
    '48 Hours': '48_hours',
    '7 Days': '7_days',
    Custom: 'custom',
  }[policy] || 'no_refund');

export const unmapRefundPolicy = (policy) =>
  ({
    no_refund: 'No Refund',
    '48_hours': '48 Hours',
    '7_days': '7 Days',
    custom: 'Custom',
  }[policy] || 'No Refund');

export const normalizeTicketTypeLabel = (ticket = {}) => {
  const directLabel = String(ticket.type || ticket.name || '').trim();
  if (TICKET_TYPE_OPTIONS.includes(directLabel)) {
    return directLabel;
  }

  const mappedFromClass = TICKET_TYPE_BY_CLASS[String(ticket.ticket_class || '').trim().toLowerCase()];
  if (mappedFromClass) {
    return mappedFromClass;
  }

  return directLabel || 'Standard';
};

export const mapApiTicketToEditorTicket = (ticket = {}) => ({
  id: ticket.id ?? null,
  type: normalizeTicketTypeLabel(ticket),
  price: Number(ticket.price || 0),
  quantity: ticket.quantity || 100,
  description: ticket.description || '',
  category: ticket.registration_category_type || 'guest',
  registrationCategoryId: ticket.registration_category || null,
});

export const mapApiPromoToEditorPromo = (promo = {}) => ({
  id: promo.id ?? null,
  code: promo.code || '',
  discount_type: promo.discount_type || promo.discountType || 'percent',
  discount_value: promo.discount_value ?? promo.discountValue ?? '',
  usage_limit: promo.usage_limit ?? promo.usageLimit ?? '',
  expiry: promo.expiry ? String(promo.expiry).slice(0, 10) : '',
  minimum_order_amount: promo.minimum_order_amount ?? promo.minimumOrderAmount ?? 0,
  is_active: promo.is_active ?? promo.isActive ?? true,
});
