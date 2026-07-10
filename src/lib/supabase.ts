import { createClient } from '@supabase/supabase-js';
import { Item, Customer, Supplier, Transaction, UserAccount } from '../types';

// Read Supabase environment variables statically so Vite can replace them at build-time
// @ts-ignore
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mqtgpwnzudfsmsntgzfx.supabase.co';
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qAfb-0kfXcix6tYgWAuNmg_318HAiys';

// Auto-parse the project ref if URL is not supplied but the new publishable key format is used
if (!supabaseUrl && supabaseAnonKey && supabaseAnonKey.startsWith('sb_publishable_')) {
  try {
    const parts = supabaseAnonKey.split('_');
    if (parts.length >= 3) {
      const projectRef = parts[2];
      if (projectRef && projectRef.trim().length > 0) {
        supabaseUrl = `https://${projectRef.trim().toLowerCase()}.supabase.co`;
      }
    }
  } catch (e) {
    console.error('Failed to parse Supabase URL from publishable key:', e);
  }
}

// Initialize client only if variables are available to prevent runtime app crashes
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

/**
 * Saves/updates user account details in Supabase
 */
export async function dbSaveUserAccount(user: UserAccount): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('user_accounts')
      .upsert({
        email: user.email.toLowerCase().trim(),
        full_name: user.fullName,
        company_name: user.companyName,
        country_region: user.countryRegion,
        phone: user.phone || ''
      }, { onConflict: 'email' });

    if (error) {
      console.error('Error saving user account to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to run dbSaveUserAccount:', err);
    return false;
  }
}

/**
 * Fetches user account details by email
 */
export async function dbGetUserAccount(email: string): Promise<UserAccount | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      email: data.email,
      fullName: data.full_name,
      companyName: data.company_name,
      countryRegion: data.country_region,
      phone: data.phone || ''
    };
  } catch (err) {
    console.error('Failed to run dbGetUserAccount:', err);
    return null;
  }
}

/**
 * Fetches all registered user accounts from Supabase (Admin function)
 */
export async function dbGetAllUserAccounts(): Promise<UserAccount[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching all user accounts:', error);
      return [];
    }

    return data.map((row: any) => ({
      email: row.email,
      fullName: row.full_name,
      companyName: row.company_name,
      countryRegion: row.country_region,
      phone: row.phone || ''
    }));
  } catch (err) {
    console.error('Failed to run dbGetAllUserAccounts:', err);
    return [];
  }
}

/**
 * Pushes entire local state up to Supabase for a specific user
 */
export async function dbSyncUpAllData(
  email: string,
  items: Item[],
  customers: Customer[],
  suppliers: Supplier[],
  transactions: Transaction[]
): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'قاعدة بيانات Supabase غير مهيأة بعد.' };
  }

  const userEmail = email.toLowerCase().trim();

  try {
    // 1. Sync Items
    // Delete existing items for user
    await supabase.from('inventory_items').delete().eq('user_email', userEmail);
    
    // Insert new items if any
    if (items.length > 0) {
      // Deduplicate items on the fly by ID to prevent inserting duplicates in the same batch
      const uniqueItemsMap = new Map<string, Item>();
      items.forEach(item => {
        if (item && item.id) {
          uniqueItemsMap.set(item.id, item);
        }
      });
      const uniqueItems = Array.from(uniqueItemsMap.values());

      const itemsToInsert = uniqueItems.map(item => ({
        id: item.id,
        user_email: userEmail,
        name: item.name,
        code: item.code || '',
        price: item.salePrice,
        cost: item.unitCost,
        quantity: item.stock,
        unit: item.unit,
        category: ''
      }));

      const { error: itemErr } = await supabase.from('inventory_items').insert(itemsToInsert);
      if (itemErr) throw new Error(`Item sync error: ${itemErr.message}`);
    }

    // 2. Sync Parties (Customers & Suppliers)
    await supabase.from('parties').delete().eq('user_email', userEmail);

    const uniquePartiesMap = new Map<string, any>();
    
    customers.forEach(cust => {
      if (cust && cust.id) {
        uniquePartiesMap.set(cust.id, {
          id: cust.id,
          user_email: userEmail,
          name: cust.name,
          type: 'customer',
          phone: cust.phone || '',
          email: '',
          address: '',
          balance: cust.balance
        });
      }
    });

    suppliers.forEach(supp => {
      if (supp && supp.id) {
        uniquePartiesMap.set(supp.id, {
          id: supp.id,
          user_email: userEmail,
          name: supp.name,
          type: 'supplier',
          phone: supp.phone || '',
          email: '',
          address: '',
          balance: supp.balance
        });
      }
    });

    const partiesToInsert = Array.from(uniquePartiesMap.values());

    if (partiesToInsert.length > 0) {
      const { error: partyErr } = await supabase.from('parties').insert(partiesToInsert);
      if (partyErr) throw new Error(`Parties sync error: ${partyErr.message}`);
    }

    // 3. Sync Transactions
    await supabase.from('transactions').delete().eq('user_email', userEmail);

    if (transactions.length > 0) {
      const uniqueTransactionsMap = new Map<string, Transaction>();
      transactions.forEach(tx => {
        if (tx && tx.id) {
          uniqueTransactionsMap.set(tx.id, tx);
        }
      });
      const uniqueTransactions = Array.from(uniqueTransactionsMap.values());

      const txsToInsert = uniqueTransactions.map(tx => ({
        id: tx.id,
        user_email: userEmail,
        type: tx.type,
        invoice_number: tx.invoiceNumber || '',
        date: tx.date,
        party_id: tx.partyId || null,
        party_name: tx.partyName || '',
        amount: tx.amount,
        discount: tx.discount || 0,
        cash_paid: tx.cashPaid || 0,
        notes: tx.details || '', // Local uses details or notes? Check types.ts
        items: tx.items || []
      }));

      const { error: txErr } = await supabase.from('transactions').insert(txsToInsert);
      if (txErr) throw new Error(`Transactions sync error: ${txErr.message}`);
    }

    return { success: true, message: 'تمت مزامنة جميع البيانات السحابية بنجاح!' };
  } catch (err: any) {
    console.error('Error syncing up data to Supabase:', err);
    return { success: false, message: err.message || 'فشلت عملية المزامنة السحابية.' };
  }
}

