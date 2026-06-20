import supabase from '../lib/supabase';
import type {
  WorkOrder, ProductionSession,
  PreProductionChecklistItemV2,
  ProductionLogSession, ProductionMaterialId,
  ProductionProcessFlow, ProductionFuel,
  WoCompletionNotification
} from '../types/database';

const BALE_WEIGHT = 35;
const BALE_PER_PALLET = 36;

export function calcTotalWeight(bale: number, pallet: number): number {
  return (bale + pallet * BALE_PER_PALLET) * BALE_WEIGHT;
}

export const workOrderService = {
  async getAll(filters?: { status?: string; date?: string }): Promise<WorkOrder[]> {
    let query = supabase
      .from('work_orders')
      .select('*, buyers(buyer_name, buyer_code, buyer_code_short), products(product_name)')
      .order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.date) query = query.eq('wo_date', filters.date);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<WorkOrder | null> {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*, buyers(*), products(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(wo: Omit<WorkOrder, 'id' | 'created_at' | 'updated_at'>): Promise<WorkOrder> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('work_orders')
      .insert({ ...wo, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, wo: Partial<WorkOrder>): Promise<WorkOrder> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('work_orders')
      .update({ ...wo, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('work_orders').delete().eq('id', id);
    if (error) throw error;
  },

  // Format: PBS.WO.DDMMYY.BUY.0001
  async generateWONumber(deadlineDate: string, buyerCode: string): Promise<string> {
    const d = new Date(deadlineDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;
    const buyer = (buyerCode || 'XXX').substring(0, 3).toUpperCase();
    const prefix = `PBS.WO.${dateStr}.${buyer}.`;

    const { data } = await supabase
      .from('work_orders')
      .select('wo_number')
      .like('wo_number', `${prefix}%`)
      .order('wo_number', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (data && data.length > 0) {
      const last = data[0].wo_number;
      const lastSeq = parseInt(last.split('.').pop() || '0');
      sequence = lastSeq + 1;
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
  },

  async confirmCompletion(woId: string, confirmedBy: string): Promise<void> {
    await supabase.from('work_orders').update({
      status: 'COMPLETED',
      completion_confirmed_at: new Date().toISOString(),
      completion_confirmed_by: confirmedBy,
      actual_end_date: new Date().toISOString()
    }).eq('id', woId);
    await supabase.from('wo_completion_notifications').update({
      confirmed_at: new Date().toISOString(),
      confirmed_by: confirmedBy,
      is_read: true
    }).eq('work_order_id', woId).is('confirmed_at', null);
  }
};

export const productionSessionService = {
  async getAll(filters?: { status?: string; date?: string }): Promise<ProductionSession[]> {
    let query = supabase
      .from('production_sessions')
      .select('*, work_orders(wo_number, buyer_id, buyers(buyer_name)), buyers(buyer_name)')
      .order('session_date', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.date) query = query.eq('session_date', filters.date);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<ProductionSession | null> {
    const { data, error } = await supabase
      .from('production_sessions')
      .select('*, work_orders(*, buyers(*)), buyers(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(session: Omit<ProductionSession, 'id' | 'created_at' | 'updated_at'>): Promise<ProductionSession> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('production_sessions')
      .insert({ ...session, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, session: Partial<ProductionSession>): Promise<ProductionSession> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('production_sessions')
      .update({ ...session, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('production_sessions').delete().eq('id', id);
    if (error) throw error;
  },

  // Format: PBS.DP.DDMMYY.SHIFT.LINE.0001
  async generateSessionNumber(date: string, shift: string, line: string): Promise<string> {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;
    const shiftCode = shift === 'Morning' ? '1' : '2';
    const lineCode = line.replace('Line ', '').toUpperCase();
    const prefix = `PBS.DP.${dateStr}.${shiftCode}.${lineCode}.`;

    const { data } = await supabase
      .from('production_sessions')
      .select('session_number')
      .like('session_number', `${prefix}%`)
      .order('session_number', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (data && data.length > 0) {
      const last = data[0].session_number;
      const lastSeq = parseInt(last.split('.').pop() || '0');
      sequence = lastSeq + 1;
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
  },

  async activate(id: string): Promise<ProductionSession> {
    return this.update(id, { status: 'ACTIVE' });
  },

  async complete(id: string): Promise<ProductionSession> {
    return this.update(id, { status: 'COMPLETED' });
  },

  async updateCompletedKg(sessionId: string, kg: number): Promise<void> {
    const { data: session } = await supabase
      .from('production_sessions')
      .update({ completed_kg: kg })
      .eq('id', sessionId)
      .select('work_order_id, target_kg')
      .single();

    if (session?.work_order_id) {
      const { data: sessions } = await supabase
        .from('production_sessions')
        .select('completed_kg')
        .eq('work_order_id', session.work_order_id);

      const totalKg = (sessions || []).reduce((s, r) => s + (r.completed_kg || 0), 0);

      const { data: wo } = await supabase
        .from('work_orders')
        .select('qty_kg, status, completion_notified_at')
        .eq('id', session.work_order_id)
        .single();

      await supabase.from('work_orders')
        .update({ completed_qty: Math.round(totalKg) })
        .eq('id', session.work_order_id);

      if (wo && totalKg >= wo.qty_kg && wo.status === 'ACTIVE' && !wo.completion_notified_at) {
        await supabase.from('work_orders').update({
          completion_notified_at: new Date().toISOString()
        }).eq('id', session.work_order_id);
        await supabase.from('wo_completion_notifications').insert({
          work_order_id: session.work_order_id,
          session_id: sessionId,
          total_kg: totalKg
        });
      }
    }
  }
};

export const checklistV2Service = {
  DEFAULT_ITEMS: [
    'Shredder Cleanlines',
    'Magnet Trap',
    'Filling Station',
    'Dryer Condition',
    'Bench Scale',
    'Press Machine',
    'Metal Detector',
    'Work Area',
    'Work tools',
    'Supporting Supplies'
  ],

  async getBySession(sessionId: string): Promise<PreProductionChecklistItemV2[]> {
    const { data, error } = await supabase
      .from('pre_production_checklist_items_v2')
      .select('*')
      .eq('session_id', sessionId)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  },

  async initForSession(sessionId: string): Promise<PreProductionChecklistItemV2[]> {
    const existing = await this.getBySession(sessionId);
    if (existing.length > 0) return existing;

    const items = this.DEFAULT_ITEMS.map((name, i) => ({
      session_id: sessionId,
      item_name: name,
      sort_order: i
    }));
    const { data, error } = await supabase
      .from('pre_production_checklist_items_v2')
      .insert(items)
      .select();
    if (error) throw error;
    return data || [];
  },

  async update(id: string, updates: Partial<PreProductionChecklistItemV2>): Promise<PreProductionChecklistItemV2> {
    const { data, error } = await supabase
      .from('pre_production_checklist_items_v2')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const productionLogSessionService = {
  async getBySession(sessionId: string): Promise<ProductionLogSession | null> {
    const { data, error } = await supabase
      .from('production_log_sessions')
      .select('*, app_users(full_name)')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(sessionId: string, payload: Partial<ProductionLogSession>): Promise<ProductionLogSession> {
    const existing = await this.getBySession(sessionId);
    if (existing) {
      const { data, error } = await supabase
        .from('production_log_sessions')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase
      .from('production_log_sessions')
      .insert({ session_id: sessionId, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const productionMaterialService = {
  async getBySession(sessionId: string): Promise<ProductionMaterialId | null> {
    const { data, error } = await supabase
      .from('production_material_id')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(sessionId: string, payload: Partial<ProductionMaterialId>): Promise<ProductionMaterialId> {
    const existing = await this.getBySession(sessionId);
    if (existing) {
      const { data, error } = await supabase
        .from('production_material_id')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase
      .from('production_material_id')
      .insert({ session_id: sessionId, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const productionProcessFlowService = {
  async getBySession(sessionId: string): Promise<ProductionProcessFlow | null> {
    const { data, error } = await supabase
      .from('production_process_flow')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(sessionId: string, payload: Partial<ProductionProcessFlow>): Promise<ProductionProcessFlow> {
    const existing = await this.getBySession(sessionId);
    if (existing) {
      const { data, error } = await supabase
        .from('production_process_flow')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const totalKg = calcTotalWeight(data.bale_qty, data.pallet_qty);
        await productionSessionService.updateCompletedKg(sessionId, totalKg);
      }
      return data;
    }
    const { data, error } = await supabase
      .from('production_process_flow')
      .insert({ session_id: sessionId, ...payload })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const totalKg = calcTotalWeight(data.bale_qty, data.pallet_qty);
      await productionSessionService.updateCompletedKg(sessionId, totalKg);
    }
    return data;
  }
};

export const productionFuelService = {
  async getBySession(sessionId: string): Promise<ProductionFuel | null> {
    const { data, error } = await supabase
      .from('production_fuel')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(sessionId: string, payload: Partial<ProductionFuel>): Promise<ProductionFuel> {
    const existing = await this.getBySession(sessionId);
    if (existing) {
      const { data, error } = await supabase
        .from('production_fuel')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase
      .from('production_fuel')
      .insert({ session_id: sessionId, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const woNotificationService = {
  async getPending(): Promise<WoCompletionNotification[]> {
    const { data, error } = await supabase
      .from('wo_completion_notifications')
      .select('*, work_orders(wo_number, qty_kg)')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAll(): Promise<WoCompletionNotification[]> {
    const { data, error } = await supabase
      .from('wo_completion_notifications')
      .select('*, work_orders(wo_number, qty_kg)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
