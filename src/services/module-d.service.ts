import supabase from '../lib/supabase';
import type {
  PalletTracking, PackingRecord,
  PalletWorkflowStatus, PalletQCCondition, PalletTreatmentType
} from '../types/database';

// ── helpers ──────────────────────────────────────────────────────────────────
const now = () => new Date().toISOString();

async function getUser(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.email ?? 'system';
}

async function logAudit(
  palletId: string,
  sessionId: string,
  action: string,
  oldStatus: PalletWorkflowStatus | null,
  newStatus: PalletWorkflowStatus,
  remarks?: string | null
) {
  const user = await getUser();
  await supabase.from('pallet_audit_log').insert({
    pallet_tracking_id: palletId,
    session_id: sessionId,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    remarks: remarks ?? null,
    performed_by: user,
    performed_at: now(),
  });
}

async function generatePalletCode(sessionId: string): Promise<string> {
  const { data } = await supabase
    .from('pallet_tracking')
    .select('pallet_code')
    .eq('production_session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1);
  const last = data?.[0]?.pallet_code ?? 'B0000';
  const num = parseInt(last.replace(/\D/g, '') || '0') + 1;
  return `B${String(num).padStart(4, '0')}`;
}

// ── core pallet CRUD ─────────────────────────────────────────────────────────
export const palletTrackingService = {

  async getBySessionId(sessionId: string): Promise<PalletTracking[]> {
    const { data, error } = await supabase
      .from('pallet_tracking')
      .select('*')
      .eq('production_session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<PalletTracking | null> {
    const { data, error } = await supabase
      .from('pallet_tracking')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getByStatus(
    status: PalletWorkflowStatus | PalletWorkflowStatus[]
  ): Promise<PalletTracking[]> {
    const statuses = Array.isArray(status) ? status : [status];
    const { data, error } = await supabase
      .from('pallet_tracking')
      .select('*')
      .in('workflow_status', statuses)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  // Operator creates a new pallet (status = FILLING)
  async create(
    sessionId: string,
    lotNumber: string,
    baleQty: number,
    remarks: string | null
  ): Promise<PalletTracking> {
    const palletCode = await generatePalletCode(sessionId);
    const weight = baleQty * 35;

    const { data, error } = await supabase
      .from('pallet_tracking')
      .insert({
        production_session_id: sessionId,
        pallet_code: palletCode,
        lot_number: lotNumber,
        bale_qty: baleQty,
        packed_qty: weight,
        workflow_status: 'FILLING' as PalletWorkflowStatus,
        status: 'FILLING',
        remarks,
        packing_date: new Date().toISOString().split('T')[0],
        created_at: now(),
        updated_at: now(),
      })
      .select()
      .single();
    if (error) throw error;
    await logAudit(data.id, sessionId, 'Create Pallet', null, 'FILLING', remarks);
    return data;
  },

  // Operator updates bale qty while filling
  async updateFilling(id: string, baleQty: number, remarks: string | null): Promise<PalletTracking> {
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ bale_qty: baleQty, packed_qty: baleQty * 35, remarks, updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // Operator closes pallet → WAITING_QC
  async closePallet(id: string, remarks: string | null): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ workflow_status: 'WAITING_QC', status: 'PACKED', remarks, updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    await logAudit(id, p.production_session_id, 'Close Pallet → Waiting QC', 'FILLING', 'WAITING_QC', remarks);
    return data;
  },

  // QC sets condition
  async qcInspect(id: string, condition: PalletQCCondition, remarks: string | null): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const newStatus: PalletWorkflowStatus = condition === 'OK' ? 'WAITING_STONE_WEIGHTING' : 'REJECT';
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ workflow_status: newStatus, qc_condition: condition, remarks, updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    const action = condition === 'OK' ? 'QC Pass → Waiting Stone Weighting' : `QC Reject (${condition})`;
    await logAudit(id, p.production_session_id, action, 'WAITING_QC', newStatus, remarks);
    return data;
  },

  // Supervisor / QC applies treatment to reject pallet
  async applyTreatment(id: string, treatment: PalletTreatmentType, remarks: string | null): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const statusMap: Record<PalletTreatmentType, PalletWorkflowStatus> = {
      RE_CHECK: 'RE_CHECK', QUARANTINE: 'QUARANTINE', RE_WORK: 'RE_WORK'
    };
    const newStatus = statusMap[treatment];
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ workflow_status: newStatus, treatment_type: treatment, remarks, updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    await logAudit(id, p.production_session_id, `Apply Treatment: ${treatment}`, p.workflow_status ?? 'REJECT', newStatus, remarks);
    return data;
  },

  // Treatment result: pass → Stone Weighting, fail → Reprocess
  async treatmentResult(id: string, passed: boolean, remarks: string | null): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const newStatus: PalletWorkflowStatus = passed ? 'WAITING_STONE_WEIGHTING' : 'WAITING_REPROCESS';
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ workflow_status: newStatus, remarks, updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    const action = passed ? 'Treatment Pass → Waiting Stone Weighting' : 'Treatment Fail → Waiting Reprocess';
    await logAudit(id, p.production_session_id, action, p.workflow_status ?? 'RE_CHECK', newStatus, remarks);
    return data;
  },

  // Start stone weighting
  async startWeighting(id: string): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ workflow_status: 'UNDER_WEIGHTING', weighting_start: now(), updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    await logAudit(id, p.production_session_id, 'Stone Weighting Start', 'WAITING_STONE_WEIGHTING', 'UNDER_WEIGHTING');
    return data;
  },

  // Complete stone weighting → Final Inspection
  async completeWeighting(id: string): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ workflow_status: 'WAITING_FINAL_INSPECTION', weighting_end: now(), updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    await logAudit(id, p.production_session_id, 'Stone Weighting Complete → Waiting Final Inspection', 'UNDER_WEIGHTING', 'WAITING_FINAL_INSPECTION');
    return data;
  },

  // Final inspection
  async finalInspect(
    id: string,
    plasticOk: boolean,
    palletOk: boolean,
    remarks: string | null
  ): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const allOk = plasticOk && palletOk;
    const newStatus: PalletWorkflowStatus = allOk ? 'READY_FG' : 'REJECT';
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({
        workflow_status: newStatus,
        plastic_condition: plasticOk ? 'OK' : 'DAMAGED',
        pallet_physical_condition: palletOk ? 'OK' : 'DAMAGED',
        remarks,
        updated_at: now()
      })
      .eq('id', id).select().single();
    if (error) throw error;
    const action = allOk ? 'Final Inspection Pass → Ready FG' : 'Final Inspection Fail → Hold (Reject)';
    await logAudit(id, p.production_session_id, action, 'WAITING_FINAL_INSPECTION', newStatus, remarks);
    return data;
  },

  // Supervisor releases to FG
  async releaseFG(id: string, remarks: string | null): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const user = await getUser();
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({
        workflow_status: 'RELEASED_FG',
        status: 'RELEASED',
        released_by: user,
        released_at: now(),
        remarks,
        updated_at: now()
      })
      .eq('id', id).select().single();
    if (error) throw error;
    await logAudit(id, p.production_session_id, 'Released to Finished Good', 'READY_FG', 'RELEASED_FG', remarks);
    return data;
  },

  // Send to reprocess queue
  async sendToReprocess(id: string, reason: string): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ workflow_status: 'WAITING_REPROCESS', reprocess_reason: reason, reprocess_date: now(), updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    await logAudit(id, p.production_session_id, 'Sent to Reprocess Queue', p.workflow_status ?? 'REJECT', 'WAITING_REPROCESS', reason);
    return data;
  },

  async confirmReprocessed(id: string): Promise<PalletTracking> {
    const p = await this.getById(id);
    if (!p) throw new Error('Pallet not found');
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ workflow_status: 'REPROCESSED', updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    await logAudit(id, p.production_session_id, 'Confirmed Reprocessed', 'WAITING_REPROCESS', 'REPROCESSED');
    return data;
  },

  // Legacy verify (kept for backward compat)
  async verify(id: string): Promise<PalletTracking> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('pallet_tracking')
      .update({ verified_by: user?.id, verified_at: now(), status: 'STAGED', updated_at: now() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('pallet_tracking').delete().eq('id', id);
    if (error) throw error;
  },

  async getAuditLog(palletId: string) {
    const { data, error } = await supabase
      .from('pallet_audit_log')
      .select('*')
      .eq('pallet_tracking_id', palletId)
      .order('performed_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getSessionSummary(sessionId: string) {
    const pallets = await this.getBySessionId(sessionId);
    return pallets.reduce((acc: Record<string, number>, p) => {
      const s = p.workflow_status ?? 'FILLING';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
  },

  // Keep old generatePalletCode and generateQRCode for backward compat
  async generatePalletCode(packingDate: string): Promise<string> {
    const date = new Date(packingDate);
    const prefix = `PLT-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const { data } = await supabase.from('pallet_tracking').select('pallet_code').like('pallet_code', `${prefix}-%`).order('pallet_code', { ascending: false }).limit(1);
    const seq = data?.[0] ? parseInt(data[0].pallet_code.split('-')[2] || '0') + 1 : 1;
    return `${prefix}-${String(seq).padStart(3,'0')}`;
  },

  async generateQRCode(palletId: string, palletCode: string): Promise<void> {
    await supabase.from('pallet_qr_codes').insert({
      pallet_tracking_id: palletId,
      qr_code: `QR-${palletCode}`,
      qr_data: JSON.stringify({ pallet_id: palletId, pallet_code: palletCode, generated_at: now() })
    });
  },
};

// ── packing records (bale-level) ─────────────────────────────────────────────
export const packingRecordService = {
  async getByPalletId(palletId: string): Promise<PackingRecord[]> {
    const { data, error } = await supabase.from('packing_records').select('*').eq('pallet_tracking_id', palletId).order('bag_number', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async create(record: Omit<PackingRecord, 'id' | 'created_at' | 'packed_at'>): Promise<PackingRecord> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('packing_records').insert({ ...record, packed_by: user?.id, packed_at: now() }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, record: Partial<PackingRecord>): Promise<PackingRecord> {
    const { data, error } = await supabase.from('packing_records').update(record).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('packing_records').delete().eq('id', id);
    if (error) throw error;
  },
};
