'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Palette,
  Plus,
  RotateCcw,
  Save,
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

export default function BrandProfilePage() {
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newService, setNewService] = useState('');
  const [newObjective, setNewObjective] = useState('');
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
            Defina posicionamento, serviços, tom de voz, identidade visual e objetivos de negócio.
            Toda estratégia e legenda gerada pela IA segue estas diretrizes.
          </p>
        </div>
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
      </div>

      <div className="two-col-grid" style={{ alignItems: 'start' }}>
        {/* Coluna Principal: Dados Editáveis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Identidade & Posicionamento</h2>
                <p className="card-subtitle">Informações centrais da marca no Instagram</p>
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
          </section>

          {/* Serviços Oferecidos */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Serviços Oferecidos</h2>
                <p className="card-subtitle">
                  Produtos e mentorias que a IA deve promover para gerar clientes
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
                placeholder="Adicionar novo serviço ou mentoria..."
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
                  Foco em captação de clientes reais, não apenas métricas de vaidade
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
                placeholder="Adicionar novo objetivo comercial..."
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

        {/* Coluna Lateral: Identidade Visual & Ativos Reais */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Identidade Visual</h2>
                <p className="card-subtitle">Paleta roxa & verde e tipografia oficial</p>
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
                  Diretrizes visuais para o Designer IA
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
                <h2 className="card-title">Ativos Oficiais da Marca</h2>
                <p className="card-subtitle">Logos e retrato aplicados automaticamente nas artes</p>
              </div>
            </div>

            <div className="equal-two-col" style={{ gap: 12 }}>
              {[
                { src: '/brand/jessy-logo.jpg', label: 'Logo Principal' },
                { src: '/brand/jn-monogram.jpg', label: 'Monograma JN' },
                { src: '/brand/metodo-alma.jpg', label: 'Método ALMA' },
                { src: '/brand/jessica-portrait.jpg', label: 'Retrato Jessica' },
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
                      height: 86,
                      objectFit: asset.label === 'Retrato Jessica' ? 'cover' : 'contain',
                      borderRadius: 8,
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {asset.label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <ToastMessage toast={toast} />
    </form>
  );
}
