/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from 'react';

export function KakujaImageSlot({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(file.type)) {setError('Selecione uma imagem JPG, PNG, WebP, GIF ou AVIF.'); return;}
    if (file.size > 20 * 1024 * 1024) {setError('A imagem deve ter no máximo 20 MB.'); return;}
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const picture = new Image();
      await new Promise<void>((resolve,reject) => {picture.onload=()=>resolve();picture.onerror=()=>reject(new Error('Não foi possível ler essa imagem.'));picture.src=url;});
      const canvas = document.createElement('canvas');
      let size=1200, encoded='';
      for (let attempt=0; attempt<4; attempt++) {
        const scale=Math.min(1,size/Math.max(picture.naturalWidth,picture.naturalHeight));
        canvas.width=Math.max(1,Math.round(picture.naturalWidth*scale));canvas.height=Math.max(1,Math.round(picture.naturalHeight*scale));
        const context=canvas.getContext('2d');
        if (!context) throw new Error('O navegador não conseguiu preparar a imagem.');
        context.drawImage(picture,0,0,canvas.width,canvas.height);
        encoded=canvas.toDataURL('image/webp',.82-attempt*.08);
        if (encoded.length <= 500000) break;
        size=Math.round(size*.75);
      }
      if (encoded.length > 500000) throw new Error('Use uma imagem menor para salvar na ficha.');
      onChange(encoded);
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a imagem.');}
    finally {URL.revokeObjectURL(url);setBusy(false);}
  };
  return <article className="kakuja-image-slot"><h3>{label}</h3><label className={`kakuja-image-upload ${busy ? 'is-busy' : ''}`}>
    {value ? <img src={value} alt={`Aparência da ${label}`} /> : <span><b>+</b>Adicionar imagem<small>JPG, PNG, WebP, GIF ou AVIF</small></span>}
    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" aria-label={`Imagem da ${label}`} disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';void upload(file);}} />
  </label><div className="kakuja-image-actions"><span aria-live="polite">{busy ? 'Preparando imagem…' : value ? 'Clique na imagem para trocar' : 'Imagem opcional'}</span>{value && <button type="button" disabled={busy} onClick={()=>{onChange('');setError('');}}>Remover imagem da {label}</button>}</div>{error && <p role="alert">{error}</p>}</article>;
}
