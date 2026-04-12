import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  private readonly templatesDir = path.join(__dirname, '..', 'templates');
  private readonly cache = new Map<string, Handlebars.TemplateDelegate>();

  render(templateName: string, data: Record<string, unknown>): string {
    let template = this.cache.get(templateName);

    if (!template) {
      const filePath = path.join(this.templatesDir, templateName);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Template not found: ${templateName}`);
      }
      template = Handlebars.compile(fs.readFileSync(filePath, 'utf-8'));
      this.cache.set(templateName, template);
    }

    return template(data);
  }
}
