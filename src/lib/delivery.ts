/**
 * One place that turns a raw `courses.delivery_type` value into words a learner
 * or member of staff would actually say. Database values are never changed —
 * only how they read on screen (e.g. `online_self_paced` → "Online, self-paced").
 */
const DELIVERY_LABELS: Record<string, string> = {
  online: 'Online',
  online_self_paced: 'Online, self-paced',
  'online-self-paced': 'Online, self-paced',
  self_paced: 'Self-paced',
  blended: 'Blended',
  practical: 'Practical',
  classroom: 'Classroom',
  in_person: 'In person',
  'in-person': 'In person',
  virtual_classroom: 'Virtual classroom',
  webinar: 'Webinar',
};

export function formatDeliveryType(type?: string | null): string {
  if (!type) return 'Online';
  const key = type.trim().toLowerCase();
  if (DELIVERY_LABELS[key]) return DELIVERY_LABELS[key];
  // Unknown values still read as words rather than raw database text.
  const words = key.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
