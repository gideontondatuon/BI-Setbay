export type Tx = {
  id?: number;
  source: string;
  transaction_date: string;
  transaction_type: string;
  money_type: string;
  bank_name: string;
  branch_name: string;
  denom: string;
  pieces: number;
  amount: number;
  inflow: number;
  outflow: number;
  netflow: number;
};
