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

export async function getTemplates(userId: string): Promise<Template[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'templates'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Template));
}

export async function getTemplate(userId: string, templateId: string): Promise<Template | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'templates', templateId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Template;
}

// Guarda la plantilla pre-cargada de marketing si no existe todavía
export async function ensureBuiltinTemplate(userId: string): Promise<void> {
  const existing = await getTemplates(userId);
  const hasMarketing = existing.some(t => t.builtin && t.name === MARKETING_TEMPLATE.name);
  if (!hasMarketing) {
    await setDoc(
      doc(collection(db, 'users', userId, 'templates')),
      {
        ...MARKETING_TEMPLATE,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
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
