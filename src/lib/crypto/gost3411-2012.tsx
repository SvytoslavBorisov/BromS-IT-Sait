// src/lib/gost3411.ts
import { randomBytes } from 'crypto';
import iconv from 'iconv-lite';

// S-box
const S_BOX: number[] = [252,238,221,17,207,110,49,22,251,196,250,218,35,197,4,77,233,119,240,219,147,46,153,186,23,54,241,187,20,205,95,193,249,24,101,90,226,92,239,33,129,28,60,66,139,1,142,79,5,132,2,174,227,106,143,160,6,11,237,152,127,212,211,31,235,52,44,81,234,200,72,171,242,42,104,162,253,58,206,204,181,112,14,86,8,12,118,18,191,114,19,71,156,183,93,135,21,161,150,41,16,123,154,199,243,145,120,111,157,158,178,177,50,117,25,61,255,53,138,126,109,84,198,128,195,189,13,87,223,245,36,169,62,168,67,201,215,121,214,246,124,34,185,3,224,15,236,222,122,148,176,188,220,232,40,80,78,51,10,74,167,151,96,115,30,0,98,68,26,184,56,130,100,159,38,65,173,69,70,146,39,94,85,47,140,163,165,125,105,213,149,59,7,88,179,64,134,172,29,247,48,55,107,228,136,217,231,137,225,27,131,73,76,63,248,254,141,83,170,144,202,216,133,97,32,113,103,164,45,43,9,91,203,155,37,208,190,229,108,82,89,166,116,210,230,244,180,192,209,102,175,194,57,75,99,182];

// P-box
const P_BOX: number[] = [
  0,8,16,24,32,40,48,56,1,9,17,25,33,41,49,57,2,10,18,26,34,42,50,58,3,11,19,27,35,43,51,59,4,12,20,28,36,44,52,60,5,13,21,29,37,45,53,61,6,14,22,30,38,46,54,62,7,15,23,31,39,47,55
];

// L constants (hex strings)
const L_BOX = [
  '8e20faa72ba0b470','47107ddd9b505a38','ad08b0e0c3282d1c','d8045870ef14980e','6c022c38f90a4c07','3601161cf205268d','1b8e0b0e798c13c8','83478b07b2468764',
  'a011d380818e8f40','5086e740ce47c920','2843fd2067adea10','14aff010bdd87508','0ad97808d06cb404','05e23c0468365a02','8c711e02341b2d01','46b60f011a83988e',
  '90dab52a387ae76f','486dd4151c3dfdb9','24b86a840e90f0d2','125c354207487869','092e94218d243cba','8a174a9ec8121e5d','4585254f64090fa0','accc9ca9328a8950',
  '9d4df05d5f661451','c0a878a0a1330aa6','60543c50de970553','302a1e286fc58ca7','18150f14b9ec46dd','0c84890ad27623e0','0642ca05693b9f70','0321658cba93c138',
  '86275df09ce8aaa8','439da0784e745554','afc0503c273aa42a','d960281e9d1d5215','e230140fc0802984','71180a8960409a42','b60c05ca30204d21','5b068c651810a89e',
  '456c34887a3805b9','ac361a443d1c8cd2','561b0d22900e4669','2b838811480723ba','9bcf4486248d9f5d','c3e9224312c8c1a0','effa11af0964ee50','f97d86d98a327728',
  'e4fa2054a80b329c','727d102a548b194e','39b008152acb8227','9258048415eb419d','492c024284fbaec0','aa16012142f35760','550b8e9e21f7a530','a48b474f9ef5dc18',
  '70a6a56e2440598e','3853dc371220a247','1ca76e95091051ad','0edd37c48a08a6d8','07e095624504536c','8d70c431ac02a736','c83862965601dd1b','641c314b2b8ee083'
];
// convert to BigInt
const L_BOX_BIG = L_BOX.map(x => BigInt('0x' + x));

