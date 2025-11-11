// product.js - exibe detalhe do produto e permite adicionar ao carrinho
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const params = new URLSearchParams(location.search);
const slug = params.get('slug');
const el = document.getElementById('product-detail');
const relatedGrid = document.getElementById('related-grid');

let CART = JSON.parse(localStorage.getItem('cart_v1') || '[]');
function saveCart(){ localStorage.setItem('cart_v1', JSON.stringify(CART)); updateCartCount(); }
function formatBRL(v){ return Number(v).toFixed(2).replace('.',','); }
function updateCartCount(){ document.querySelectorAll('#cart-count').forEach(n=> n.textContent = CART.reduce((s,i)=> s + i.qty, 0)); }

function getPublicUrl(path){ if(!path) return 'https://via.placeholder.com/300x400?text=Imagem'; return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`; }

async function load(){
  if(!slug){ el.innerHTML = '<p>Produto não encontrado</p>'; return; }
  el.innerHTML = '<p>Carregando...</p>';
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).single();
  if(error || !data){ el.innerHTML = '<p>Produto não encontrado</p>'; console.error(error); return; }

  el.innerHTML = `
    <div>
      <img src="${getPublicUrl(data.image_path)}" alt="${data.title}" />
    </div>
    <div class="product-info">
      <h2>${data.title}</h2>
      <div class="product-meta">R$ ${formatBRL(data.price)} ${data.compare_at_price?`<span class="compare">R$ ${formatBRL(data.compare_at_price)}</span>`:''}</div>
      <p style="margin-top:12px">${data.description || 'Sem descrição.'}</p>
      <div style="margin-top:12px;color:var(--muted)">Estoque: ${data.stock ?? '—'}</div>
      <div style="margin-top:18px;display:flex;gap:10px">
        <button id="add-to-cart" class="btn-primary">Adicionar ao Carrinho</button>
        <button id="fav-btn" class="btn-ghost">❤️ Favoritar</button>
        <a href="/" class="link-muted" style="align-self:center">Continuar comprando</a>
      </div>

      <div style="margin-top:20px">
        <h4>Avaliações</h4>
        <div id="reviews"></div>
        <form id="review-form" style="margin-top:8px">
          <input name="name" placeholder="Seu nome" required />
          <select name="rating">
            <option value="5">5 — Excelente</option>
            <option value="4">4 — Muito bom</option>
            <option value="3">3 — Bom</option>
            <option value="2">2 — Razoável</option>
            <option value="1">1 — Ruim</option>
          </select>
          <textarea name="comment" placeholder="Escreva sua avaliação"></textarea>
          <button class="btn-primary" type="submit">Enviar avaliação</button>
        </form>
      </div>
    </div>
  `;

  // related products
  const rel = await supabase.from('products').select('id,title,price,image_path,slug').neq('id', data.id).limit(6);
  relatedGrid.innerHTML = rel.data.map(p=>`
    <article class="card">
      <img src="${getPublicUrl(p.image_path)}" />
      <div style="font-weight:600">${p.title}</div>
      <div>R$ ${formatBRL(p.price)}</div>
      <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="btn-ghost">Ver</a>
    </article>
  `).join('');

  document.getElementById('add-to-cart').addEventListener('click', ()=>{
    const exists = CART.find(i=>i.id===data.id);
    if(exists) exists.qty++;
    else CART.push({id:data.id, title:data.title, price: Number(data.price), image: data.image_path, qty:1});
    saveCart();
    alert('Adicionado ao carrinho');
  });

  document.getElementById('fav-btn').addEventListener('click', ()=>{
    // simplistic favorite experience (local)
    let WISHLIST = JSON.parse(localStorage.getItem('wish_v1') || '[]');
    if(WISHLIST.includes(data.id)) WISHLIST = WISHLIST.filter(i=>i!==data.id);
    else WISHLIST.push(data.id);
    localStorage.setItem('wish_v1', JSON.stringify(WISHLIST));
    alert('Favorito atualizado');
  });

  loadReviews(data.id);
  updateCartCount();
}

async function loadReviews(productId){
  const { data } = await supabase.from('reviews').select('*').eq('product_id', productId).order('created_at',{ascending:false}).limit(20);
  const el = document.getElementById('reviews');
  if(!data || !data.length){ el.innerHTML = '<div class="muted">Seja o primeiro a avaliar.</div>'; return; }
  el.innerHTML = data.map(r=>`<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03)"><strong>${r.name}</strong> — ${r.rating}★<div class="muted">${r.comment || ''}</div></div>`).join('');
  // review form
  document.getElementById('review-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const form = e.target;
    const payload = {
      product_id: productId,
      name: form.name.value,
      rating: parseInt(form.rating.value),
      comment: form.comment.value
    };
    const { error } = await supabase.from('reviews').insert([payload]);
    if(error){ alert('Erro ao enviar avaliação'); console.error(error); return; }
    alert('Avaliação enviada');
    form.reset();
    loadReviews(productId);
  });
}

load();
