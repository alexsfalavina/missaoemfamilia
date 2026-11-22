import { NextRequest, NextResponse } from 'next/server';
import {
  createLead,
  deleteLead,
  listLeads,
  updateLeadStage,
} from '@/lib/store/repository';
import type { LeadInterestType, LeadStage, PotentialCustomerLead } from '@/types/marketing';

const VALID_INTERESTS = new Set<LeadInterestType>([
  'mentoria',
  'avaliacao_familiar',
  'informacao',
]);
const VALID_CHANNELS = new Set<PotentialCustomerLead['channel']>([
  'direct',
  'comentario',
  'link_bio',
  'whatsapp',
]);
const VALID_STAGES = new Set<LeadStage>(['novo', 'em_conversa', 'agendado', 'concluido']);

export async function GET() {
  try {
    const leads = await listLeads();
    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Erro ao listar interessados:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar os registros de interessados.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contactName = String(body?.contactName ?? '').trim();
    const interestType = body?.interestType as LeadInterestType;
    const channel = (body?.channel as PotentialCustomerLead['channel']) || 'direct';

    if (!contactName) {
      return NextResponse.json(
        { error: 'Informe o nome ou identificação da pessoa interessada.' },
        { status: 400 }
      );
    }

    if (!VALID_INTERESTS.has(interestType)) {
      return NextResponse.json(
        { error: 'Selecione um tipo de interesse válido (Mentoria, Avaliação Familiar ou Informação).' },
        { status: 400 }
      );
    }

    const lead = await createLead({
      contactName,
      instagramHandle: body?.instagramHandle ? String(body.instagramHandle) : undefined,
      interestType,
      sourcePostId: body?.sourcePostId ? String(body.sourcePostId) : undefined,
      channel: VALID_CHANNELS.has(channel) ? channel : 'direct',
      notes: body?.notes ? String(body.notes) : undefined,
    });

    return NextResponse.json(
      {
        lead,
        message: 'Interessado real registrado no acompanhamento comercial.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao registrar interessado:', error);
    return NextResponse.json(
      { error: 'Não foi possível registrar o contato interessado.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body?.id ?? '').trim();
    const stage = body?.stage as LeadStage;

    if (!id || !VALID_STAGES.has(stage)) {
      return NextResponse.json(
        { error: 'Informe um ID e estágio válidos para atualizar.' },
        { status: 400 }
      );
    }

    const updated = await updateLeadStage(id, stage, body?.notes);
    if (!updated) {
      return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      lead: updated,
      message: 'Estágio do interessado atualizado.',
    });
  } catch (error) {
    console.error('Erro ao atualizar estágio do interessado:', error);
    return NextResponse.json(
      { error: 'Não foi possível atualizar o registro.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Informe o ID do registro.' }, { status: 400 });
    }
    const removed = await deleteLead(id);
    if (!removed) {
      return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, message: 'Registro removido.' });
  } catch (error) {
    console.error('Erro ao remover interessado:', error);
    return NextResponse.json(
      { error: 'Não foi possível remover o registro.' },
      { status: 500 }
    );
  }
}
