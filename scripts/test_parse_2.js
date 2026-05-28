const { parseBcaEmail } = require('./bcaParser');

const samples = [
  'Transfer Amount : IDR 2',
  'Transfer Amount : IDR 2,00',
  'Transfer Amount : IDR 2.00',
  'Transfer Amount : Rp 2',
  'Transfer Amount : Rp 2,00',
  'Transfer Amount : IDR 2.0',
  'Transfer Amount : IDR 2.000,00',
  'Transfer Amount : IDR 2\nReference No. : XYZ-2',
  'Some header\nTransfer Amount : IDR 2\nSome footer',
  '<div>Transfer Amount : IDR 2,00</div>',
  'Transfer Amount : IDR 0,02',
];

for (const s of samples) {
  try {
    const parsed = parseBcaEmail(s);
    console.log('INPUT:', s);
    console.log('PARSED:', JSON.stringify(parsed));
  } catch (err) {
    console.error('ERROR parsing input:', s, err && err.message);
  }
  console.log('---');
}
