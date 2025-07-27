// import { split, combine } from 'shamirs-secret-sharing';

// /**
//  * Разбивает секрет на sharesCount фрагментов с порогом threshold.
//  * @param secret — Buffer или строка
//  * @param sharesCount — общее число долей n
//  * @param threshold — порог k (минимум долей для восстановления)
//  */
// export function splitSecret(
//   secret: Buffer | string,
//   sharesCount: number,
//   threshold: number
// ): Buffer[] {
//   const buf = typeof secret === 'string'
//     ? Buffer.from(secret, 'utf8')
//     : secret;
//   return split(buf, { shares: sharesCount, threshold });
// }

// /**
//  * Собирает секрет обратно из переданных фрагментов.
//  * @param shares — массив фрагментов (Buffer[])
//  */
// export function combineSecret(shares: Buffer[]): Buffer {
//   return combine(shares);
// }