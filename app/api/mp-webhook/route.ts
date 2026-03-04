import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (server-side)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MercadoPago sends different notification types
    const { type, data } = body;

    if (type !== 'payment' && type !== 'subscription_preapproval') {
      return NextResponse.json({ ok: true });
    }

    const resourceId = data?.id;
    if (!resourceId) return NextResponse.json({ ok: true });

    // Fetch payment/subscription details from MP API
    const mpRes = await fetch(
      type === 'payment'
        ? `https://api.mercadopago.com/v1/payments/${resourceId}`
        : `https://api.mercadopago.com/preapproval/${resourceId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!mpRes.ok) {
      console.error('[MP Webhook] Failed to fetch resource:', mpRes.status);
      return NextResponse.json({ ok: false }, { status: 200 }); // return 200 to avoid MP retries
    }

    const mpData = await mpRes.json();

    // Extract the external_reference (we'll set this to the Firebase UID)
    const externalRef = mpData.external_reference;
    const status      = mpData.status;

    if (!externalRef) {
      console.warn('[MP Webhook] No external_reference found');
      return NextResponse.json({ ok: true });
    }

    // Only activate on approved/authorized payments
    if (status !== 'approved' && status !== 'authorized') {
      console.log('[MP Webhook] Payment not approved:', status);
      return NextResponse.json({ ok: true });
    }

    // Determine plan from payment amount or metadata
    const amount = mpData.transaction_amount || mpData.auto_recurring?.transaction_amount || 0;
    const plan = amount >= 40000 ? 'yearly' : 'monthly'; // adjust thresholds to your prices

    // Activate Pro in Firestore
    await db.collection('users').doc(externalRef).set({
      proStatus:        plan,
      proActivatedAt:   new Date().toISOString(),
      proPaymentId:     String(resourceId),
      proAmount:        amount,
    }, { merge: true });

    console.log(`[MP Webhook] Activated ${plan} for user ${externalRef}`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[MP Webhook] Error:', err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}