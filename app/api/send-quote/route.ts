import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const { to, clientName, bizName, bizEmail, quoteNum, publicUrl, note } = await req.json();

    if (!to || !publicUrl) {
      return NextResponse.json({ ok: false, error: 'Faltan datos (to, publicUrl)' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'RESEND_API_KEY no configurada' }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const from = bizEmail
      ? `PresupuestoPro <${bizEmail}>`
      : 'PresupuestoPro <onboarding@resend.dev>';

    const subject = `Presupuesto #${quoteNum} de ${bizName || 'tu proveedor'}`;
    const greeting = clientName ? `Hola ${clientName},` : 'Hola,';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0e1b3d;">
        <div style="background: #0f2d6e; padding: 20px 24px; border-radius: 12px 12px 0 0; color: white;">
          <div style="font-size: 1.2rem; font-weight: 800;">${bizName || 'Tu Empresa'}</div>
          <div style="font-size: .8rem; color: #93adf5; margin-top: 4px;">Te envió un presupuesto</div>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #dde3f5; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 16px; line-height: 1.6;">${greeting}</p>
          <p style="margin: 0 0 16px; line-height: 1.6; color: #364061;">
            Recibiste el presupuesto <strong>#${quoteNum}</strong>. Podés revisarlo completo y aceptarlo o rechazarlo online desde el siguiente link:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${publicUrl}" style="display: inline-block; background: #1a56e8; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: .95rem;">
              Ver presupuesto
            </a>
          </div>
          <p style="margin: 0 0 8px; font-size: .82rem; color: #7888a8; word-break: break-all;">
            Si el botón no funciona, copiá este link:<br>
            <a href="${publicUrl}" style="color: #1a56e8;">${publicUrl}</a>
          </p>
          ${note ? `<div style="margin-top: 20px; padding: 14px; background: #f5f7fc; border-radius: 8px; font-size: .85rem; color: #364061;"><strong>Mensaje de ${bizName || 'tu proveedor'}:</strong><br>${note}</div>` : ''}
          <p style="margin: 24px 0 0; font-size: .82rem; color: #7888a8; line-height: 1.5;">
            Saludos,<br>${bizName || 'Tu proveedor'}
          </p>
        </div>
        <div style="text-align: center; font-size: .72rem; color: #7888a8; margin-top: 16px;">
          Enviado vía PresupuestoPro
        </div>
      </div>
    `;

    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      replyTo: bizEmail || undefined,
    });

    if (error) {
      console.error('[send-quote] Resend error:', error);
      return NextResponse.json({ ok: false, error: 'No se pudo enviar el email.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-quote] Error:', err);
    return NextResponse.json({ ok: false, error: 'Error inesperado.' }, { status: 500 });
  }
}
