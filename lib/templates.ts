import {
  collection, doc, setDoc, getDocs, getDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProposalSection } from '@/lib/proposals';

export interface Template {
  id?:          string;
  name:         string;
  title:        string;       // título default de la propuesta
  sections:     ProposalSection[];
  totalAmount:  number;
  notes:        string;
  builtin:      boolean;      // plantilla pre-cargada del sistema
  createdAt?:   unknown;
  updatedAt?:   unknown;
}

// Plantilla pre-cargada: Campaña completa de marketing
export const MARKETING_TEMPLATE: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Campaña completa de marketing',
  title: 'Campaña completa de marketing',
  builtin: true,
  totalAmount: 2000000,
  notes: '',
  sections: [
    {
      id: 's1',
      title: 'Campaña de Meta Ads',
      description: 'Incluye la planificación, configuración y puesta en marcha de una campaña publicitaria en Meta orientada a conversión.\n\nLa campaña inicial se plantea como una etapa de testeo e incluye:',
      bullets: [
        'Configuración completa de la campaña.',
        'Creación de conjuntos de anuncios.',
        'Configuración de eventos de conversión.',
        'Segmentación inicial de públicos.',
        'Testeo de horarios, edades e intereses.',
        'Optimización inicial de la campaña.',
        'Análisis de resultados para determinar qué anuncios merecen ser escalados.',
      ],
      isInfo: false,
    },
    {
      id: 's2',
      title: 'Producción de creativos',
      description: 'La campaña contempla la producción inicial de:\n\n* 2 videos publicitarios de entre 15 y 20 segundos.\n* 1 imagen estática utilizando el mismo ángulo de venta.\n\nAntes de producir las piezas se define el enfoque comercial, el guion y la estrategia del mensaje.',
      bullets: [
        '2 videos publicitarios de 15 a 20 segundos.',
        '1 imagen estática con el mismo ángulo de venta.',
        'Definición de enfoque comercial, guion y estrategia del mensaje.',
      ],
      isInfo: false,
    },
    {
      id: 's3',
      title: 'Automatización inteligente de WhatsApp',
      description: 'Incluye la configuración completa de una automatización integrada con Meta.\n\nEl sistema puede:',
      bullets: [
        'Responder mensajes de texto y audios.',
        'Comprender preguntas abiertas mediante inteligencia artificial.',
        'Brindar información sobre el evento o servicio.',
        'Resolver consultas frecuentes.',
        'Guiar al usuario durante el proceso de compra.',
        'Agendar llamadas y gestionar reservas.',
        'Cobrar entradas o productos mediante el medio de pago definido.',
        'Realizar seguimiento automático de los interesados.',
        'Configuración del Portfolio Comercial de Meta y vinculación con WhatsApp.',
        'Diseño del flujo conversacional según el producto, servicio o evento.',
      ],
      isInfo: false,
    },
    {
      id: 's4',
      title: 'Landing page de conversión',
      description: 'Desarrollo de una landing enfocada exclusivamente en convertir visitantes en consultas o ventas.\n\nLa estructura contempla hasta cinco secciones principales para presentar toda la información necesaria sin generar sobrecarga de contenido.',
      bullets: [
        'Diseño responsive y optimizado para dispositivos móviles.',
        'Call To Actions estratégicos.',
        'Integración con Meta Pixel y eventos necesarios.',
        'Integración con la automatización de WhatsApp.',
        'Formato tradicional o experiencia interactiva/cinematográfica.',
      ],
      isInfo: false,
    },
    {
      id: 's5',
      title: 'Panel de administración y analítica',
      description: 'Se incluye un panel de administración donde es posible visualizar en tiempo real:',
      bullets: [
        'Conversaciones iniciadas.',
        'Anuncio que originó cada conversación.',
        'Rendimiento individual de cada anuncio.',
        'Costos por conversión.',
        'Conversiones obtenidas.',
        'Estado de cada lead y seguimiento comercial.',
        'Envío de información de retorno a Meta para optimización del algoritmo.',
        'Integración completa de la infraestructura de medición.',
      ],
      isInfo: false,
    },
    {
      id: 's6',
      title: 'Mantenimiento',
      description: 'El servicio contempla un mantenimiento periódico para garantizar el correcto funcionamiento de toda la infraestructura.',
      bullets: [
        'Monitoreo de campañas.',
        'Ajustes menores.',
        'Mantenimiento de la automatización.',
        'Supervisión del panel de administración.',
        'Verificación de eventos y conversiones.',
        'Actualizaciones de funcionamiento cuando sean necesarias.',
      ],
      isInfo: true,
    },
    {
      id: 's7',
      title: 'Presupuesto publicitario',
      description: 'El presupuesto destinado a anuncios se invierte directamente en Meta y no forma parte del presente presupuesto.\n\nComo referencia, la etapa inicial suele comenzar con una inversión diaria destinada a testear los distintos anuncios y públicos. Una vez identificados los anuncios con mejor rendimiento, el presupuesto puede incrementarse de manera progresiva para maximizar el retorno de la inversión.',
      bullets: [],
      isInfo: true,
    },
    {
      id: 's8',
      title: 'Consideraciones',
      description: 'El presente presupuesto contempla la implementación completa de la estructura de marketing.\n\nLos resultados dependerán, entre otros factores, de la propuesta comercial, el público objetivo, el precio del producto o servicio, la calidad de los creativos y la respuesta del mercado.\n\nEn caso de ser necesario producir nuevos anuncios o modificar significativamente la estrategia creativa luego del período de testeo, dichas tareas se presupuestarán por separado.',
      bullets: [],
      isInfo: true,
    },
  ],
};

