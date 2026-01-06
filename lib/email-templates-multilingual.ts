// Multi-language email templates for Voluna volunteer platform

export interface EmailTemplateData {
  name?: string;
  opportunityTitle?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  signupCount?: number;
  estimatedHours?: number;
  rollCallUrl?: string;
  organizationName?: string;
  verificationUrl?: string;
  // Add new fields for organization verification
  organizationDescription?: string;
  organizationCity?: string;
  contactEmail?: string;
  ownerName?: string;
  ownerEmail?: string;
}

type Language = 'en' | 'es' | 'pt';

// Email content translations
const emailTranslations = {
  en: {
    signupConfirmation: {
      subject: 'Confirmation: {opportunityTitle}',
      title: 'Signup Confirmation',
      greeting: 'Hi {name},',
      confirmation: 'Your signup for the following volunteer opportunity has been confirmed:',
      details: 'Event Details',
      time: 'Time',
      location: 'Location',
      hours: 'Estimated Hours',
      organization: 'Organization',
      reminder: 'Please arrive 10 minutes early and bring any required items.',
      contact: 'If you have any questions, please contact the organization directly.',
      thanks: 'Thank you for volunteering!'
    },
    reminder: {
      subject: 'Reminder: {opportunityTitle} tomorrow',
      title: 'Volunteer Opportunity Reminder',
      greeting: 'Hi {name},',
      reminder: 'This is a friendly reminder about your volunteer opportunity tomorrow:',
      details: 'Event Details',
      time: 'Time',
      location: 'Location',
      hours: 'Estimated Hours',
      organization: 'Organization',
      arrival: 'Please arrive 10 minutes early.',
      contact: 'If you need to cancel or have questions, please contact the organization.',
      thanks: 'Thank you for volunteering!'
    },
    rollCall: {
      subject: 'Roll Call: {opportunityTitle}',
      title: 'Roll Call for Volunteer Opportunity',
      greeting: 'Hi {name},',
      rollCall: 'Please confirm your attendance for the following volunteer opportunity:',
      details: 'Event Details',
      time: 'Time',
      location: 'Location',
      hours: 'Estimated Hours',
      organization: 'Organization',
      confirm: 'Confirm Attendance',
      thanks: 'Thank you for volunteering!'
    },
    verification: {
      subject: 'Verify your email address',
      title: 'Email Verification',
      greeting: 'Hi {name},',
      verification: 'Please verify your email address by clicking the button below:',
      verify: 'Verify Email',
      thanks: 'Thank you for joining Voluna!'
    },
    hoursAwarded: {
      subject: 'Hours Awarded: {opportunityTitle}',
      title: 'Volunteer Hours Awarded',
      greeting: 'Hi {name},',
      awarded: 'Your volunteer hours have been awarded for the following opportunity:',
      details: 'Event Details',
      time: 'Time',
      location: 'Location',
      hours: 'Hours Awarded',
      organization: 'Organization',
      thanks: 'Thank you for your service!'
    },
    organizationPending: {
      subject: 'Organization Registration Pending - {organizationName}',
      title: 'Organization Registration Pending',
      greeting: 'Hi {name},',
      pending: 'Thank you for registering your organization with Voluna! Your organization registration is currently pending review.',
      details: 'Organization Details',
      organizationName: 'Organization Name',
      city: 'City',
      contactEmail: 'Contact Email',
      description: 'Description',
      review: 'Our team will review your organization within 1-2 business days. You will receive an email notification once your organization has been approved.',
      nextSteps: 'What happens next:',
      step1: 'We will review your organization information',
      step2: 'You will receive approval notification via email',
      step3: 'Once approved, you can start creating volunteer opportunities',
      thanks: 'Thank you for your patience!'
    },
    organizationAdminNotification: {
      subject: 'New Organization Registration - {organizationName}',
      title: 'New Organization Registration',
      greeting: 'Hi Baron,',
      notification: 'A new organization has been registered and requires your approval:',
      details: 'Organization Details',
      organizationName: 'Organization Name',
      city: 'City',
      contactEmail: 'Contact Email',
      description: 'Description',
      ownerDetails: 'Organization Owner',
      ownerName: 'Owner Name',
      ownerEmail: 'Owner Email',
      approve: 'Approve Organization',
      reject: 'Reject Organization',
      instructions: 'Click the approve button above to activate this organization, or reject if it doesn\'t meet your criteria.'
    }
    ,
    organizationApproved: {
      subject: 'Organization Approved - {organizationName}',
      title: 'Your Organization Is Approved',
      greeting: 'Hi {name},',
      approved: 'Great news! Your organization "{organizationName}" has been approved and is now active on Voluna.',
      nextSteps: 'What you can do now:',
      step1: 'Create volunteer opportunities',
      step2: 'Manage your organization profile',
      step3: 'Connect with volunteers in your community',
      thanks: 'Thanks for being part of Voluna!'
    },
    organizationRejected: {
      subject: 'Organization Rejected - {organizationName}',
      title: 'Organization Registration Update',
      greeting: 'Hi {name},',
      rejected: 'Thank you for your interest in Voluna. After review, we\'re unable to approve your organization "{organizationName}" at this time.',
      contact: 'If you have questions about this decision, please contact us.',
      thanks: 'We appreciate your understanding.'
    }
  },
  es: {
    signupConfirmation: {
      subject: 'Confirmación: {opportunityTitle}',
      title: 'Confirmación de Inscripción',
      greeting: 'Hola {name},',
      confirmation: 'Tu inscripción para la siguiente oportunidad de voluntariado ha sido confirmada:',
      details: 'Detalles del Evento',
      time: 'Hora',
      location: 'Ubicación',
      hours: 'Horas Estimadas',
      organization: 'Organización',
      reminder: 'Por favor llega 10 minutos antes y trae cualquier artículo requerido.',
      contact: 'Si tienes alguna pregunta, por favor contacta directamente a la organización.',
      thanks: '¡Gracias por hacer voluntariado!'
    },
    reminder: {
      subject: 'Recordatorio: {opportunityTitle} mañana',
      title: 'Recordatorio de Oportunidad de Voluntariado',
      greeting: 'Hola {name},',
      reminder: 'Este es un recordatorio amigable sobre tu oportunidad de voluntariado mañana:',
      details: 'Detalles del Evento',
      time: 'Hora',
      location: 'Ubicación',
      hours: 'Horas Estimadas',
      organization: 'Organización',
      arrival: 'Por favor llega 10 minutos antes.',
      contact: 'Si necesitas cancelar o tienes preguntas, por favor contacta a la organización.',
      thanks: '¡Gracias por hacer voluntariado!'
    },
    rollCall: {
      subject: 'Lista de Asistencia: {opportunityTitle}',
      title: 'Lista de Asistencia para Oportunidad de Voluntariado',
      greeting: 'Hola {name},',
      rollCall: 'Por favor confirma tu asistencia para la siguiente oportunidad de voluntariado:',
      details: 'Detalles del Evento',
      time: 'Hora',
      location: 'Ubicación',
      hours: 'Horas Estimadas',
      organization: 'Organización',
      confirm: 'Confirmar Asistencia',
      thanks: '¡Gracias por hacer voluntariado!'
    },
    verification: {
      subject: 'Verifica tu dirección de correo electrónico',
      title: 'Verificación de Correo',
      greeting: 'Hola {name},',
      verification: 'Por favor verifica tu dirección de correo electrónico haciendo clic en el botón de abajo:',
      verify: 'Verificar Correo',
      thanks: '¡Gracias por unirte a Voluna!'
    },
    hoursAwarded: {
      subject: 'Horas Otorgadas: {opportunityTitle}',
      title: 'Horas de Voluntariado Otorgadas',
      greeting: 'Hola {name},',
      awarded: 'Tus horas de voluntariado han sido otorgadas para la siguiente oportunidad:',
      details: 'Detalles del Evento',
      time: 'Hora',
      location: 'Ubicación',
      hours: 'Horas Otorgadas',
      organization: 'Organización',
      thanks: '¡Gracias por tu servicio!'
    },
    organizationPending: {
      subject: 'Registro de Organización Pendiente - {organizationName}',
      title: 'Registro de Organización Pendiente',
      greeting: 'Hola {name},',
      pending: '¡Gracias por registrar tu organización con Voluna! El registro de tu organización está actualmente pendiente de revisión.',
      details: 'Detalles de la Organización',
      organizationName: 'Nombre de la Organización',
      city: 'Ciudad',
      contactEmail: 'Correo de Contacto',
      description: 'Descripción',
      review: 'Nuestro equipo revisará tu organización dentro de 1-2 días hábiles. Recibirás una notificación por correo una vez que tu organización haya sido aprobada.',
      nextSteps: 'Qué sigue:',
      step1: 'Revisaremos la información de tu organización',
      step2: 'Recibirás notificación de aprobación por correo',
      step3: 'Una vez aprobada, podrás comenzar a crear oportunidades de voluntariado',
      thanks: '¡Gracias por tu paciencia!'
    },
    organizationAdminNotification: {
      subject: 'Nuevo Registro de Organización - {organizationName}',
      title: 'Nuevo Registro de Organización',
      greeting: 'Hola Baron,',
      notification: 'Una nueva organización se ha registrado y requiere tu aprobación:',
      details: 'Detalles de la Organización',
      organizationName: 'Nombre de la Organización',
      city: 'Ciudad',
      contactEmail: 'Correo de Contacto',
      description: 'Descripción',
      ownerDetails: 'Propietario de la Organización',
      ownerName: 'Nombre del Propietario',
      ownerEmail: 'Correo del Propietario',
      approve: 'Aprobar Organización',
      reject: 'Rechazar Organización',
      instructions: 'Haz clic en el botón de aprobar arriba para activar esta organización, o rechazar si no cumple tus criterios.'
    },
    organizationApproved: {
      subject: 'Organización Aprobada - {organizationName}',
      title: 'Tu Organización Ha Sido Aprobada',
      greeting: 'Hola {name},',
      approved: '¡Buenas noticias! Tu organización "{organizationName}" ha sido aprobada y ahora está activa en Voluna.',
      nextSteps: 'Qué puedes hacer ahora:',
      step1: 'Crear oportunidades de voluntariado',
      step2: 'Administrar el perfil de tu organización',
      step3: 'Conectarte con voluntarios en tu comunidad',
      thanks: '¡Gracias por ser parte de Voluna!'
    },
    organizationRejected: {
      subject: 'Organización Rechazada - {organizationName}',
      title: 'Actualización del Registro de Organización',
      greeting: 'Hola {name},',
      rejected: 'Gracias por tu interés en Voluna. Después de la revisión, no podemos aprobar tu organización "{organizationName}" en este momento.',
      contact: 'Si tienes preguntas sobre esta decisión, por favor contáctanos.',
      thanks: 'Agradecemos tu comprensión.'
    }
  },
  pt: {
    signupConfirmation: {
      subject: 'Confirmação: {opportunityTitle}',
      title: 'Confirmação de Inscrição',
      greeting: 'Olá {name},',
      confirmation: 'Sua inscrição para a seguinte oportunidade de voluntariado foi confirmada:',
      details: 'Detalhes do Evento',
      time: 'Horário',
      location: 'Localização',
      hours: 'Horas Estimadas',
      organization: 'Organização',
      reminder: 'Por favor, chegue 10 minutos antes e traga qualquer item necessário.',
      contact: 'Se você tiver alguma dúvida, entre em contato diretamente com a organização.',
      thanks: 'Obrigado por fazer voluntariado!'
    },
    reminder: {
      subject: 'Lembrete: {opportunityTitle} amanhã',
      title: 'Lembrete de Oportunidade de Voluntariado',
      greeting: 'Olá {name},',
      reminder: 'Este é um lembrete amigável sobre sua oportunidade de voluntariado amanhã:',
      details: 'Detalhes do Evento',
      time: 'Horário',
      location: 'Localização',
      hours: 'Horas Estimadas',
      organization: 'Organização',
      arrival: 'Por favor, chegue 10 minutos antes.',
      contact: 'Se você precisar cancelar ou tiver dúvidas, entre em contato com a organização.',
      thanks: 'Obrigado por fazer voluntariado!'
    },
    rollCall: {
      subject: 'Lista de Presença: {opportunityTitle}',
      title: 'Lista de Presença para Oportunidade de Voluntariado',
      greeting: 'Olá {name},',
      rollCall: 'Por favor confirme sua presença para a seguinte oportunidade de voluntariado:',
      details: 'Detalhes do Evento',
      time: 'Horário',
      location: 'Localização',
      hours: 'Horas Estimadas',
      organization: 'Organização',
      confirm: 'Confirmar Presença',
      thanks: 'Obrigado por fazer voluntariado!'
    },
    verification: {
      subject: 'Verifique seu endereço de email',
      title: 'Verificação de Email',
      greeting: 'Olá {name},',
      verification: 'Por favor verifique seu endereço de email clicando no botão abaixo:',
      verify: 'Verificar Email',
      thanks: 'Obrigado por se juntar ao Voluna!'
    },
    hoursAwarded: {
      subject: 'Horas Concedidas: {opportunityTitle}',
      title: 'Horas de Voluntariado Concedidas',
      greeting: 'Olá {name},',
      awarded: 'Suas horas de voluntariado foram concedidas para a seguinte oportunidade:',
      details: 'Detalhes do Evento',
      time: 'Horário',
      location: 'Localização',
      hours: 'Horas Concedidas',
      organization: 'Organização',
      thanks: 'Obrigado pelo seu serviço!'
    },
    organizationPending: {
      subject: 'Registro de Organização Pendente - {organizationName}',
      title: 'Registro de Organização Pendente',
      greeting: 'Olá {name},',
      pending: 'Obrigado por registrar sua organização no Voluna! O registro da sua organização está atualmente pendente de revisão.',
      details: 'Detalhes da Organização',
      organizationName: 'Nome da Organização',
      city: 'Cidade',
      contactEmail: 'Email de Contato',
      description: 'Descrição',
      review: 'Nossa equipe irá revisar sua organização dentro de 1-2 dias úteis. Você receberá uma notificação por email assim que sua organização for aprovada.',
      nextSteps: 'O que acontece em seguida:',
      step1: 'Revisaremos as informações da sua organização',
      step2: 'Você receberá notificação de aprovação por email',
      step3: 'Uma vez aprovada, você pode começar a criar oportunidades de voluntariado',
      thanks: 'Obrigado pela sua paciência!'
    },
    organizationAdminNotification: {
      subject: 'Novo Registro de Organização - {organizationName}',
      title: 'Novo Registro de Organização',
      greeting: 'Olá Baron,',
      notification: 'Uma nova organização foi registrada e requer sua aprovação:',
      details: 'Detalhes da Organização',
      organizationName: 'Nome da Organização',
      city: 'Cidade',
      contactEmail: 'Email de Contato',
      description: 'Descrição',
      ownerDetails: 'Proprietário da Organização',
      ownerName: 'Nome do Proprietário',
      ownerEmail: 'Email do Proprietário',
      approve: 'Aprovar Organização',
      reject: 'Rejeitar Organização',
      instructions: 'Clique no botão aprovar acima para ativar esta organização, ou rejeitar se não atender aos seus critérios.'
    },
    organizationApproved: {
      subject: 'Organização Aprovada - {organizationName}',
      title: 'Sua Organização Foi Aprovada',
      greeting: 'Olá {name},',
      approved: 'Boas notícias! Sua organização "{organizationName}" foi aprovada e agora está ativa no Voluna.',
      nextSteps: 'O que você pode fazer agora:',
      step1: 'Criar oportunidades de voluntariado',
      step2: 'Gerenciar o perfil da sua organização',
      step3: 'Conectar-se com voluntários na sua comunidade',
      thanks: 'Obrigado por fazer parte do Voluna!'
    },
    organizationRejected: {
      subject: 'Organização Rejeitada - {organizationName}',
      title: 'Atualização do Registro da Organização',
      greeting: 'Olá {name},',
      rejected: 'Obrigado pelo seu interesse no Voluna. Após a análise, não podemos aprovar sua organização "{organizationName}" neste momento.',
      contact: 'Se você tiver dúvidas sobre esta decisão, entre em contato conosco.',
      thanks: 'Agradecemos sua compreensão.'
    }
  }
};

