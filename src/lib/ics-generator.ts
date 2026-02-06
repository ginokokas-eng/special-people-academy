/**
 * ICS file generator for calendar downloads
 * Allows learners to add training sessions to their personal calendars
 */

interface ICSEventData {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  organizer?: string;
}

/**
 * Formats a date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escapes special characters for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generates an ICS file content for a training session
 */
export function generateICSContent(event: ICSEventData): string {
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@spa-training.com`;
  const now = formatDateToICS(new Date());
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SPA Training//Training Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/London',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0100',
    'TZNAME:BST',
    'DTSTART:19700329T010000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0000',
    'TZNAME:GMT',
    'DTSTART:19701025T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Europe/London:${formatDateToICS(event.startDate).slice(0, -1)}`,
    `DTEND;TZID=Europe/London:${formatDateToICS(event.endDate).slice(0, -1)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  if (event.organizer) {
    lines.push(`ORGANIZER;CN=${escapeICSText(event.organizer)}:mailto:training@specialpeople.org.uk`);
  }

  lines.push(
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}

/**
 * Downloads an ICS file for a training session
 */
export function downloadICSFile(event: ICSEventData, filename?: string): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Creates event data from a practical session
 */
export function createSessionEventData(
  courseTitle: string,
  sessionDate: string,
  location?: string,
  durationMinutes: number = 180, // Default 3 hours for practical sessions
  notes?: string
): ICSEventData {
  const startDate = new Date(sessionDate);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  return {
    title: `Training: ${courseTitle}`,
    description: notes 
      ? `Practical training session for ${courseTitle}.\n\nNotes: ${notes}`
      : `Practical training session for ${courseTitle}.`,
    location: location || 'TBC',
    startDate,
    endDate,
    organizer: 'SPA Training Team',
  };
}
