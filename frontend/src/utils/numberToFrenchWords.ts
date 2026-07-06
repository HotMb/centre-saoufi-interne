export function numberToFrenchWords(number: number): string {
  if (number === 0) return 'zéro';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertTens(num: number): string {
    if (num < 10) return units[num];
    if (num >= 10 && num < 20) return teens[num - 10];
    
    const digit1 = Math.floor(num / 10);
    const digit2 = num % 10;
    
    if (digit1 === 7) {
      if (digit2 === 1) return 'soixante et onze';
      return `soixante-${teens[digit2]}`;
    }
    
    if (digit1 === 9) {
      return `quatre-vingt-${teens[digit2]}`;
    }
    
    if (digit1 === 8) {
      if (digit2 === 0) return 'quatre-vingts';
      return `quatre-vingt-${units[digit2]}`;
    }

    if (digit2 === 0) return tens[digit1];
    if (digit2 === 1) return `${tens[digit1]} et un`;
    return `${tens[digit1]}-${units[digit2]}`;
  }

  function convertHundreds(num: number): string {
    if (num > 99) {
      const digit = Math.floor(num / 100);
      const rest = num % 100;
      if (digit === 1) {
        return rest === 0 ? 'cent' : `cent ${convertTens(rest)}`;
      }
      if (rest === 0) {
        return `${units[digit]} cents`;
      }
      return `${units[digit]} cent ${convertTens(rest)}`;
    }
    return convertTens(num);
  }

  function convertThousands(num: number): string {
    if (num >= 1000) {
      const digit = Math.floor(num / 1000);
      const rest = num % 1000;
      let thousandsStr = '';
      if (digit === 1) {
        thousandsStr = 'mille';
      } else {
        thousandsStr = `${convertHundreds(digit)} mille`;
      }
      if (rest === 0) return thousandsStr;
      return `${thousandsStr} ${convertHundreds(rest)}`;
    }
    return convertHundreds(num);
  }

  const result = convertThousands(Math.floor(number));
  
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}
