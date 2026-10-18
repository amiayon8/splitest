export interface PersonBalance {
  id: string;
  name: string;
  avatarUrl?: string;
  netAmount: number;
}

export interface SimplifiedPayment {
  fromId: string;
  fromName: string;
  fromAvatar?: string;
  toId: string;
  toName: string;
  toAvatar?: string;
  amount: number;
  currencyCode: string;
}

export function simplifyDebts(
  balances: Record<string, { name: string; avatarUrl?: string; netAmount: number }>,
  currencyCode: string = 'USD'
): SimplifiedPayment[] {
  const creditors: { id: string; name: string; avatarUrl?: string; amount: number }[] = [];
  const debtors: { id: string; name: string; avatarUrl?: string; amount: number }[] = [];

  for (const [id, person] of Object.entries(balances)) {
    const rounded = Math.round(person.netAmount * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ id, name: person.name, avatarUrl: person.avatarUrl, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ id, name: person.name, avatarUrl: person.avatarUrl, amount: Math.abs(rounded) });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const payments: SimplifiedPayment[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0.01) {
      payments.push({
        fromId: debtor.id,
        fromName: debtor.name,
        fromAvatar: debtor.avatarUrl,
        toId: creditor.id,
        toName: creditor.name,
        toAvatar: creditor.avatarUrl,
        amount: Math.round(settledAmount * 100) / 100,
        currencyCode,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount < 0.01) {
      i++;
    }
    if (creditor.amount < 0.01) {
      j++;
    }
  }

  return payments;
}
