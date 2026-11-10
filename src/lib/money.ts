/**
 * Dinheiro e quantidades.
 *
 * REGRA DO PROJETO: nunca use `number` em cálculos financeiros.
 * `number` é ponto flutuante binário: 0.1 + 0.2 === 0.30000000000000004.
 * `Decimal` faz conta em base 10, exatamente como fazemos no papel.
 *
 * Arredondamos para centavos SOMENTE na exibição (funções `format*`).
 */

import DecimalJs from "decimal.js";

const D = DecimalJs.clone({
  precision: 40, // dígitos significativos nas contas intermediárias
  rounding: DecimalJs.ROUND_HALF_UP, // 2,345 → 2,35 (o arredondamento "de escola")
});

export { D as Decimal };
export type Decimal = InstanceType<typeof D>;

/** Valores aceitos para criar um Decimal. Aceite string vinda do banco. */
export type DecimalInput = Decimal | string | number;

export function toDecimal(value: DecimalInput): Decimal {
  return new D(value);
}

export const ZERO: Decimal = new D(0);

/** Soma uma lista de Decimals. */
export function sum(values: readonly Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), ZERO);
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 1234.5 → "R$ 1.234,50" */
export function formatBRL(value: Decimal): string {
  // Arredondamos em Decimal e só então convertemos para number.
  // Com 2 casas, a conversão é exata o suficiente para exibir.
  return brl.format(value.toDecimalPlaces(2).toNumber());
}

const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Recebe uma FRAÇÃO: 0.1234 → "12,34%" */
export function formatPercent(fraction: Decimal): string {
  return percent.format(fraction.toDecimalPlaces(4).toNumber());
}

/** Quantidade de cotas: 100 → "100", 0.5 → "0,5" (até 8 casas). */
export function formatQuantity(value: Decimal): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(
    value.toDecimalPlaces(8).toNumber(),
  );
}
