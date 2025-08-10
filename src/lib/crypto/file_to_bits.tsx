import { promises as fs } from 'fs';

/**
 * Читает файл по пути и возвращает его содержимое в виде строки бит,
 * например "01010111…", для передачи в HashCalculator('256', 'bin', bits).
 *
 * @param filePath — путь к файлу
 * @returns Promise<string> со всеми битами файла
 */
export async function fileToBitString(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  // Преобразуем каждый байт в 8-битную строку и конкатенируем
  return data.reduce((bitStr, byte) =>
    bitStr + byte.toString(2).padStart(8, '0')
  , '');
}