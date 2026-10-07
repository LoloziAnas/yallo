// Topics offered by "Get help". Ops reads tickets in English, so subjects are fixed English text.
import type { TicketPriority } from '@yallo/shared';

import type { Strings } from '@/data/strings';

export type HelpTopic = 'missing' | 'wrong' | 'late' | 'payment' | 'other';

export const helpTopics: {
  id: HelpTopic;
  label: keyof Strings;
  subject: string;
  priority: TicketPriority;
}[] = [
  { id: 'missing', label: 'helpMissing', subject: 'Missing item', priority: 'high' },
  { id: 'wrong', label: 'helpWrong', subject: 'Wrong item', priority: 'high' },
  { id: 'late', label: 'helpLate', subject: 'Late delivery', priority: 'high' },
  { id: 'payment', label: 'helpPayment', subject: 'Payment issue', priority: 'normal' },
  { id: 'other', label: 'helpOther', subject: 'Something else', priority: 'normal' },
];
