const decimalToDms = (value, isLatitude) => {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  const hemisphere = isLatitude
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');

  return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${hemisphere}`;
};

const parseDmsComponent = (component, isLatitude) => {
  const normalized = String(component || '').trim().toUpperCase();
  const nums = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 3) return NaN;

  const deg = parseFloat(nums[0]);
  const min = parseFloat(nums[1]);
  const sec = parseFloat(nums[2]);
  if ([deg, min, sec].some(Number.isNaN)) return NaN;
  if (min < 0 || min >= 60 || sec < 0 || sec >= 60) return NaN;

  let decimal = Math.abs(deg) + (min / 60) + (sec / 3600);
  if (deg < 0) decimal *= -1;

  const hemi = normalized.match(/(?:\s|^)([NSEW])\s*$/);
  if (hemi) {
    const h = hemi[1];
    if (h === 'S' || h === 'W') decimal = -Math.abs(decimal);
    if (h === 'N' || h === 'E') decimal = Math.abs(decimal);
  }

  const limit = isLatitude ? 90 : 180;
  if (decimal < -limit || decimal > limit) return NaN;
  return decimal;
};

export const parseCoordinates = (value) => {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim().replace(';', ',').replace(/\s+/g, ' ');
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const isDms = (s) => /[°'"dms]|[nsewNSEW]/i.test(s);

  let lat;
  let lng;
  if (isDms(parts[0]) || isDms(parts[1])) {
    lat = parseDmsComponent(parts[0], true);
    lng = parseDmsComponent(parts[1], false);
  } else {
    lat = parseFloat(parts[0].replace(',', '.'));
    lng = parseFloat(parts[1].replace(',', '.'));
  }

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { latitude: lat, longitude: lng };
};

export const formatCoordsDms = (latitude, longitude) => {
  return `${decimalToDms(latitude, true)}, ${decimalToDms(longitude, false)}`;
};

export const normalizeCoordsToDms = (value) => {
  const parsed = parseCoordinates(value);
  if (!parsed) return value || '-';
  return formatCoordsDms(parsed.latitude, parsed.longitude);
};