// Helper function to replace placeholders in text
function replacePlaceholders(text: string, data: EmailTemplateData): string {
  return text
    .replace(/{name}/g, data.name || '')
    .replace(/{opportunityTitle}/g, data.opportunityTitle || '')
    .replace(/{startTime}/g, data.startTime || '')
    .replace(/{endTime}/g, data.endTime || '')
    .replace(/{location}/g, data.location || '')
    .replace(/{estimatedHours}/g, data.estimatedHours?.toString() || '')
    .replace(/{organizationName}/g, data.organizationName || '')
    .replace(/{organizationDescription}/g, data.organizationDescription || '')
    .replace(/{organizationCity}/g, data.organizationCity || '')
    .replace(/{contactEmail}/g, data.contactEmail || '')
    .replace(/{ownerName}/g, data.ownerName || '')
    .replace(/{ownerEmail}/g, data.ownerEmail || '');
}

// Base email wrapper with consistent styling
export function createEmailWrapper(content: string, title?: string, lang: Language = 'es') {
  return `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'Voluna'}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #374151; 
          margin: 0; 
          padding: 0; 
          background-color: #f9fafb;
        }
        .email-container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); 
          padding: 40px 30px; 
          text-align: center; 
          color: white;
        }
        .header h1 { 
          margin: 0; 
          font-size: 28px; 
          font-weight: 700; 
        }
        .header p { 
          margin: 10px 0 0 0; 
          opacity: 0.9; 
          font-size: 16px;
        }
        .content { 
          padding: 40px 30px; 
        }
        .highlight-box { 
          background-color: #f0fdf4; 
          border: 1px solid #bbf7d0; 
          border-radius: 12px; 
          padding: 24px; 
          margin: 24px 0; 
        }
        .warning-box { 
          background-color: #fef3c7; 
          border: 1px solid #fde68a; 
          border-radius: 12px; 
          padding: 24px; 
          margin: 24px 0; 
        }
        .info-box { 
          background-color: #eff6ff; 
          border: 1px solid #bfdbfe; 
          border-radius: 12px; 
          padding: 24px; 
          margin: 24px 0; 
        }
        .cta-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); 
          color: white; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600; 
          font-size: 16px; 
          margin: 20px 0; 
          box-shadow: 0 4px 6px rgba(22, 163, 74, 0.25);
          transition: all 0.2s ease;
        }
        .cta-button:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 6px 12px rgba(22, 163, 74, 0.3);
        }
        .details-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 16px; 
          margin: 20px 0; 
        }
        .detail-item { 
          background-color: #f9fafb; 
          padding: 16px; 
          border-radius: 8px; 
          border-left: 4px solid #16a34a; 
        }
        .detail-label { 
          font-weight: 600; 
          color: #374151; 
          margin-bottom: 4px; 
        }
        .detail-value { 
          color: #6b7280; 
        }
        .footer { 
          background-color: #f9fafb; 
          padding: 30px; 
          text-align: center; 
          color: #6b7280; 
          font-size: 14px; 
        }
        @media (max-width: 600px) {
          .details-grid { 
            grid-template-columns: 1fr; 
          }
          .content { 
            padding: 20px; 
          }
          .header { 
            padding: 30px 20px; 
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Voluna</h1>
          <p>${title || 'Volunteer Platform'}</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>© 2024 Voluna. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Multi-language email template functions
export function createSignupConfirmationEmail(data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang].signupConfirmation;
  
  const htmlContent = `
    <p>${replacePlaceholders(t.greeting, data)}</p>
    
    <p>${replacePlaceholders(t.confirmation, data)}</p>
    
    <div class="highlight-box">
      <h3>${t.details}</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">${t.time}</div>
          <div class="detail-value">${data.startTime} - ${data.endTime}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.location}</div>
          <div class="detail-value">${data.location}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.hours}</div>
          <div class="detail-value">${data.estimatedHours}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.organization}</div>
          <div class="detail-value">${data.organizationName}</div>
        </div>
      </div>
    </div>
    
    <div class="warning-box">
      <p><strong>${t.reminder}</strong></p>
      <p>${t.contact}</p>
    </div>
    
    <p>${t.thanks}</p>
  `;
  
  return createEmailWrapper(htmlContent, t.title, lang);
}

export function createReminderEmail(data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang].reminder;
  
  const htmlContent = `
    <p>${replacePlaceholders(t.greeting, data)}</p>
    
    <p>${replacePlaceholders(t.reminder, data)}</p>
    
    <div class="highlight-box">
      <h3>${t.details}</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">${t.time}</div>
          <div class="detail-value">${data.startTime} - ${data.endTime}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.location}</div>
          <div class="detail-value">${data.location}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.hours}</div>
          <div class="detail-value">${data.estimatedHours}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.organization}</div>
          <div class="detail-value">${data.organizationName}</div>
        </div>
      </div>
    </div>
    
    <div class="warning-box">
      <p><strong>${t.arrival}</strong></p>
      <p>${t.contact}</p>
    </div>
    
    <p>${t.thanks}</p>
  `;
  
  return createEmailWrapper(htmlContent, t.title, lang);
}

export function createRollCallEmail(data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang].rollCall;
  
  const htmlContent = `
    <p>${replacePlaceholders(t.greeting, data)}</p>
    
    <p>${replacePlaceholders(t.rollCall, data)}</p>
    
    <div class="highlight-box">
      <h3>${t.details}</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">${t.time}</div>
          <div class="detail-value">${data.startTime} - ${data.endTime}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.location}</div>
          <div class="detail-value">${data.location}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.hours}</div>
          <div class="detail-value">${data.estimatedHours}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.organization}</div>
          <div class="detail-value">${data.organizationName}</div>
        </div>
      </div>
    </div>
    
    <div class="info-box">
      <a href="${data.rollCallUrl}" class="cta-button">${t.confirm}</a>
    </div>
    
    <p>${t.thanks}</p>
  `;
  
  return createEmailWrapper(htmlContent, t.title, lang);
}

export function createVerificationEmail(data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang].verification;
  
  const htmlContent = `
    <p>${replacePlaceholders(t.greeting, data)}</p>
    
    <p>${t.verification}</p>
    
    <div class="info-box">
      <a href="${data.verificationUrl}" class="cta-button">${t.verify}</a>
    </div>
    
    <p>${t.thanks}</p>
  `;
  
  return createEmailWrapper(htmlContent, t.title, lang);
}

export function createHoursAwardedEmail(data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang].hoursAwarded;
  
  const htmlContent = `
    <p>${replacePlaceholders(t.greeting, data)}</p>
    
    <p>${replacePlaceholders(t.awarded, data)}</p>
    
    <div class="highlight-box">
      <h3>${t.details}</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">${t.time}</div>
          <div class="detail-value">${data.startTime} - ${data.endTime}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.location}</div>
          <div class="detail-value">${data.location}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.hours}</div>
          <div class="detail-value">${data.estimatedHours}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.organization}</div>
          <div class="detail-value">${data.organizationName}</div>
        </div>
      </div>
    </div>
    
    <p>${t.thanks}</p>
  `;
  
  return createEmailWrapper(htmlContent, t.title, lang);
}

export function createOrganizationVerificationEmail(data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang].organizationAdminNotification;
  
  const htmlContent = `
    <p>${replacePlaceholders(t.greeting, data)}</p>
    
    <p>${replacePlaceholders(t.notification, data)}</p>
    
    <div class="highlight-box">
      <h3>${t.details}</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">${t.organizationName}</div>
          <div class="detail-value">${data.organizationName}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.city}</div>
          <div class="detail-value">${data.organizationCity}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.contactEmail}</div>
          <div class="detail-value">${data.contactEmail}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.description}</div>
          <div class="detail-value">${data.organizationDescription}</div>
        </div>
      </div>
    </div>
    
    <div class="highlight-box">
      <h3>${t.ownerDetails}</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">${t.ownerName}</div>
          <div class="detail-value">${data.ownerName}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.ownerEmail}</div>
          <div class="detail-value">${data.ownerEmail}</div>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.verificationUrl}&action=approve" class="cta-button" style="background: #16a34a; margin-right: 10px;">
        ${t.approve}
      </a>
      <a href="${data.verificationUrl}&action=reject" class="cta-button" style="background: #dc2626;">
        ${t.reject}
      </a>
    </div>
    
    <div class="info-box">
      <p>${t.instructions}</p>
    </div>
  `;
  
  return createEmailWrapper(htmlContent, t.title, lang);
}

export function createOrganizationPendingVerificationEmail(data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang].organizationPending;
  
  const htmlContent = `
    <p>${replacePlaceholders(t.greeting, data)}</p>
    
    <p>${replacePlaceholders(t.pending, data)}</p>
    
    <div class="highlight-box">
      <h3>${t.details}</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">${t.organizationName}</div>
          <div class="detail-value">${data.organizationName}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.city}</div>
          <div class="detail-value">${data.organizationCity}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.contactEmail}</div>
          <div class="detail-value">${data.contactEmail}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">${t.description}</div>
          <div class="detail-value">${data.organizationDescription}</div>
        </div>
      </div>
    </div>
    
    <div class="info-box">
      <p>${t.review}</p>
      <h4 style="margin-top: 20px;">${t.nextSteps}</h4>
      <ol style="padding-left: 20px;">
        <li>${t.step1}</li>
        <li>${t.step2}</li>
        <li>${t.step3}</li>
      </ol>
    </div>
    
    <p>${t.thanks}</p>
  `;
  
  return createEmailWrapper(htmlContent, t.title, lang);
}

export function createOrganizationApprovedEmail(data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang].organizationApproved;
  const htmlContent = `
    <p>${replacePlaceholders(t.greeting, data)}</p>
    <div class="highlight-box">
      <h3>${t.title}</h3>
      <p>${replacePlaceholders(t.approved, data)}</p>
    </div>
    <div class="info-box">
      <h4>${t.nextSteps}</h4>
      <ul style="padding-left: 20px;">
        <li>${t.step1}</li>
        <li>${t.step2}</li>
        <li>${t.step3}</li>
      </ul>
    </div>
    <p>${t.thanks}</p>
  `;
  return createEmailWrapper(htmlContent, t.title, lang);
}

export function createOrganizationRejectedEmail(data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang].organizationRejected;
  const htmlContent = `
    <p>${replacePlaceholders(t.greeting, data)}</p>
    <div class="warning-box">
      <h3>${t.title}</h3>
      <p>${replacePlaceholders(t.rejected, data)}</p>
      <p>${t.contact}</p>
    </div>
    <p>${t.thanks}</p>
  `;
  return createEmailWrapper(htmlContent, t.title, lang);
}

// Helper function to get email subject
export function getEmailSubject(type: keyof typeof emailTranslations.en, data: EmailTemplateData, lang: Language = 'es'): string {
  const t = emailTranslations[lang][type];
  return replacePlaceholders(t.subject, data);
} 