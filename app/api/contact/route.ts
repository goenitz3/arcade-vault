import { Resend } from "resend";

type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ContactPayload>;
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || !email || !message) {
    return Response.json({ error: "Todos los campos son obligatorios." }, { status: 400 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.CONTACT_TO_EMAIL as string,
      replyTo: email,
      subject: `Nuevo mensaje de contacto — ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${message}`,
    });

    if (error) {
      console.error("Resend rejected the contact email", error);
      return Response.json({ error: "No se pudo enviar el mensaje." }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Failed to send contact email", err);
    return Response.json({ error: "No se pudo enviar el mensaje." }, { status: 502 });
  }
}
