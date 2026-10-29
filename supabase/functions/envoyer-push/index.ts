import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const DIX_MINUTES_MS = 10 * 60 * 1000;

type Corps = { notification_id?: string };

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return json({ ok: false }, 405);
    }

    const corps = (await req.json()) as Corps;
    const notificationId = corps.notification_id;
    if (!notificationId || typeof notificationId !== 'string') {
      return json({ ok: false }, 400);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const cle = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !cle) {
      return json({ ok: false }, 500);
    }

    const supabase = createClient(url, cle);

    const { data: notif, error: errNotif } = await supabase
      .from('notifications')
      .select('id, profil_id, titre, message, created_at, push_envoye_le')
      .eq('id', notificationId)
      .maybeSingle();

    if (errNotif || !notif) {
      return json({ ok: false }, 404);
    }
    if (notif.push_envoye_le) {
      return json({ ok: true, deja: true });
    }

    const age = Date.now() - new Date(notif.created_at).getTime();
    if (Number.isNaN(age) || age > DIX_MINUTES_MS) {
      return json({ ok: false, expire: true }, 410);
    }

    // Marquer avant l'envoi : un seul envoi même en cas de rappel.
    const { data: marque, error: errMarque } = await supabase
      .from('notifications')
      .update({ push_envoye_le: new Date().toISOString() })
      .eq('id', notificationId)
      .is('push_envoye_le', null)
      .select('id')
      .maybeSingle();

    if (errMarque || !marque) {
      return json({ ok: true, deja: true });
    }

    const { data: profil } = await supabase
      .from('profils')
      .select('role')
      .eq('id', notif.profil_id)
      .maybeSingle();

    const ecran = profil?.role === 'patissier' ? '/(patissier)' : '/notifications';

    const { data: jetons } = await supabase
      .from('push_tokens')
      .select('id, jeton')
      .eq('profil_id', notif.profil_id);

    if (!jetons || jetons.length === 0) {
      return json({ ok: true, envoyes: 0 });
    }

    const messages = jetons.map((ligne) => ({
      to: ligne.jeton,
      title: notif.titre,
      body: notif.message,
      sound: 'default' as const,
      data: { notification_id: notif.id, ecran },
    }));

    const reponseExpo = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!reponseExpo.ok) {
      return json({ ok: false }, 502);
    }

    const payload = (await reponseExpo.json()) as {
      data?: Array<{ status?: string; details?: { error?: string } }>;
    };
    const tickets = payload.data ?? [];

    const aSupprimer: string[] = [];
    for (let i = 0; i < tickets.length; i += 1) {
      const ticket = tickets[i];
      if (
        ticket?.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        aSupprimer.push(jetons[i].jeton);
      }
    }

    if (aSupprimer.length > 0) {
      await supabase.from('push_tokens').delete().in('jeton', aSupprimer);
    }

    return json({ ok: true, envoyes: jetons.length });
  } catch {
    return json({ ok: false }, 500);
  }
});

function json(corps: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