// C_list
const C_LIST = [
  'b1085bda1ecadae9ebcb2f81c0657c1f2f6a76432e45d016714eb88d7585c4fc4b7ce09192676901a2422a08a460d31505767436cc744d23dd806559f2a64507',
  '6fa3b58aa99d2f1a4fe39d460f70b5d7f3feea720a232b9861d55e0f16b501319ab5176b12d699585cb561c2db0aa7ca55dda21bd7cbcd56e679047021b19bb7',
  'f574dcac2bce2fc70a39fc286a3d843506f15e5f529c1f8bf2ea7514b1297b7bd3e20fe490359eb1c1c93a376062db09c2b6f443867adb31991e96f50aba0ab2',
  'ef1fdfb3e81566d2f948e1a05d71e4dd488e857e335c3c7d9d721cad685e353fa9d72c82ed03d675d8b71333935203be3453eaa193e837f1220cbebc84e3d12e',
  '4bea6bacad4747999a3f410c6ca923637f151c1f1686104a359e35d7800fffbdbfcd1747253af5a3dfff00b723271a167a56a27ea9ea63f5601758fd7c6cfe57',
  'ae4faeae1d3ad3d96fa4c33b7a3039c02d66c4f95142a46c187f9ab49af08ec6cffaa6b71c9ab7b40af21f66c2bec6b6bf71c57236904f35fa68407a46647d6e',
  'f4c70e16eeaac5ec51ac86febf240954399ec6c7e6bf87c9d3473e33197a93c90992abc52d822c3706476983284a05043517454ca23c4af38886564d3a14d493',
  '9b1f5b424d93c9a703e7aa020c6e41414eb7f8719c36de1e89b4443b4ddbc49af4892bcb929b069069d18d2bd1a5c42f36acc2355951a8d9a47f0dd4bf02e71e',
  '378f5a541631229b944c9ad8ec165fde3a7d3a1b258942243cd955b7e00d0984800a440bdbb2ceb17b2b8a9aa6079c540e38dc92cb1f2a607261445183235adb',
  'abbedea680056f52382ae548b2e4f3f38941e71cff8a78db1fffe18a1b3361039fe76702af69334b7a1e6c303b7652f43698fad1153bb6c374b4c7fb98459ced',
  '7bcd9ed0efc889fb3002c6cd635afe94d8fa6bbbebab076120018021148466798a1d71efea48b9caefbacd1d7d476e98dea2594ac06fd85d6bcaa4cd81f32d1b',
  '378ee767f11631bad21380b00449b17acda43c32bcdf1d77f82012d430219f9b5d80ef9d1891cc86e71da4aa88e12852faf417d5d9b21b9948bc924af11bd720'
].map(x => BigInt('0x' + x));

// hex to BigInt XOR
function hexXor(a: string, b: string): string {
  const x: bigint = BigInt('0x' + a) ^ BigInt('0x' + b);
  return x.toString(16).padStart(a.length, '0');
}

function nice(st: string, n: number): string {
  const len: number = Math.ceil(st.length / n) * n;
  return st.padStart(len, '0');
}

function isBinaryString(s: string): boolean {
  return /^[01]*$/.test(s);
}

function isHexString(s: string): boolean {
  return /^[0-9A-F]*$/i.test(s);
}

interface HexLen { hex: string; lenM: number; }

function stringToHex(str: string): HexLen {
  const buf = iconv.encode(str, 'win1251');
  let binary = Array.from(buf)
    .map(b => b.toString(2).padStart(8, '0'))
    .join('');
  const lenM: number = binary.length % 512;
  if (lenM) binary = '0'.repeat(511 - lenM) + '1' + binary;
  const hex: string = Array.from(binary)
    .reduce((acc, _, i) => i % 4 === 0 ? acc + parseInt(binary.slice(i, i+4), 2).toString(16) : acc, '');
  return { hex, lenM };
}

function hexToString(hex: string, lenM: number): string {
  const bits: string = Array.from(hex)
    .map(c => parseInt(c, 16).toString(2).padStart(4, '0'))
    .join('');
  const orig: string = lenM ? bits.slice(-lenM) : bits;
  const bytes: number[] = [];
  for (let i = 0; i < orig.length; i += 8) {
    bytes.push(parseInt(orig.slice(i, i+8), 2));
  }
  return iconv.decode(Buffer.from(bytes), 'win1251');
}

function binaryStringToHex(binary: string): HexLen {
  if (binary.length % 4) binary = binary.padStart(binary.length + (4 - binary.length % 4), '0');
  const lenM: number = binary.length % 512;
  if (lenM) binary = '0'.repeat(511 - lenM) + '1' + binary;
  const hex: string = Array.from(binary)
    .reduce((acc, _, i) => i % 4 === 0 ? acc + parseInt(binary.slice(i, i+4), 2).toString(16) : acc, '');
  return { hex, lenM };
}

function hexToBin(x: string): string {
  return x.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');
}

function validateLengthPow2(length: number): boolean {
  return length > 0 && (length & (length - 1)) === 0;
}

