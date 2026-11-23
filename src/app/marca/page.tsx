'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Palette,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import type { BrandProfile } from '@/types/marketing';
import {
  ErrorBanner,
  LoadingCards,
  ToastMessage,
} from '@/components/FeedbackStates';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

export default function BrandProfilePage() {
  const { canEdit } = useCurrentUser();
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newService, setNewService] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newPillar, setNewPillar] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadBrand = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/brand', { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar o perfil da marca.');
      const data = await res.json();
      setBrand(data.brand);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand) return;
    setSaving(true);
    try {
      const res = await fetch('/api/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar perfil.');
      setBrand(data.brand);
      showToast('success', data.message || 'Perfil da marca salvo com sucesso!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Falha ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao restaurar.');
      setBrand(data.brand);
      showToast('info', data.message || 'Perfil padrão restaurado.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Não foi possível restaurar.');
    } finally {
      setSaving(false);
    }
  };

  const addService = () => {
    if (!brand || !newService.trim()) return;
    setBrand({
      ...brand,
      servicesOffered: [...brand.servicesOffered, newService.trim()],
    });
    setNewService('');
  };

  const removeService = (idx: number) => {
    if (!brand) return;
    setBrand({
      ...brand,
      servicesOffered: brand.servicesOffered.filter((_, i) => i !== idx),
    });
  };

  const addObjective = () => {
    if (!brand || !newObjective.trim()) return;
    setBrand({
      ...brand,
      businessObjectives: [...brand.businessObjectives, newObjective.trim()],
    });
    setNewObjective('');
  };

  const removeObjective = (idx: number) => {
    if (!brand) return;
    setBrand({
      ...brand,
      businessObjectives: brand.businessObjectives.filter((_, i) => i !== idx),
    });
  };

  const addPillar = () => {
    if (!brand || !newPillar.trim()) return;
    setBrand({
      ...brand,
      positioningPillars: [...brand.positioningPillars, newPillar.trim()],
    });
    setNewPillar('');
  };

  const removePillar = (idx: number) => {
    if (!brand) return;
    setBrand({
      ...brand,
      positioningPillars: brand.positioningPillars.filter((_, i) => i !== idx),
    });
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Perfil da Marca — Jessica Nalin</h1>
        </div>
        <LoadingCards count={3} />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div>
        <div className="page-header">
          <h1>Perfil da Marca</h1>
        </div>
        <ErrorBanner message={error || 'Não foi possível abrir o perfil.'} onRetry={loadBrand} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className="page-header">
        <div>
          <h1>Perfil da Marca — Jessica Nalin</h1>
          <p className="page-description">
            Defina posicionamento profissional, serviços reais, informações comerciais verificadas,
            tom de voz e identidade visual. A IA utiliza somente informações verificadas deste
            perfil.
          </p>
        </div>
        {canEdit && (
          <div className="page-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw size={15} />
              Restaurar padrão
            </button>
            <button
              type="submit"
              id="brand-save-btn"
              className="btn btn-primary"
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        )}
      </div>

      <div className="two-col-grid" style={{ alignItems: 'start' }}>
        {/* Coluna Principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Identidade & Posicionamento Profissional</h2>
                <p className="card-subtitle">Base de credibilidade utilizada na criação de conteúdos</p>
              </div>
              <Sparkles size={18} color="var(--purple-600)" />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="brand-name">
                  Nome da marca
                </label>
                <input
                  id="brand-name"
                  type="text"
                  className="input"
                  value={brand.brandName}
                  onChange={(e) => setBrand({ ...brand, brandName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="brand-instagram">
                  Perfil do Instagram
                </label>
                <input
                  id="brand-instagram"
                  type="text"
                  className="input"
                  value={brand.instagramHandle}
                  onChange={(e) => setBrand({ ...brand, instagramHandle: e.target.value })}
                  required
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="brand-instagram-url">
                  URL oficial do Instagram
                </label>
                <input
                  id="brand-instagram-url"
                  type="url"
                  className="input"
                  value={brand.instagramUrl || 'https://www.instagram.com/eujessynalin/'}
                  onChange={(e) => setBrand({ ...brand, instagramUrl: e.target.value })}
                  required
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="brand-niche">
                  Nicho de atuação
                </label>
                <input
                  id="brand-niche"
                  type="text"
                  className="input"
                  value={brand.niche}
                  onChange={(e) => setBrand({ ...brand, niche: e.target.value })}
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="brand-audience">
                  Público-alvo
                </label>
                <textarea
                  id="brand-audience"
                  className="textarea"
                  value={brand.targetAudience}
                  onChange={(e) => setBrand({ ...brand, targetAudience: e.target.value })}
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="brand-voice">
                  Tom de voz da marca
                </label>
                <textarea
                  id="brand-voice"
                  className="textarea"
                  value={brand.brandVoice}
                  onChange={(e) => setBrand({ ...brand, brandVoice: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <span className="form-label" style={{ display: 'block', marginBottom: 8 }}>
                Pilares de Posicionamento Profissional
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {brand.positioningPillars.map((pillar, idx) => (
                  <span
                    key={`${pillar}-${idx}`}
                    className="badge badge-purple"
                    style={{ gap: 6, padding: '5px 10px' }}
                  >
                    {pillar}
                    <button
                      type="button"
                      onClick={() => removePillar(idx)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                      }}
                      aria-label={`Remover pilar ${pillar}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Adicionar especialidade ou pilar..."
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPillar();
                    }
                  }}
                />
                <button type="button" className="btn btn-secondary" onClick={addPillar}>
                  <Plus size={15} />
                  Adicionar
                </button>
              </div>
            </div>
          </section>

          {/* Informações Comerciais Verificadas */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Informações Comerciais Verificadas</h2>
                <p className="card-subtitle">
                  Fonte única de verdade para posts comerciais — a IA nunca inventa vagas,
                  depoimentos ou ofertas relâmpago
                </p>
              </div>
              <ShieldCheck size={18} color="var(--green-600)" />
            </div>

            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label" htmlFor="comm-enrollment">
                  Como os interessados entram em contato / processo real de atendimento
                </label>
                <textarea
                  id="comm-enrollment"
                  className="textarea"
                  value={brand.verifiedCommercialInfo.enrollmentProcess}
                  onChange={(e) =>
                    setBrand({
                      ...brand,
                      verifiedCommercialInfo: {
                        ...brand.verifiedCommercialInfo,
                        enrollmentProcess: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="comm-format">
                  Formato verificado dos atendimentos
                </label>
                <input
                  id="comm-format"
                  type="text"
                  className="input"
                  value={brand.verifiedCommercialInfo.consultationFormat}
                  onChange={(e) =>
                    setBrand({
                      ...brand,
                      verifiedCommercialInfo: {
                        ...brand.verifiedCommercialInfo,
                        consultationFormat: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="comm-offer">
                  Nota de agenda / condição ativa confirmada por Jessica (opcional)
                </label>
                <textarea
                  id="comm-offer"
                  className="textarea"
                  style={{ minHeight: 72 }}
                  value={brand.verifiedCommercialInfo.activeOfferNote}
                  onChange={(e) =>
                    setBrand({
                      ...brand,
                      verifiedCommercialInfo: {
                        ...brand.verifiedCommercialInfo,
                        activeOfferNote: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="comm-avoid">
                  Diretrizes rígidas de veracidade (o que a IA nunca deve afirmar)
                </label>
                <textarea
                  id="comm-avoid"
                  className="textarea"
                  style={{ minHeight: 72 }}
                  value={brand.verifiedCommercialInfo.avoidClaimsNote}
                  onChange={(e) =>
                    setBrand({
                      ...brand,
                      verifiedCommercialInfo: {
                        ...brand.verifiedCommercialInfo,
                        avoidClaimsNote: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </section>

          {/* Serviços Oferecidos */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Serviços Oferecidos (Verificados)</h2>
                <p className="card-subtitle">
                  Serviços reais que podem ser conectados naturalmente aos conteúdos
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {brand.servicesOffered.map((service, idx) => (
                <div
                  key={`${service}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-subtle)',
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{service}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => removeService(idx)}
                    aria-label={`Remover serviço ${service}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input"
                placeholder="Adicionar novo serviço verificado..."
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addService();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={addService}>
                <Plus size={15} />
                Adicionar
              </button>
            </div>
          </section>

          {/* Objetivos de Negócio */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Objetivos de Negócio</h2>
                <p className="card-subtitle">
                  Equilíbrio entre crescimento, autoridade profissional e captação ética
                </p>
              </div>
              <Target size={18} color="var(--green-600)" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {brand.businessObjectives.map((obj, idx) => (
                <div
                  key={`${obj}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--green-50)',
                    border: '1px solid var(--green-100)',
                  }}
                >
                  <span style={{ fontSize: '0.87rem', color: 'var(--green-800)', fontWeight: 600 }}>
                    {obj}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => removeObjective(idx)}
                    aria-label="Remover objetivo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input"
                placeholder="Adicionar novo objetivo..."
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addObjective();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={addObjective}>
                <Plus size={15} />
                Adicionar
              </button>
            </div>
          </section>
        </div>

        {/* Coluna Lateral: Identidade Visual & Acesso à Biblioteca de Mídia Autêntica */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Identidade Visual</h2>
                <p className="card-subtitle">Paleta roxa & verde e diretrizes de autenticidade</p>
              </div>
              <Palette size={18} color="var(--purple-600)" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="color-primary">
                  Cor primária (Roxo Ametista)
                </label>
                <div className="color-input-row">
                  <input
                    id="color-primary"
                    type="color"
                    className="color-swatch-picker"
                    value={brand.visualIdentity.primaryColor}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        visualIdentity: { ...brand.visualIdentity, primaryColor: e.target.value },
                      })
                    }
                  />
                  <input
                    type="text"
                    className="input"
                    value={brand.visualIdentity.primaryColor}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        visualIdentity: { ...brand.visualIdentity, primaryColor: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="color-secondary">
                  Cor secundária (Verde Sálvia)
                </label>
                <div className="color-input-row">
                  <input
                    id="color-secondary"
                    type="color"
                    className="color-swatch-picker"
                    value={brand.visualIdentity.secondaryColor}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        visualIdentity: {
                          ...brand.visualIdentity,
                          secondaryColor: e.target.value,
                        },
                      })
                    }
                  />
                  <input
                    type="text"
                    className="input"
                    value={brand.visualIdentity.secondaryColor}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        visualIdentity: {
                          ...brand.visualIdentity,
                          secondaryColor: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="color-accent">
                  Cor de destaque (Dourado Método ALMA)
                </label>
                <div className="color-input-row">
                  <input
                    id="color-accent"
                    type="color"
                    className="color-swatch-picker"
                    value={brand.visualIdentity.accentColor}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        visualIdentity: { ...brand.visualIdentity, accentColor: e.target.value },
                      })
                    }
                  />
                  <input
                    type="text"
                    className="input"
                    value={brand.visualIdentity.accentColor}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        visualIdentity: { ...brand.visualIdentity, accentColor: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="brand-guidelines">
                  Diretrizes visuais e autenticidade
                </label>
                <textarea
                  id="brand-guidelines"
                  className="textarea"
                  value={brand.visualIdentity.visualGuidelines}
                  onChange={(e) =>
                    setBrand({
                      ...brand,
                      visualIdentity: {
                        ...brand.visualIdentity,
                        visualGuidelines: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Logos Oficiais & Mídia Autêntica</h2>
                <p className="card-subtitle">
                  Envie fotografias reais de Jessica para conteúdos de autoridade
                </p>
              </div>
              <Link href="/conteudo?tab=midia" className="btn btn-sm btn-secondary">
                <ImageIcon size={14} />
                Biblioteca
              </Link>
            </div>

            <div className="equal-two-col" style={{ gap: 12, marginBottom: 12 }}>
              {[
                { src: '/brand/jessy-logo.jpg', label: 'Logo Principal' },
                { src: '/brand/jn-monogram.jpg', label: 'Monograma JN' },
                { src: '/brand/metodo-alma.jpg', label: 'Método ALMA' },
              ].map((asset) => (
                <div
                  key={asset.label}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: 10,
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={asset.src}
                    alt={asset.label}
                    style={{
                      width: '100%',
                      height: 76,
                      objectFit: 'contain',
                      borderRadius: 8,
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {asset.label}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                background: 'var(--purple-50)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <strong>Compromisso de autenticidade:</strong> imagens geradas por IA nunca são
              apresentadas como fotografias reais de Jessica. Envie fotos pessoais e profissionais
              na <Link href="/conteudo?tab=midia" style={{ color: 'var(--purple-700)', fontWeight: 700, textDecoration: 'underline' }}>Biblioteca de Mídia</Link>.
            </div>
          </section>
        </aside>
      </div>

      <ToastMessage toast={toast} />
    </form>
  );
}
