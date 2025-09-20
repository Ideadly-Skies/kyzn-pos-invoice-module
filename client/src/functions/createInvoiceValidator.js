export function validateSenderStreetAddress(streetAddress) {
  if (!streetAddress.trim()) {
    return false;
  }
  return true;
}
export function validateSenderCity(city) {
  if (!city.trim()) {
    return false;
  }
  return true;
}
export function validateSenderPostCode(postCode) {
  // Support various international postal code formats
  // Allow 3-10 alphanumeric characters, spaces, and hyphens
  return /^[A-Za-z0-9\s\-]{3,10}$/.test(postCode.trim()) && postCode.trim().length > 0;
}
export function validateSenderCountry(country) {
  if (!country.trim()) {
    return false;
  }
  return true;
}

export function validateCLientName(name) {
  // Allow letters, spaces, hyphens, apostrophes, and periods
  // Must be at least 1 character and not just whitespace
  return /^[a-zA-Z\s\-'.]+$/.test(name) && name.trim().length > 0;
}
export function validateCLientEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // Basic email validation
}

export function validateClientStreetAddress(streetAddress) {
  if (!streetAddress.trim()) {
    return false;
  }
  return true;
}
export function validateClientCity(city) {
  if (!city.trim()) {
    return false;
  }
  return true;
}
export function validateClientPostCode(postCode) {
  // Support various international postal code formats
  // Allow 3-10 alphanumeric characters, spaces, and hyphens
  return /^[A-Za-z0-9\s\-]{3,10}$/.test(postCode.trim()) && postCode.trim().length > 0;
}
export function validateClientCountry(country) {
  if (!country.trim()) {
    return false;
  }
  return true;
}

export function validateItemName(itemName) {
  if (!itemName.trim()) {
    return false;
  }
  return true;
}
export function validateItemPrice(itemPrice) {
  if (itemPrice <= 0) {
    return false;
  }
  return true;
}
export function validateItemCount(itemCount) {
  if (itemCount <= 0) {
    return false;
  }
  return true;
}
