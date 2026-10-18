import { Expense, Settlement, SimplifiedDebt, MemberBalanceSummary, CategoryBreakdownItem } from '@/types';

export function calculateMemberBalances(
  members: string[],
  expenses: Expense[],
  settlements: Settlement[]
): Record<string, MemberBalanceSummary> {
  const summaries: Record<string, MemberBalanceSummary> = {};

  for (const member of members) {
    summaries[member] = {
      memberName: member,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0,
    };
  }

  for (const expense of expenses) {
    if (!summaries[expense.paidByName]) {
      summaries[expense.paidByName] = {
        memberName: expense.paidByName,
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
      };
    }
    summaries[expense.paidByName].totalPaid += Number(expense.amount);

    for (const split of expense.splits) {
      if (!summaries[split.memberName]) {
        summaries[split.memberName] = {
          memberName: split.memberName,
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0,
        };
      }
      summaries[split.memberName].totalOwed += Number(split.shareAmount);
    }
  }

  for (const settlement of settlements) {
    if (summaries[settlement.payerName]) {
      summaries[settlement.payerName].totalPaid += Number(settlement.amount);
    }
    if (summaries[settlement.recipientName]) {
      summaries[settlement.recipientName].totalOwed += Number(settlement.amount);
    }
  }

  for (const key of Object.keys(summaries)) {
    summaries[key].netBalance = Math.round((summaries[key].totalPaid - summaries[key].totalOwed) * 100) / 100;
  }

  return summaries;
}

export function calculateSimplifiedDebts(
  memberBalances: Record<string, MemberBalanceSummary>
): SimplifiedDebt[] {
  const debtors: { name: string; balance: number }[] = [];
  const creditors: { name: string; balance: number }[] = [];

  for (const member of Object.values(memberBalances)) {
    const rounded = Math.round(member.netBalance * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ name: member.memberName, balance: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ name: member.memberName, balance: });
    }
  }

  debtors.sort((first, second) => second.balance - first.balance);
  creditors.sort((first, second) => second.balance - first.balance);

  const transactions: SimplifiedDebt[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const settlementAmount = Math.min(debtor.balance, creditor.balance);

    if (settlementAmount > 0.01) {
      transactions.push({
        debtor: debtor.name,
        creditor: creditor.name,
        amount: Math.round(settlementAmount * 100) / 100,
      });
    }

    debtor.balance = Math.round((debtor.balance - settlementAmount) * 100) / 100;
    creditor.balance = Math.round((creditor.balance - settlementAmount) * 100) / 100;

    if (debtor.balance <= 0.01) {
      debtorIndex++;
    }
    if (creditor.balance <= 0.01) {
      creditorIndex++;
    }
  }

  return transactions;
}

export function calculateDirectDebts(
  expenses: Expense[],
  settlements: Settlement[]
): SimplifiedDebt[] {
  const pairwiseNet: Record<string, Record<string, number>> = {};

  function ensurePair(personA: string, personB: string) {
    if (!pairwiseNet[personA]) pairwiseNet[personA] = {};
    if (!pairwiseNet[personB]) pairwiseNet[personB] = {};
    if (pairwiseNet[personA][personB] === undefined) pairwiseNet[personA][personB] = 0;
    if (pairwiseNet[personB][personA] === undefined) pairwiseNet[personB][personA] = 0;
  }

  for (const expense of expenses) {
    const payer = expense.paidByName;
    for (const split of expense.splits) {
      const debtor = split.memberName;
      if (debtor === payer) continue;
      ensurePair(debtor, payer);
      pairwiseNet[debtor][payer] += Number(split.shareAmount);
    }
  }

  for (const settlement of settlements) {
    const payer = settlement.payerName;
    const recipient = settlement.recipientName;
    ensurePair(payer, recipient);
    pairwiseNet[payer][recipient] -= Number(settlement.amount);
  }

  const recordedPairs = new Set<string>();
  const results: SimplifiedDebt[] = [];

  for (const personA of Object.keys(pairwiseNet)) {
    for (const personB of Object.keys(pairwiseNet[personA])) {
      if (personA === personB) continue;
      const key = [personA, personB].sort().join(':::');
      if (recordedPairs.has(key)) continue;
      recordedPairs.add(key);

      const netAtoB = (pairwiseNet[personA]?.[personB] || 0) - (pairwiseNet[personB]?.[personA] || 0);
      const rounded = Math.round(netAtoB * 100) / 100;

      if (rounded > 0.01) {
        results.push({
          debtor: personA,
          creditor: personB,
          amount: rounded,
        });
      } else if (rounded < -0.01) {
        results.push({
          debtor: personB,
          creditor: personA,
          amount: Math.abs(rounded),
        });
      }
    }
  }

  return results;
}

export function calculateCategoryBreakdown(expenses: Expense[]): CategoryBreakdownItem[] {
  const categoryTotals: Record<string, number> = {
    villa: 0,
    dining: 0,
    transport: 0,
    activities: 0,
    groceries: 0,
    general: 0,
  };

  const categoryColors: Record<string, string> = {
    villa: '#006948',
    dining: '#e21e49',
    transport: '#4d5d73',
    activities: '#85f8c4',
    groceries: '#d4af37',
    general: '#6d7a72',
  };

  let totalSpent = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    totalSpent += amount;
    const category = expense.category in categoryTotals ? expense.category : 'general';
    categoryTotals[category] += amount;
  }

  if (totalSpent === 0) {
    return [];
  }

  return Object.entries(categoryTotals)
    .filter(([, total]) => total > 0)
    .map(([category, total]) => ({
      category,
      total: Math.round(total * 100) / 100,
      percentage: Math.round((total / totalSpent) * 100),
      color: categoryColors[category] || '#6d7a72',
    }))
    .sort((first, second) => second.total - first.total);
}

export function formatCurrency(amount: number): string {
  const absoluteValue = Math.abs(amount).toFixed(2);
  if (amount < 0) {
    return `-$${absoluteValue}`;
  }
  if (amount > 0) {
    return `+$${absoluteValue}`;
  }
  return `$0.00`;
}

export function formatAbsoluteCurrency(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}
