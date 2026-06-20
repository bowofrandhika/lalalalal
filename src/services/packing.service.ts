/**
 * Packing Workflow Service — SIR 20 MES
 * Handles: Pallet CRUD + status transitions + audit log
 *
 * Status flow:
 * FILLING → WAITING_QC
 *   QC OK  → WAITING_STONE_WEIGHTING → UNDER_WEIGHTING → WAITING_FINAL_INSPECTION → READY_FG → RELEASED_FG
 *   QC Reject → REJECT → (treatment) → WAITING_STONE_WEIGHTING  or  WAITING_REPROCESS
 */

import supabase from '../lib/supabase';
import type { Pallet, PalletAuditLog, PalletCondition, PalletStatus, PalletTreatment } from '../types/database';

// ---------- helpers ----------

const now = () => new Date().toISOString();
const BALE_WEIGHT = 35;  // kg per bale
const PALLET_MAX  = 36;  // bale per pallet

async function logAudit(
  palletId: string,
  sessionId: string,
  action: string,
  oldStatus: PalletStatus | null,
  newStatus: PalletStatus,
  remarks: string | null,
  userName: string
): Promise<void> {
  const log: Omit<PalletAuditLog, 'id'> = {
    pallet_id: palletId,
    session_id: sessionId,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    remarks,
    performed_by: userName,
    performed_at: now(),
  };
  const { error } = await supabase.from('pallet_audit_log').insert(log);
  if (error) console.error('Audit log error:', error);
}

async function getCurrentUser(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.email ?? 'system';
}

