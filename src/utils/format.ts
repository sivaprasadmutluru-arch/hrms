export function employeeName(profile?: any) {
  return [
    profile?.firstName || profile?.employeeFirstName,
    profile?.lastName || profile?.employeeLastName,
  ]
    .filter(Boolean)
    .join(' ') || 'Employee';
}

export function workDuration(seconds?: number) {
  const total = seconds || 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function initials(profile?: any) {
  const name = employeeName(profile);
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'E';
}

export function money(value?: number | string | null, symbol = '') {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }
  return `${symbol}${numeric.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
}

export function timeText(value?: string | null) {
  if (!value) {
    return '-';
  }
  const text = String(value);
  let hour: number;
  let minute: number;
  let second: number;

  if (text.includes('T')) {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) {
      return text;
    }
    hour = date.getHours();
    minute = date.getMinutes();
    second = date.getSeconds();
  } else {
    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) {
      return text;
    }
    hour = Number(match[1]);
    minute = Number(match[2]);
    second = Number(match[3] || 0);
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${displayHour}:${pad(minute)}:${pad(second)} ${period}`;
}

export function dateText(value?: string | null) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
}
