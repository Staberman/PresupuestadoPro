import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const { to, clientName, proposalTitle, proposalNum, publicUrl, whatsappPhone } = await req.json();

    if (!to || !publicUrl) {
      return NextResponse.json({ ok: false, error: 'Faltan datos (to, publicUrl)' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'RESEND_API_KEY no configurada' }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const from = 'Propuesta <onboarding@resend.dev>';

    const subject = `${proposalTitle || 'Propuesta'} #${proposalNum}`;
    const greeting = clientName ? `Hola ${clientName},` : 'Hola,';

    const whatsappLink = whatsappPhone
      ? `<p style="margin: 16px 0 0; font-size: .85rem; color: #7888a8;">¿Tenés alguna consulta? <a href="https://wa.me/${whatsappPhone.replace(/\D/g, '')}" style="color: #0a7c4b;">Escribinos por WhatsApp</a></p>`
      : '';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0e1b3d;">
        <div style="background: #0f2d6e; padding: 20px 24px; border-radius: 12px 12px 0 0; color: white;">
          <div style="font-size: 1.2rem; font-weight: 800;">${proposalTitle || 'Propuesta comercial'}</div>
          <div style="font-size: .8rem; color: #93adf5; margin-top: 4px;">Propuesta #${proposalNum}</div>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #dde3f5; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 16px; line-height: 1.6;">${greeting}</p>
          <p style="margin: 0 0 16px; line-height: 1.6; color: #364061;">
            Recibiste una propuesta comercial. Podés revisarla completa y responderla (aprobar, postergar o rechazar) desde el siguiente link:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${publicUrl}" style="display: inline-block; background: #1a56e8; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: .95rem;">
              Ver propuesta
            </a>
          </div>
          <p style="margin: 0 0 8px; font-size: .82rem; color: #7888a8; word-break: break-all;">
            Si el botón no funciona, copiá este link:<br>
            <a href="${publicUrl}" style="color: #1a56e8;">${publicUrl}</a>
          </p>
          ${whatsappLink}
          <p style="margin: 24px 0 0; font-size: .82rem; color: #7888a8; line-height: 1.5;">
            Saludos
          </p>
        </div>
        <div style="text-align: center; font-size: .72rem; color: #7888a8; margin-top: 16px;">
          Enviado vía PresupuestoPro
        </div>
      </div>
    `;

    const { error } = await resend.emails.send({ from, to, subject, html });

    if (error) {
      console.error('[send-proposal] Resend error:', error);
      return NextResponse.json({ ok: false, error: 'No se pudo enviar el email.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-proposal] Error:', err);
    return NextResponse.json({ ok: false, error: 'Error inesperado.' }, { status: 500 });
  }
}