// Plantilla pre-cargada: Branding & Identidad visual
export const BRANDING_TEMPLATE: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Branding e identidad visual',
  title: 'Branding e identidad visual',
  builtin: true,
  totalAmount: 1200000,
  notes: '',
  sections: [
    {
      id: 'b1',
      title: 'Diseño de identidad visual',
      description: 'Desarrollo de la identidad visual completa de la marca, incluyendo la creación de los elementos fundamentales que definirán la comunicación visual de la empresa.',
      bullets: [
        'Diseño de logotipo principal (versiones color, blanco/negro y simplificada).',
        'Selección de paleta cromática con colores primarios, secundarios y de acento.',
        'Definición de tipografía corporativa (títulos, cuerpo, digital).',
        'Creación de papelería básica: tarjeta, hoja membretada, firma de email.',
      ],
      isInfo: false,
    },
    {
      id: 'b2',
      title: 'Manual de marca',
      description: 'Documentación completa de la identidad visual para garantizar la correcta aplicación en todos los soportes.',
      bullets: [
        'Reglas de uso del logotipo, área de resguardo y usos incorrectos.',
        'Especificaciones cromáticas (CMYK, RGB, HEX, Pantone).',
        'Ejemplos de aplicación en soportes digitales y gráficos.',
        'Guía de tono de comunicación verbal y escrita.',
      ],
      isInfo: false,
    },
    {
      id: 'b3',
      title: 'Aplicaciones digitales',
      description: 'Implementación de la identidad visual en los principales canales digitales de la empresa.',
      bullets: [
        'Diseño de perfil de Instagram, LinkedIn y Facebook con la nueva identidad.',
        'Creación de plantilla para presentaciones comerciales (Google Slides / PPT).',
        'Diseño de placeholder para sitio web o landing page.',
        'Set de 5 templates para stories o posts de lanzamiento.',
      ],
      isInfo: false,
    },
    {
      id: 'b4',
      title: 'Entregables',
      description: 'Todos los archivos se entregan en formato editable y en alta resolución.',
      bullets: [
        'Archivos vectoriales editables (AI, EPS o SVG).',
        'Archivos en PNG con fondo transparente y fondo blanco.',
        'Archivos en PDF para impresión.',
        'Carpeta organizada por categorías con nomenclatura clara.',
      ],
      isInfo: true,
    },
    {
      id: 'b5',
      title: 'Consideraciones',
      description: 'El presente presupuesto incluye hasta dos rondas de revisión sobre las propuestas iniciales. Las modificaciones adicionales o la creación de nuevos elementos no contemplados se presupuestarán por separado.',
      bullets: [],
      isInfo: true,
    },
  ],
};

