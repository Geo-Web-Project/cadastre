export function truncateStr(str, strLen) {
  if (str.length <= strLen) {
    return str;
  }

  var separator = "...";

  var sepLen = separator.length,
    charsToShow = strLen - sepLen,
    frontChars = Math.ceil(charsToShow / 2),
    backChars = Math.floor(charsToShow / 2);

  return (
    str.substr(0, frontChars) + separator + str.substr(str.length - backChars)
  );
}

export function truncateEth(str, maxDecimalDigits) {
  if (str.includes('.')) {
      const parts = str.split('.');
      return parts[0] + '.' + parts[1].slice(0, maxDecimalDigits);
  }
  return str;
}