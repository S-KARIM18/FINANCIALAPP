/**
 * Wallet Store — Zustand
 *
 * Manages wallet balance and transaction list state.
 */
import { create } from 'zustand';
import * as transactionApi from '../services/transaction.api';
import * as userApi from '../services/user.api';
import { TransactionRaw, Account } from '../types';

interface WalletState {
  account: Account | null;
  transactions: TransactionRaw[];
  isLoadingBalance: boolean;
  isLoadingTransactions: boolean;
  balanceVisible: boolean;
  error: string | null;

  // Actions
  fetchBalance: () => Promise<void>;
  fetchTransactions: (filter?: 'sent' | 'received' | 'pending' | 'failed') => Promise<void>;
  toggleBalanceVisibility: () => void;
  addTransaction: (tx: TransactionRaw) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  account: null,
  transactions: [],
  isLoadingBalance: false,
  isLoadingTransactions: false,
  balanceVisible: true,
  error: null,

  fetchBalance: async () => {
    set({ isLoadingBalance: true, error: null });
    try {
      const account = await userApi.getMyAccount();
      set({ account, isLoadingBalance: false });
    } catch (err: unknown) {
      set({
        error: 'Failed to load balance',
        isLoadingBalance: false,
      });
    }
  },

  fetchTransactions: async (filter) => {
    set({ isLoadingTransactions: true, error: null });
    try {
      const transactions = await transactionApi.listTransactions(filter);
      set({ transactions, isLoadingTransactions: false });
    } catch {
      set({ error: 'Failed to load transactions', isLoadingTransactions: false });
    }
  },

  toggleBalanceVisibility: () => {
    set((state) => ({ balanceVisible: !state.balanceVisible }));
  },

  addTransaction: (tx) => {
    set((state) => ({
      transactions: [tx, ...state.transactions],
    }));
  },

  reset: () => {
    set({
      account: null,
      transactions: [],
      isLoadingBalance: false,
      isLoadingTransactions: false,
      error: null,
    });
  },
}));
