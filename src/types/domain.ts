export type UserRow = {
  id: string;
  phone: string;
};

export type ReceiptRow = {
  id: string;
  user_id: string;
  merchant: string;
  receipt_date: string;
  expiry_date: string | null;
  total_amount: number;
  alert_sent_at: string | null;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  name: string;
  renewal_date: string;
  amount: number;
  billing_cycle: string;
  is_active: boolean;
  user_decision: string | null;
  alert_sent_at: string | null;
};

export type EmailScanState = {
  processedIds: string[];
};
