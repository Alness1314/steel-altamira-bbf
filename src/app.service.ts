import { Injectable, InternalServerErrorException } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { SendMailDto } from './dto/send-mail.dto';

type SendGridMailWithResidency = typeof sgMail & {
  setDataResidency?: (region: 'eu') => void;
};

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async sendContactEmail(payload: SendMailDto): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const emailTo = process.env.EMAIL_TO?.split(',')
      .map((email) => email.trim())
      .filter(Boolean) ?? ['corporativo@altamirasteel.com'];
    const dataResidency = process.env.SENDGRID_DATA_RESIDENCY;

    if (!apiKey || !emailFrom) {
      throw new InternalServerErrorException(
        'Falta configurar SENDGRID_API_KEY o EMAIL_FROM en variables de entorno.',
      );
    }

    sgMail.setApiKey(apiKey);

    const sendGridMailWithResidency = sgMail as SendGridMailWithResidency;
    if (
      dataResidency?.toLowerCase() === 'eu' &&
      typeof sendGridMailWithResidency.setDataResidency === 'function'
    ) {
      sendGridMailWithResidency.setDataResidency('eu');
    }

    const subject =
      payload.subject?.trim() || 'Nuevo contacto desde formulario web';
    const sanitizedMessage = payload.message.trim();

    try {
      await sgMail.send({
        to: emailTo,
        from: emailFrom,
        subject,
        text: [
          'Nuevo mensaje recibido desde el frontend.',
          `Nombre: ${payload.name}`,
          `Email: ${payload.email}`,
          '',
          'Mensaje:',
          sanitizedMessage,
        ].join('\n'),
        html: `
          <h2>Nuevo mensaje recibido desde el frontend</h2>
          <p><strong>Nombre:</strong> ${payload.name}</p>
          <p><strong>Email:</strong> ${payload.email}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${sanitizedMessage.replaceAll('\n', '<br/>')}</p>
        `,
      });

      await sgMail.send({
        to: payload.email,
        from: emailFrom,
        subject: 'Recibimos tu mensaje - Altamira Steel',
        text: [
          `Hola ${payload.name},`,
          '',
          'Gracias por contactarnos. Hemos recibido tu mensaje y te responderemos en breve.',
          '',
          'Saludos,',
          'Equipo Altamira Steel',
        ].join('\n'),
        html: `
          <p>Hola ${payload.name},</p>
          <p>
            Gracias por contactarnos. Hemos recibido tu mensaje y te responderemos
            en breve.
          </p>
          <p>Saludos,<br/>Equipo Altamira Steel</p>
        `,
      });
    } catch {
      throw new InternalServerErrorException(
        'No se pudo enviar el correo en este momento.',
      );
    }
  }
}
