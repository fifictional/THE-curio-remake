import { type Bundle } from "@/components/exam-bundles/types";

export const bundles: Bundle[] = [
  {
    hideOnMobile: true,
    order: 0,
    title: 'Curio',
    subtitle: '',
    description: 'Start learning smarter instantly. Free forever.',
    features: [
      { text: 'AI tutor for any subject', type: 'v' },
      { text: 'Upload docs or images to study smart', type: 'v' },
      { text: 'Flashcards, quizzes and summaries', type: 'v' },
      { text: 'Practice tests on any topic', type: 'v' }
    ],
    note: 'Fair usage limits apply. Upgrade if you want to study a lot!!',
    ctaLabel: 'Current Plan',
    variant: 'light',
    disabled: true,
  },
  {
    hideOnMobile: false,
    order: 2,
    title: 'Super Curio',
    isSubscription: true,
    pricingOptions: [
      {
        sku: 'SUPER_CURIO_MONTHLY',
        originalSku: 'SUPER_CURIO_MONTHLY_ORIGINAL',
        billingPeriod: 'monthly',
      },
      {
        sku: 'SUPER_CURIO_6MONTHS',
        originalSku: 'SUPER_CURIO_6MONTHS_ORIGINAL',
        perMonthSku: 'SUPER_CURIO_6MONTHS_PER_MONTH',
        billingPeriod: '6_months',
      },
      {
        sku: 'SUPER_CURIO_ANNUAL',
        originalSku: 'SUPER_CURIO_ANNUAL_ORIGINAL',
        perMonthSku: 'SUPER_CURIO_ANNUAL_PER_MONTH',
        billingPeriod: 'annually',
      },
      {
        sku: 'SUPER_CURIO_MONTH_GIFT',
        billingPeriod: 'monthly',
        oneTime: true,
      },
      {
        sku: 'SUPER_CURIO_ANNUAL_GIFT',
        billingPeriod: 'annually',
        oneTime: true,
      },
    ],
    subtitle: '',
    description: 'Built to help you learn, with superpowers',
    features: [
      { text: 'Advanced AI tutor', type: 't' },
      { text: 'Larger limits on file uploads', type: 't' },
      { text: 'Unlimited chats, flashcards and quizzes', type: 't' },
      { text: 'Adaptive difficulty on tests', type: 't' }
    ],
    ctaLabel: 'Upgrade to Super Curio',
    oneTimeCtaLabel: 'Gift Super Curio',
    variant: 'dark',
  },
  {
    hideOnMobile: false,
    order: 1,
    title: 'Ultra Curio',
    isSubscription: true,
    pricingOptions: [
      {
        sku: 'ULTRA_CURIO_MONTHLY',
        originalSku: 'ULTRA_CURIO_MONTHLY_ORIGINAL',
        billingPeriod: 'monthly',
      },
      {
        sku: 'ULTRA_CURIO_6MONTHS',
        originalSku: 'ULTRA_CURIO_6MONTHS_ORIGINAL',
        perMonthSku: 'ULTRA_CURIO_6MONTHS_PER_MONTH',
        billingPeriod: '6_months',
      },
      {
        sku: 'ULTRA_CURIO_ANNUAL',
        originalSku: 'ULTRA_CURIO_ANNUAL_ORIGINAL',
        perMonthSku: 'ULTRA_CURIO_ANNUAL_PER_MONTH',
        billingPeriod: 'annually',
      },
      {
        sku: 'ULTRA_CURIO_MONTH_GIFT',
        billingPeriod: 'monthly',
        oneTime: true,
      },
      {
        sku: 'ULTRA_CURIO_ANNUAL_GIFT',
        billingPeriod: 'annually',
        oneTime: true,
      },
    ],
    subtitle: '',
    description: 'Built to help you ace exams, with ultrapowers!',
    features: [
      { text: 'Advanced AI tutor', type: 't' },
      { text: 'Larger limits on file uploads', type: 't' },
      { text: 'Unlimited chats, flashcards and quizzes', type: 't' },
      { text: 'Adaptive difficulty on tests', type: 't' },
      { text: 'Powerful exam prep engine for SATs', type: 'f' },
    ],
    ctaLabel: 'Upgrade to Ultra Curio',
    oneTimeCtaLabel: 'Gift Ultra Curio',
    variant: 'dark',
  },
];

export const superCuriobundles: Bundle[] = [
  {
    hideOnMobile: false,
    order: 2,
    title: 'Super Curio',
    isSubscription: true,
    pricingOptions: [
      {
        sku: 'SUPER_CURIO_ANNUAL',
        originalSku: 'SUPER_CURIO_ANNUAL_ORIGINAL',
        perMonthSku: 'SUPER_CURIO_ANNUAL_PER_MONTH',
        billingPeriod: 'annually',
      },
      {
        sku: 'SUPER_CURIO_MONTHLY',
        originalSku: 'SUPER_CURIO_MONTHLY_ORIGINAL',
        billingPeriod: 'monthly',
      },
    ],
    subtitle: '',
    description: 'Built to help you learn, with superpowers',
    features: [
      { text: 'Advanced AI tutor', type: 't' },
      { text: 'Larger limits on file uploads', type: 't' },
      { text: 'Unlimited chats, flashcards and quizzes', type: 't' },
      { text: 'Adaptive difficulty on tests', type: 't' }
    ],
    ctaLabel: 'Upgrade to Super Curio',
    oneTimeCtaLabel: 'Gift Super Curio',
    variant: 'dark',
  },
]


