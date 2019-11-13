function cleanStackTrace(stack) {
  // Mangle a stack trace so that it doesn't contain file names and line numbers,
  // as that would make a test very fragile:
  var lines = stack.split('\n');
  let numStackLines = 0;
  for (var i = 0; i < lines.length; i += 1) {
    const matchStackLine = lines[i].match(/^( +at (?:[\w<>]+ \()?)[^)]+(\)?)$/);
    if (matchStackLine) {
      numStackLines += 1;
      if (numStackLines <= 2) {
        lines[i] = // eslint-disable-next-line prefer-template
          matchStackLine[1] + '/path/to/file.js:x:y' + matchStackLine[2];
      } else {
        lines.splice(i, 1);
        i -= 1;
      }
    } else {
      numStackLines = 0;
    }
  }
  return lines.join('\n');
}

module.exports = cleanStackTrace;