// Plantilla pre-cargada: Landing page avanzada con CRM
export const LANDING_CRM_TEMPLATE: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Landing page avanzada con CRM',
  title: 'Landing page avanzada con CRM',
  builtin: true,
  totalAmount: 2500000,
  notes: '',
  sections: [
    {
      id: 'l1',
      title: 'Landing page de alto impacto',
      description: 'Desarrollo de una landing page diseñada para maximizar conversiones, con una experiencia visual impactante y navegación fluida.',
      bullets: [
        'Diseño UI/UX exclusivo con animaciones de entrada y microinteracciones.',
        'Estructura modular de hasta 7 secciones (hero, servicios, beneficios, casos, FAQ, testimonios, formulario).',
        'Animaciones y transiciones con GSAP o Framer Motion.',
        'Optimización Core Web Vitals (LCP, FID, CLS).',
        'Responsive design adaptado a mobile, tablet y desktop.',
      ],
      isInfo: false,
    },
    {
      id: 'l2',
      title: 'Integración con CRM',
      description: 'Conexión completa con la plataforma CRM para automatizar la captura y gestión de leads.',
      bullets: [
        'Integración del formulario de contacto con el CRM vía API o webhook.',
        'Sincronización automática de leads con etiquetado por origen y campaña.',
        'Automatización de email de bienvenida y seguimiento.',
        'Panel de leads en el CRM con historial deinteracciones.',
        'Configuración de pipeline comercial con etapas personalizadas.',
      ],
      isInfo: false,
    },
    {
      id: 'l3',
      title: 'SEO técnico y analítica',
      description: 'Configuración completa de tracking y optimización para motores de búsqueda.',
      bullets: [
        'Configuración de Google Analytics 4 y Google Tag Manager.',
        'Implementación de Meta Pixel y eventos de conversión.',
        'Estructura SEO on-page: meta tags, Open Graph, schema markup.',
        'Sitemap XML y robots.txt optimizados.',
        'Configuración de Google Search Console.',
      ],
      isInfo: false,
    },
    {
      id: 'l4',
      title: 'Hosting y dominio',
      description: 'Se incluye la configuración inicial del entorno de producción.',
      bullets: [
        'Configuración de dominio personalizado y SSL.',
        'Hosting optimizado con CDN (Vercel, Netlify o similar).',
        'Formulario de contacto con protección anti-spam.',
        'Mantenimiento técnico por 30 días posteriores al lanzamiento.',
      ],
      isInfo: false,
    },
    {
      id: 'l5',
      title: 'Consideraciones',
      description: 'El presupuesto incluye hasta 3 rondas de revisión sobre el diseño aprobado. El contenido (textos, imágenes, videos) debe ser provisto por el cliente. Las integraciones adicionales o funcionalidades extra se presupuestarán por separado.',
      bullets: [],
      isInfo: true,
    },
  ],
};

// Lista de todas las plantillas built-in para precarga
const BUILTIN_TEMPLATES = [MARKETING_TEMPLATE, BRANDING_TEMPLATE, LANDING_CRM_TEMPLATE];

export async function getTemplates(userId: string): Promise<Template[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'templates'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Template));
}

export async function getTemplate(userId: string, templateId: string): Promise<Template | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'templates', templateId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Template;
}

// Guarda todas las plantillas built-in que falten
export async function ensureBuiltinTemplate(userId: string): Promise<void> {
  const existing = await getTemplates(userId);
  for (const tpl of BUILTIN_TEMPLATES) {
    const has = existing.some(t => t.builtin && t.name === tpl.name);
    if (!has) {
      await setDoc(
        doc(collection(db, 'users', userId, 'templates')),
        {
          ...tpl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }
  }
}

export async function saveTemplate(userId: string, data: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = doc(collection(db, 'users', userId, 'templates'));
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteTemplate(userId: string, templateId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'templates', templateId));
}
