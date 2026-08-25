import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrgLicence {
  id: string;
  organisation_id: string;
  course_id: string;
  course_title: string;
  offering_id: string | null;
  seats_total: number;
  seats_used: number;
  starts_at: string;
  expires_at: string;
  status: string;
  order_reference: string | null;
  order_po_reference: string | null;
  order_status: string | null;
  order_amount_gbp: number | null;
}

/** Seats that count against capacity (mirrors the assign_seat primitive). */
const CONSUMING_STATUSES = ['reserved', 'active', 'completed'];

/**
 * Licences for one organisation with live seat usage.
 *
 * Read-only: every seat mutation goes through the Step-1 primitives.
 */
export function useOrgLicences(organisationId: string | null | undefined) {
  const [licences, setLicences] = useState<OrgLicence[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organisationId) {
      setLicences([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data } = await supabase
      .from('licences')
      .select(
        `id, organisation_id, course_id, offering_id, seats_total, starts_at, expires_at, status,
         courses:course_id ( title ),
         org_orders:org_order_id ( reference, po_reference, status, amount_gbp ),
         licence_seats ( id, status )`,
      )
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });

    const rows: OrgLicence[] = (data ?? []).map((row: Record<string, unknown>) => {
      const seats = (row.licence_seats as { status: string }[] | null) ?? [];
      const course = row.courses as { title?: string } | null;
      const order = row.org_orders as
        | { reference?: string; po_reference?: string | null; status?: string; amount_gbp?: number }
        | null;
      return {
        id: row.id as string,
        organisation_id: row.organisation_id as string,
        course_id: row.course_id as string,
        course_title: course?.title ?? 'Untitled course',
        offering_id: (row.offering_id as string | null) ?? null,
        seats_total: row.seats_total as number,
        seats_used: seats.filter((s) => CONSUMING_STATUSES.includes(s.status)).length,
        starts_at: row.starts_at as string,
        expires_at: row.expires_at as string,
        status: row.status as string,
        order_reference: order?.reference ?? null,
        order_po_reference: order?.po_reference ?? null,
        order_status: order?.status ?? null,
        order_amount_gbp: order?.amount_gbp ?? null,
      };
    });

    setLicences(rows);
    setLoading(false);
  }, [organisationId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { licences, loading, reload: load };
}