function xorMod2(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) % 2;
}

function decToBinArray(n: number, k = 8): number[] {
  let b: string = n.toString(2);
  const len: number = Math.ceil(b.length / k) * k;
  b = b.padStart(len, '0');
  return Array.from(b).map(bit => +bit);
}

// HashCalculator class
export class HashCalculator {
  private choice: string;
  private format: string;
  private compressRounds: number;
  private h: string;
  private N: string;
  private total: string;
  private M_raw: string;
  private M: string;
  private M_len: number;

  constructor(choice: '0' | '1', format: 'str' | 'hex' | 'bin', M: string, compressRounds = 12) {
    this.choice = choice;
    this.format = format;
    this.compressRounds = compressRounds;
    this.h = choice === '0' ? '01'.repeat(64) : '00'.repeat(64);
    this.N = '0'.repeat(128);
    this.total = '0'.repeat(128);
    this.M_raw = M;
    this.M = '';
    this.M_len = 0;
    this._prepare();
  }

  private _prepare(): void {
    let res: HexLen;
    if (this.format === 'str') res = stringToHex(this.M_raw);
    else if (this.format === 'hex') res = binaryStringToHex(hexToBin(this.M_raw));
    else res = binaryStringToHex(this.M_raw);
    this.M = res.hex;
    this.M_len = res.lenM;
  }

  private MSB(h: string): string {
    return h.slice(0, 64);
  }

  private S(a: string): string {
    return Array.from(a.match(/.{2}/g) ?? [])
      .map(byte => S_BOX[parseInt(byte, 16)].toString(16).padStart(2, '0'))
      .join('');
  }

  private P(a: string): string {
    const pairs: { byte: string; pos: number }[] = [];
    const len: number = a.length;
    for (let i = len - 2; i >= 0; i -= 2) {
      const idx: number = (len - 2 - i) / 2;
      pairs.push({ byte: a.slice(i, i + 2), pos: P_BOX[idx] });
    }
    pairs.sort((x, y) => x.pos - y.pos);
    return pairs.map(x => x.byte).join('');
  }

  private L(a: string): string {
    // если L_BOX_BIG неправильно инициализирован, кинем понятную ошибку
    if (L_BOX_BIG.length !== 64) {
      throw new Error(`L_BOX_BIG expected length 64, got ${L_BOX_BIG.length}`);
    }

    let str = a;
    if (str.length % 16) {
      str = str.padStart(str.length + (16 - (str.length % 16)), '0');
    }

    const blocks: string[] = [];
    for (let i = 0; i < str.length; i += 16) {
      const block = str.slice(i, i + 16);
      const num = BigInt('0x' + block);

      // собираем по битам
      let acc: bigint = 0n;
      for (let j = 0; j < L_BOX_BIG.length; j++) {
        // достаем j-й коэффициент
        const coeff = L_BOX_BIG[j];
        // проверяем бит: сдвиг -> маска
        const bit = (num >> BigInt(63 - j)) & 1n;
        if (bit === 1n) {
          // явно только bigint
          acc = acc ^ coeff;
        }
      }

      // форматируем в 16-символьный hex
      blocks.push(acc.toString(16).padStart(16, '0'));
    }

    return blocks.join('');
  }

  private _compress(m: string, h: string, N: string): string {
    let K: string = this.L(this.P(this.S(hexXor(h, N))));
    let func: string = m;
    for (let i = 0; i < this.compressRounds; i++) {
      func = this.L(this.P(this.S(hexXor(K, func))));
      K = this.L(this.P(this.S(hexXor(K, C_LIST[i].toString(16).padStart(128, '0')))));
    }
    const res1: string = hexXor(K, func);
    const res2: string = hexXor(res1, h);
    return hexXor(res2, m);
  }

  public run(): string {
    while (this.M.length > 128) {
      const m: string = this.M.slice(-128);
      this.h = this._compress(m, this.h, this.N);
      this.M = this.M.slice(0, -128);
      this.N = hexXor(this.N, BigInt(512).toString(16).padStart(128, '0'));
    }
    this.h = this._compress(this.M, this.h, this.N);
    this.N = hexXor(this.N, BigInt(this.M_len).toString(16).padStart(128, '0'));
    this.total = this.M;
    this.h = this._compress(this.N, this.h, '0'.repeat(128));
    this.h = this._compress(this.total, this.h, '0'.repeat(128));
    return this.choice === '1' ? this.h : this.MSB(this.h);
  }
}
