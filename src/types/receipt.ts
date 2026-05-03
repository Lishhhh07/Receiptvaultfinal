export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Receipt {
  store_name: string;
  purchase_date: string | null;
  total_amount: number;
  currency: string;
  items: ReceiptItem[];
  return_deadline_days: number | null;
  warranty_period_days: number | null;
  payment_method: string | null;
  raw_text: string;
  date_inferred: boolean;
}

export interface RawGeminiReceipt {
  store_name?: string;
  purchase_date?: string | null;
  total_amount?: number;
  currency?: string;
  items?: Array<{
    name?: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
  }>;
  return_deadline_days?: number | null;
  warranty_period_days?: number | null;
  payment_method?: string | null;
  raw_text?: string;
}
