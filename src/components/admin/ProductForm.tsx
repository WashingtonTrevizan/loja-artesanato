'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Category, ProductImage } from '@/lib/types';

type VariantLine = { uid: string; dbId?: string; name: string; stock: number };

let uidCounter = 0;
function newUid() {
  return `v-${Date.now()}-${uidCounter++}`;
}

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!productId;
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // campos do produto
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceText, setPriceText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productType, setProductType] = useState<'pronta_entrega' | 'sob_encomenda'>('pronta_entrega');
  const [productionDays, setProductionDays] = useState('5');
  const [stock, setStock] = useState('1');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  // variações (inputs não controlados com chave estável — evita bugs de cursor)
  const [hasVariants, setHasVariants] = useState(false);
  const [variantLabel, setVariantLabel] = useState('Tamanho');
  const [variants, setVariants] = useState<VariantLine[]>([{ uid: 'v-0', name: '', stock: 1 }]);

  // fotos
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [newFiles, setNewFiles] = useState<{ uid: string; file: File; preview: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('categories').select('*').order('position');
      setCategories((cats as Category[]) || []);

      if (isEdit) {
        const { data: p } = await supabase
          .from('products')
          .select('*, product_images(*), product_variants(*)')
          .eq('id', productId)
          .single();
        if (p) {
          setName(p.name);
          setDescription(p.description);
          setPriceText((p.price_cents / 100).toFixed(2).replace('.', ','));
          setCategoryId(p.category_id);
          setProductType(p.product_type);
          setProductionDays(String(p.production_days ?? 5));
          setStock(String(p.stock));
          setWeight(String(p.weight_grams));
          setLength(String(p.length_cm));
          setWidth(String(p.width_cm));
          setHeight(String(p.height_cm));
          setExistingImages(
            (p.product_images || []).sort((a: ProductImage, b: ProductImage) => a.position - b.position)
          );
          if (p.variant_label) {
            setHasVariants(true);
            setVariantLabel(p.variant_label);
            setVariants(
              (p.product_variants || [])
                .sort((a: any, b: any) => a.position - b.position)
                .map((v: any) => ({ uid: v.id, dbId: v.id, name: v.name, stock: v.stock }))
            );
          }
        }
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ao escolher categoria, sugere peso/medidas padrão (se ainda vazios)
  function onCategoryChange(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat) {
      if (!weight) setWeight(String(cat.default_weight_grams));
      if (!length) setLength(String(cat.default_length_cm));
      if (!width) setWidth(String(cat.default_width_cm));
      if (!height) setHeight(String(cat.default_height_cm));
    }
  }

  function updateVariant(uid: string, patch: Partial<VariantLine>) {
    setVariants((prev) => prev.map((v) => (v.uid === uid ? { ...v, ...patch } : v)));
  }

  function parsePrice(text: string): number {
    const n = parseFloat(text.replace(/\./g, '').replace(',', '.'));
    return Math.round((isNaN(n) ? 0 : n) * 100);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const priceCents = parsePrice(priceText);
    if (priceCents <= 0) return setError('O preço precisa ser maior que zero.');
    if (!categoryId) return setError('Escolha uma categoria.');
    if (!weight || !length || !width || !height)
      return setError('Preencha o peso e as medidas — eles servem para calcular o frete.');
    const cleanVariants = variants.filter((v) => v.name.trim());
    if (hasVariants && cleanVariants.length === 0)
      return setError('Adicione pelo menos uma variação (ex.: P, M, G) ou desligue as variações.');

    setSaving(true);
    try {
      const productData = {
        name: name.trim(),
        description: description.trim(),
        price_cents: priceCents,
        category_id: categoryId,
        product_type: productType,
        production_days: productType === 'sob_encomenda' ? parseInt(productionDays) || 5 : null,
        stock: hasVariants ? 0 : parseInt(stock) || 0,
        weight_grams: parseInt(weight),
        length_cm: parseInt(length),
        width_cm: parseInt(width),
        height_cm: parseInt(height),
        variant_label: hasVariants ? variantLabel.trim() : null,
      };

      let id = productId;
      if (isEdit) {
        const { error: err } = await supabase.from('products').update(productData).eq('id', id);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from('products')
          .insert({ ...productData, active: true })
          .select('id')
          .single();
        if (err) throw err;
        id = data.id;
      }

      // variações: substitui tudo (simples e seguro para 1 nível)
      await supabase.from('product_variants').delete().eq('product_id', id);
      if (hasVariants) {
        const { error: err } = await supabase.from('product_variants').insert(
          cleanVariants.map((v, i) => ({
            product_id: id,
            name: v.name.trim(),
            stock: productType === 'pronta_entrega' ? v.stock : 0,
            position: i,
          }))
        );
        if (err) throw err;
      }

      // fotos novas — se falharem, o produto já está salvo; avisa sem perder o trabalho
      const fotosComErro: string[] = [];
      for (let i = 0; i < newFiles.length; i++) {
        const { file } = newFiles[i];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('product-images')
          .upload(path, file, { contentType: file.type });
        if (upErr) {
          fotosComErro.push(upErr.message);
          continue;
        }
        const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
        await supabase.from('product_images').insert({
          product_id: id,
          url: pub.publicUrl,
          position: existingImages.length + i,
        });
      }

      if (fotosComErro.length > 0) {
        alert(
          'O produto foi salvo, mas as fotos não subiram.\n\nMotivo técnico: ' +
            fotosComErro[0] +
            '\n\nVocê pode tentar de novo editando o produto.'
        );
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError('Ops, algo deu errado ao salvar. Tente de novo. (' + (err.message || err) + ')');
      setSaving(false);
    }
  }

  async function removeExistingImage(img: ProductImage) {
    if (!confirm('Quer mesmo apagar esta foto?')) return;
    await supabase.from('product_images').delete().eq('id', img.id);
    setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
  }

  async function handleDelete() {
    if (!confirm(`Quer mesmo APAGAR o produto "${name}"? Isso não pode ser desfeito.`)) return;
    if (!confirm('Tem certeza mesmo? Se só quiser tirar da loja por um tempo, use "Esconder" na lista de produtos.')) return;
    await supabase.from('products').delete().eq('id', productId);
    router.push('/admin');
    router.refresh();
  }

  if (loading) return <p className="mt-12 text-center text-stone-400">Carregando...</p>;

  const inputCls =
    'mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base focus:border-brand-500 focus:outline-none';

  return (
    <main className="mx-auto max-w-2xl px-4">
      <h1 className="mt-6 text-2xl font-bold text-brand-700">
        {isEdit ? 'Mudar produto' : 'Novo produto'}
      </h1>
      <p className="text-sm text-stone-500">Preencha com calma. Nada é salvo até tocar em Salvar.</p>

      <form onSubmit={handleSave} className="mt-4 space-y-5">
        {/* FOTOS */}
        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">📷 Fotos</h2>
          <p className="text-xs text-stone-500">A primeira foto aparece na vitrine. Pode tirar com a câmera agora.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {existingImages.map((img) => (
              <div key={img.id} className="relative h-24 w-24 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(img)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            {newFiles.map((f) => (
              <div key={f.uid} className="relative h-24 w-24 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewFiles((prev) => prev.filter((x) => x.uid !== f.uid))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-500 text-brand-600"
            >
              <span className="text-2xl">+</span>
              <span className="text-xs font-medium">Adicionar</span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []).map((file) => ({
                uid: newUid(),
                file,
                preview: URL.createObjectURL(file),
              }));
              setNewFiles((prev) => [...prev, ...files]);
              e.target.value = '';
            }}
          />
        </section>

        {/* BÁSICO */}
        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">✏️ Sobre o produto</h2>
          <label className="mt-3 block text-sm font-medium">Nome do produto</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex.: Necessaire floral grande" />

          <label className="mt-4 block text-sm font-medium">Descrição (opcional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="Conte sobre o tecido, o tamanho, para que serve..." />

          <label className="mt-4 block text-sm font-medium">Preço (R$)</label>
          <input required inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} className={inputCls} placeholder="Ex.: 49,90" />

          <label className="mt-4 block text-sm font-medium">Categoria</label>
          <select required value={categoryId} onChange={(e) => onCategoryChange(e.target.value)} className={inputCls}>
            <option value="">Escolha...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </section>

        {/* TIPO E ESTOQUE */}
        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">📦 Como você vende este produto?</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TypeButton active={productType === 'pronta_entrega'} onClick={() => setProductType('pronta_entrega')} title="Pronta entrega" subtitle="Já está feito, é só enviar" />
            <TypeButton active={productType === 'sob_encomenda'} onClick={() => setProductType('sob_encomenda')} title="Sob encomenda" subtitle="Você faz depois que vender" />
          </div>

          {productType === 'pronta_entrega' && !hasVariants && (
            <>
              <label className="mt-4 block text-sm font-medium">Quantas unidades você tem prontas?</label>
              <input required inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} />
            </>
          )}
          {productType === 'sob_encomenda' && (
            <>
              <label className="mt-4 block text-sm font-medium">Em quantos dias você consegue fazer um?</label>
              <input required inputMode="numeric" value={productionDays} onChange={(e) => setProductionDays(e.target.value)} className={inputCls} />
              <p className="mt-1 text-xs text-stone-500">Esse prazo aparece para a cliente, somado ao prazo dos Correios.</p>
            </>
          )}
        </section>

        {/* VARIAÇÕES */}
        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">🎨 Tem variações?</h2>
              <p className="text-xs text-stone-500">Ex.: tamanhos P/M/G ou estampas diferentes.</p>
            </div>
            <button
              type="button"
              onClick={() => setHasVariants(!hasVariants)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${hasVariants ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-500'}`}
            >
              {hasVariants ? 'Sim ✓' : 'Não'}
            </button>
          </div>

          {hasVariants && (
            <div className="mt-3">
              <label className="block text-sm font-medium">O que muda entre elas?</label>
              <select value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} className={inputCls}>
                <option value="Tamanho">Tamanho</option>
                <option value="Estampa">Estampa</option>
                <option value="Cor">Cor</option>
              </select>

              <div className="mt-3 space-y-2">
                {variants.map((v) => (
                  <div key={v.uid} className="flex gap-2">
                    <input
                      defaultValue={v.name}
                      onChange={(e) => updateVariant(v.uid, { name: e.target.value })}
                      className={inputCls + ' mt-0 min-w-0 flex-1'}
                      placeholder={variantLabel === 'Tamanho' ? 'Ex.: M' : 'Ex.: Floral azul'}
                    />
                    {productType === 'pronta_entrega' && (
                      <input
                        inputMode="numeric"
                        defaultValue={v.stock}
                        onChange={(e) => updateVariant(v.uid, { stock: parseInt(e.target.value) || 0 })}
                        className="w-20 shrink-0 rounded-xl border border-stone-300 bg-white px-2 py-3 text-center text-base focus:border-brand-500 focus:outline-none"
                        placeholder="Qtde"
                        title="Quantidade"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setVariants((prev) => prev.filter((x) => x.uid !== v.uid))}
                      className="px-2 text-stone-400"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {productType === 'pronta_entrega' && (
                <p className="mt-1 text-xs text-stone-500">O número ao lado é quantas unidades você tem de cada uma.</p>
              )}
              <button
                type="button"
                onClick={() => setVariants((prev) => [...prev, { uid: newUid(), name: '', stock: 1 }])}
                className="mt-2 text-sm font-medium text-brand-600"
              >
                + Adicionar outra
              </button>
            </div>
          )}
        </section>

        {/* PESO E MEDIDAS */}
        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">⚖️ Peso e medidas (para o frete)</h2>
          <p className="text-xs text-stone-500">
            Já preenchemos com valores comuns da categoria. Se souber o valor certo, melhor ainda — frete errado sai do seu bolso!
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Peso (gramas)</label>
              <input required inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium">Comprimento (cm)</label>
              <input required inputMode="numeric" value={length} onChange={(e) => setLength(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium">Largura (cm)</label>
              <input required inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium">Altura (cm)</label>
              <input required inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} />
            </div>
          </div>
        </section>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          disabled={saving}
          className="w-full rounded-full bg-brand-600 py-4 text-lg font-bold text-white shadow-md disabled:bg-stone-300"
        >
          {saving ? 'Salvando...' : isEdit ? 'Salvar mudanças' : 'Salvar produto'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full rounded-full border border-red-200 py-3 text-sm font-medium text-red-600"
          >
            Apagar este produto
          </button>
        )}
      </form>
    </main>
  );
}

function TypeButton({ active, onClick, title, subtitle }: { active: boolean; onClick: () => void; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-3 text-left transition ${
        active ? 'border-brand-600 bg-brand-50' : 'border-stone-200 bg-white'
      }`}
    >
      <p className="font-bold">{title}</p>
      <p className="text-xs text-stone-500">{subtitle}</p>
    </button>
  );
}
