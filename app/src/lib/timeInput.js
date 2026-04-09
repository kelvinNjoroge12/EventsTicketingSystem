export const normalizeTimeInput = (value) => {
  if (!value) return '';

  const trimmed = String(value).trim();
  const twentyFourHourMatch = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d{1,6})?)?$/);
  if (twentyFourHourMatch) {
    return `${twentyFourHourMatch[1]}:${twentyFourHourMatch[2]}`;
  }

  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::[0-5]\d(?:\.\d{1,6})?)?\s*([AaPp][Mm])$/);
  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]);
    const minutes = twelveHourMatch[2];
    const meridiem = twelveHourMatch[3].toUpperCase();

    if (hours < 1 || hours > 12) {
      return '';
    }

    if (meridiem === 'AM') {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  const firstClockMatch = trimmed.match(/\b(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?\b/);
  if (!firstClockMatch) return '';

  return normalizeTimeInput(firstClockMatch[0]);
};
