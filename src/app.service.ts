import { Injectable, InternalServerErrorException } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { SendMailDto } from './dto/send-mail.dto';
import { TemplateService } from './services/template.service';
import * as fs from 'node:fs';
import * as path from 'node:path';

type SendGridMailWithResidency = typeof sgMail & {
  setDataResidency?: (region: 'eu') => void;
};

@Injectable()
export class AppService {
  constructor(private readonly templateService: TemplateService) {}

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
    const año = new Date().getFullYear();
    const attachments = this.buildLogoAttachment();

    try {
      // Email al equipo con el mensaje recibido
      const adminHtml = this.templateService.render('contact-admin.hbs', {
        nombre: payload.name,
        email: payload.email,
        asunto: subject,
        mensaje: sanitizedMessage.replaceAll('\n', '<br/>'),
        año,
      });

      await sgMail.send({
        to: emailTo,
        from: emailFrom,
        subject: `[CONTACTO WEB] ${subject}`,
        text: [
          'Nuevo mensaje recibido desde el sitio web Altamirasteel.com',
          `Nombre: ${payload.name}`,
          `Email: ${payload.email}`,
          '',
          'Mensaje:',
          sanitizedMessage,
        ].join('\n'),
        html: adminHtml,
        ...(attachments.length && { attachments }),
      });

      // Confirmacion al remitente
      const confirmHtml = this.templateService.render(
        'contact-confirmation.hbs',
        {
          nombre: payload.name,
          email: payload.email,
          asunto: subject,
          año,
        },
      );

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
        html: confirmHtml,
        ...(attachments.length && { attachments }),
      });
    } catch (error: unknown) {
      const details = this.extractSendGridErrorDetails(error);
      console.error('Error al enviar correo:', details);
      throw new InternalServerErrorException(details);
    }
  }

  private buildLogoAttachment(): Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
    content_id: string;
  }> {
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };

    // 1. Intentar con APP_LOGO_PATH (ruta absoluta o relativa al CWD)
    const envPath = process.env.APP_LOGO_PATH;
    const candidates: string[] = [];

    if (envPath) {
      candidates.push(
        path.isAbsolute(envPath)
          ? envPath
          : path.resolve(process.cwd(), envPath),
      );
    }

    // 2. Fallback: buscar PNG en la carpeta assets junto al archivo compilado
    const assetsDir = path.join(__dirname, 'assets');
    if (fs.existsSync(assetsDir)) {
      for (const file of fs.readdirSync(assetsDir)) {
        if (
          ['.png', '.jpg', '.jpeg'].includes(path.extname(file).toLowerCase())
        ) {
          candidates.push(path.join(assetsDir, file));
          break;
        }
      }
    }

    for (const logoPath of candidates) {
      if (!fs.existsSync(logoPath)) continue;

      const ext = path.extname(logoPath).toLowerCase();
      const mimeType = mimeTypes[ext];
      if (!mimeType) continue;

      return [
        {
          content: fs.readFileSync(logoPath).toString('base64'),
          filename: `logo${ext}`,
          type: mimeType,
          disposition: 'inline',
          content_id: 'logoApp',
        },
      ];
    }

    return [];
  }

  private extractSendGridErrorDetails(error: unknown): string {
    const fallback = 'No se pudo enviar el correo en este momento.';

    if (!error || typeof error !== 'object') return fallback;

    const maybeError = error as {
      response?: {
        body?: {
          errors?: Array<{ message?: string; field?: string }>;
        };
      };
      message?: string;
    };

    const errors = maybeError.response?.body?.errors;
    if (!errors?.length) return maybeError.message ?? fallback;

    const normalized = errors
      .map((e) => {
        const msg = e.message?.trim();
        const field = e.field?.trim();
        if (msg && field) return `${msg} (field: ${field})`;
        return msg || null;
      })
      .filter((v): v is string => Boolean(v));

    if (!normalized.length) return fallback;

    return `Error de SendGrid: ${normalized.join(' | ')}`;
  }
}