/**
 * Pulls entire cloud state from Supabase for a specific user
 */
export async function dbSyncDownAllData(email: string): Promise<{
  success: boolean;
  data?: {
    items: Item[];
    customers: Customer[];
    suppliers: Supplier[];
    transactions: Transaction[];
  };
  message: string;
}> {
  if (!supabase) {
    return { success: false, message: 'قاعدة بيانات Supabase غير مهيأة بعد.' };
  }

  const userEmail = email.toLowerCase().trim();

  try {
    // 1. Fetch Items
    const { data: dbItems, error: itemsErr } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_email', userEmail);

    if (itemsErr) throw new Error(`Fetch items error: ${itemsErr.message}`);

    const items: Item[] = (dbItems || []).map(row => ({
      id: row.id,
      code: row.code || '',
      name: row.name,
      stock: Number(row.quantity),
      unit: row.unit,
      unitCost: Number(row.cost),
      salePrice: Number(row.price),
      currency: 'USD',
      lastPurchasePrice: Number(row.cost)
    }));

    // 2. Fetch Parties (Customers & Suppliers)
    const { data: dbParties, error: partiesErr } = await supabase
      .from('parties')
      .select('*')
      .eq('user_email', userEmail);

    if (partiesErr) throw new Error(`Fetch parties error: ${partiesErr.message}`);

    const customers: Customer[] = [];
    const suppliers: Supplier[] = [];

    (dbParties || []).forEach(row => {
      const party = {
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        balance: Number(row.balance)
      };

      if (row.type === 'customer') {
        customers.push(party);
      } else {
        suppliers.push(party);
      }
    });

    // 3. Fetch Transactions
    const { data: dbTxs, error: txsErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_email', userEmail);

    if (txsErr) throw new Error(`Fetch transactions error: ${txsErr.message}`);

    const transactions: Transaction[] = (dbTxs || []).map(row => ({
      id: row.id,
      invoiceNumber: row.invoice_number || undefined,
      date: row.date,
      type: row.type as any,
      partyId: row.party_id || undefined,
      partyName: row.party_name || undefined,
      amount: Number(row.amount),
      discount: Number(row.discount),
      cashPaid: Number(row.cash_paid),
      creditAmount: Number(row.amount) - Number(row.cash_paid) - Number(row.discount),
      details: row.notes || '',
      items: row.items || []
    }));

    // Sort transactions by date ascending/descending depending on layout
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      success: true,
      data: { items, customers, suppliers, transactions },
      message: 'تم جلب البيانات السحابية بنجاح!'
    };
  } catch (err: any) {
    console.error('Error syncing down data from Supabase:', err);
    return { success: false, message: err.message || 'فشلت عملية استيراد البيانات.' };
  }
}