async function generatePalletId(sessionId: string): Promise<string> {
  const { data } = await supabase
    .from('pallets')
    .select('pallet_id')
    .eq('production_session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1);
  const last = data?.[0]?.pallet_id ?? 'B0000';
  const num = parseInt(last.replace('B', '')) + 1;
  return `B${String(num).padStart(4, '0')}`;
}

// ---------- pallet CRUD ----------

export const palletService = {

  async getBySession(sessionId: string): Promise<Pallet[]> {
    const { data, error } = await supabase
      .from('pallets')
      .select('*')
      .eq('production_session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getByStatus(status: PalletStatus | PalletStatus[]): Promise<Pallet[]> {
    const statuses = Array.isArray(status) ? status : [status];
    const { data, error } = await supabase
      .from('pallets')
      .select('*')
      .in('status', statuses)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Pallet | null> {
    const { data, error } = await supabase
      .from('pallets')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(sessionId: string, lotNumber: string, baleQty: number, remarks: string | null): Promise<Pallet> {
    const user = await getCurrentUser();
    const palletId = await generatePalletId(sessionId);
    const weightKg = baleQty * BALE_WEIGHT;

    const { data, error } = await supabase
      .from('pallets')
      .insert({
        production_session_id: sessionId,
        lot_number: lotNumber,
        pallet_id: palletId,
        bale_qty: baleQty,
        weight_kg: weightKg,
        condition: null,
        status: 'FILLING' as PalletStatus,
        treatment: null,
        remarks,
        weighting_start: null,
        weighting_end: null,
        plastic_condition: null,
        pallet_condition: null,
        released_by: null,
        released_at: null,
        reprocess_reason: null,
        reprocess_date: null,
        created_at: now(),
        updated_at: now(),
      })
      .select()
      .single();
    if (error) throw error;

    await logAudit(data.id, sessionId, 'Create Pallet', null, 'FILLING', remarks, user);
    return data;
  },

  async updateFilling(id: string, baleQty: number, remarks: string | null): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('pallets')
      .update({ bale_qty: baleQty, weight_kg: baleQty * BALE_WEIGHT, remarks, updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, 'Update Filling', pallet.status, pallet.status, remarks, user);
    return data;
  },

  // Operator closes pallet → moves to Waiting QC
  async closePallet(id: string, remarks: string | null): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('pallets')
      .update({ status: 'WAITING_QC', remarks, updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, 'Close Pallet → Waiting QC', 'FILLING', 'WAITING_QC', remarks, user);
    return data;
  },

  // QC sets condition
  async qcInspect(id: string, condition: PalletCondition, remarks: string | null): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();

    const newStatus: PalletStatus = condition === 'OK' ? 'WAITING_STONE_WEIGHTING' : 'REJECT';
    const action = condition === 'OK' ? 'QC Pass → Waiting Stone Weighting' : `QC Reject (${condition})`;

    const { data, error } = await supabase
      .from('pallets')
      .update({ condition, status: newStatus, remarks, updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, action, 'WAITING_QC', newStatus, remarks, user);
    return data;
  },

  // QC / Supervisor assigns treatment to reject pallet
  async applyTreatment(id: string, treatment: PalletTreatment, remarks: string | null): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();

    const statusMap: Record<PalletTreatment, PalletStatus> = {
      RE_CHECK: 'RE_CHECK',
      QUARANTINE: 'QUARANTINE',
      RE_WORK: 'RE_WORK',
    };
    const newStatus = statusMap[treatment];

    const { data, error } = await supabase
      .from('pallets')
      .update({ treatment, status: newStatus, remarks, updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, `Apply Treatment: ${treatment}`, pallet.status, newStatus, remarks, user);
    return data;
  },

  // After treatment — pass or fail decision
  async treatmentResult(id: string, passed: boolean, remarks: string | null): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();

    const newStatus: PalletStatus = passed ? 'WAITING_STONE_WEIGHTING' : 'WAITING_REPROCESS';
    const action = passed ? 'Treatment Pass → Waiting Stone Weighting' : 'Treatment Fail → Waiting Reprocess';

    const { data, error } = await supabase
      .from('pallets')
      .update({ status: newStatus, remarks, updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, action, pallet.status, newStatus, remarks, user);
    return data;
  },

  // Stone weighting — start
  async startWeighting(id: string): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();
    const weightingStart = now();
    const { data, error } = await supabase
      .from('pallets')
      .update({ status: 'UNDER_WEIGHTING', weighting_start: weightingStart, updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, 'Stone Weighting Start', 'WAITING_STONE_WEIGHTING', 'UNDER_WEIGHTING', null, user);
    return data;
  },

  // Stone weighting — complete → Final Inspection
  async completeWeighting(id: string): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();
    const weightingEnd = now();
    const { data, error } = await supabase
      .from('pallets')
      .update({ status: 'WAITING_FINAL_INSPECTION', weighting_end: weightingEnd, updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, 'Stone Weighting Complete → Final Inspection', 'UNDER_WEIGHTING', 'WAITING_FINAL_INSPECTION', null, user);
    return data;
  },

  // Final Inspection
  async finalInspect(id: string, plasticOk: boolean, palletOk: boolean, remarks: string | null): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();

    const allOk = plasticOk && palletOk;
    const newStatus: PalletStatus = allOk ? 'READY_FG' : 'REJECT';
    const plasticCondition = plasticOk ? 'OK' : 'DAMAGED';
    const palletCondition = palletOk ? 'OK' : 'DAMAGED';
    const action = allOk ? 'Final Inspection Pass → Ready FG' : 'Final Inspection Fail → Hold (Reject)';

    const { data, error } = await supabase
      .from('pallets')
      .update({ status: newStatus, plastic_condition: plasticCondition, pallet_condition: palletCondition, remarks, updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, action, 'WAITING_FINAL_INSPECTION', newStatus, remarks, user);
    return data;
  },

  // Release to Finished Good
  async releaseFG(id: string, remarks: string | null): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();
    const releasedAt = now();
    const { data, error } = await supabase
      .from('pallets')
      .update({ status: 'RELEASED_FG', released_by: user, released_at: releasedAt, remarks, updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, 'Released to Finished Good', 'READY_FG', 'RELEASED_FG', remarks, user);
    return data;
  },

  // Send to Reprocess
  async sendToReprocess(id: string, reason: string): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('pallets')
      .update({ status: 'WAITING_REPROCESS', reprocess_reason: reason, reprocess_date: now(), updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, 'Sent to Reprocess', pallet.status, 'WAITING_REPROCESS', reason, user);
    return data;
  },

  async confirmReprocessed(id: string): Promise<Pallet> {
    const pallet = await this.getById(id);
    if (!pallet) throw new Error('Pallet not found');
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('pallets')
      .update({ status: 'REPROCESSED', updated_at: now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(id, pallet.production_session_id, 'Reprocessed', 'WAITING_REPROCESS', 'REPROCESSED', null, user);
    return data;
  },

  async getAuditLog(palletId: string): Promise<PalletAuditLog[]> {
    const { data, error } = await supabase
      .from('pallet_audit_log')
      .select('*')
      .eq('pallet_id', palletId)
      .order('performed_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getSessionSummary(sessionId: string): Promise<Record<PalletStatus, number>> {
    const pallets = await this.getBySession(sessionId);
    return pallets.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<PalletStatus, number>);
  },
};
