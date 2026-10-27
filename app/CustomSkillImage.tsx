/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeCustomSkillImage, prepareCustomSkillImage } from "./custom-skill-images";

export function CustomSkillImage({ name, value, onChange }: { name: string; value?: string; onChange: (value: string | undefined) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [broken, setBroken] = useState(false);
  const [address, setAddress] = useState(value?.startsWith("http") ? value : "");
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  useEffect(() => {
    setAddress(value?.startsWith("http") ? value : "");
    setBroken(false);
  }, [value]);

  const upload = async (file?: File) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      changeRef.current(await prepareCustomSkillImage(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a imagem.");
    } finally {
      setBusy(false);
    }
  };
  const applyAddress = () => {
    const image = normalizeCustomSkillImage(address);
    if (!image || !/^https?:/i.test(image)) {
      setError("Informe um endereço de imagem começando por https:// ou http://.");
      return;
    }
    setError("");
    setBroken(false);
    onChange(image);
  };

  return <details className="custom-skill-image" open={Boolean(value) || undefined}>
    <summary>Imagem da habilidade{value ? "" : " · opcional"}</summary>
    <div className="custom-skill-image-content">
      {value && <div className="custom-skill-image-preview">{broken ? <p>Imagem indisponível. Troque o endereço ou envie um arquivo.</p> : <img src={value} alt={`Imagem de ${name}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />}</div>}
      <div className="custom-skill-image-controls">
        <label className={`custom-skill-image-upload${busy ? " is-busy" : ""}`}>
          <span>{busy ? "Preparando imagem…" : value ? "Trocar arquivo" : "Enviar imagem"}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" aria-label={`Enviar imagem de ${name}`} disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file); }} />
        </label>
        {value && <button type="button" disabled={busy} onClick={() => { onChange(undefined); setAddress(""); setError(""); }}>Remover imagem</button>}
        <span className="custom-skill-image-hint">Arquivos ficam na ficha, reduzidos a até 640 px. GIF vira imagem estática.</span>
        <div className="custom-skill-image-address"><label><span>Ou usar um link de imagem</span><input type="url" aria-label={`Link da imagem de ${name}`} placeholder="https://…" value={address} disabled={busy} onChange={event => setAddress(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); applyAddress(); } }} /></label><button type="button" disabled={busy || !address.trim()} onClick={applyAddress}>Aplicar link</button></div>
        {error && <p className="custom-skill-image-error" role="alert">{error}</p>}
      </div>
    </div>
  </details>;
}
