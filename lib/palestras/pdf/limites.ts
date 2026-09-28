/**
 * Teto de colaboradores por operação de PDF em lote.
 *
 * Cada PDF custa algumas centenas de milissegundos para montar. O limite vem
 * do teto de execução da função na Vercel, não de memória: o `.zip` é
 * transmitido em streaming, então o arquivo inteiro nunca fica na memória.
 * Acima disso, a saída é dividir por loja — que é como a operação já pensa.
 */
export const LIMITE_POR_LOTE = 60;
