// app.js - DrinkValley versão 2.3 (Corrigido: Destaques funcionando)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Substitua com suas credenciais
const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// DOM refs
const productsGrid = document.getElementById('products-grid');
const featuredGrid = document.getElementById('featured-grid');
const categoriesGrid = document.querySelectorAll('#categories-grid');
const searchInput = document.getElementById('search');
const filterCategory = document.getElementById('filter-category');
const filterPrice = document.getElementById('filter-price');
const filterOrder = document.getElementById('filter-order');
const wishlistBtn = document.getElementById('wishlist-btn');
const wishCountEl = document.getElementById('wish-count');
const miniCart = document.getElementById('mini-cart');
const miniCartBtn = document.getElementById('mini-cart-btn');
const closeMiniCart = document.getElementById('close-mini-cart');
const miniCartItems = document.getElementById('mini-cart-items');
const miniCartTotal = document.getElementById('mini-cart-total');
const goCheckout = document.getElementById('go-checkout');
const toastEl = document.getElementById('toast');

let CART = JSON.parse(localStorage.getItem('cart_v1') || '[]');
let WISHLIST = JSON.parse(localStorage.getItem('wish_v1') || '[]');

function toast(msg, time = 2500) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  toastEl.style.opacity = '1';
  setTimeout(() => { 
    toastEl.style.opacity = '0'; 
    setTimeout(() => toastEl.classList.add('hidden'), 200); 
  }, time);
}

function saveCart() { 
  localStorage.setItem('cart_v1', JSON.stringify(CART)); 
  renderMiniCart(); 
  renderCounts(); 
}

function saveWish() { 
  localStorage.setItem('wish_v1', JSON.stringify(WISHLIST)); 
  renderCounts(); 
}

function formatBRL(v) { 
  return Number(v).toFixed(2).replace('.', ','); 
}

function calcTotal() { 
  return CART.reduce((s, i) => s + (i.price * i.qty), 0); 
}

function getPublicUrl(path) { 
  if (!path) return 'https://via.placeholder.com/300x400?text=Imagem'; 
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`; 
}

function productCard(p) {
  const compare = p.compare_at_price ? `<div class="compare">R$ ${formatBRL(p.compare_at_price)}</div>` : '';
  const badge = p.is_featured ? `<div class="badge">DESTAQUE</div>` : '';
  const wished = WISHLIST.includes(p.id) ? '♥' : '♡';
  
  return `
    <article class="card" role="article" data-slug="${encodeURIComponent(p.slug)}">
      ${badge}
      <div class="card-thumb"><img src="${getPublicUrl(p.thumbnail || p.image_path)}" alt="${p.title}" loading="lazy"/></div>
      <div class="product-title">${p.title}</div>
      ${compare}
      <div class="price">R$ ${formatBRL(p.price)}</div>
      <div class="card-footer">
        <button data-add="${p.id}" class="btn-primary">Adicionar</button>
        <button data-wish="${p.id}" class="btn-ghost">${wished}</button>
      </div>
    </article>
  `;
}

function renderCounts() {
  document.getElementById('cart-count').textContent = CART.reduce((s, i) => s + i.qty, 0);
  wishCountEl.textContent = WISHLIST.length;
}

function renderMiniCart() {
  miniCartItems.innerHTML = CART.map(item => `
    <li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03)">
      <img src="${getPublicUrl(item.image)}" alt="${item.title}" style="width:56px;height:56px;object-fit:cover;border-radius:6px"/>
      <div style="flex:1">
        <div style="font-weight:600">${item.title}</div>
        <div>R$ ${formatBRL(item.price)}</div>
        <div style="margin-top:6px">
          <button data-decr="${item.id}">-</button>
          <span style="margin:0 8px">${item.qty}</span>
          <button data-incr="${item.id}">+</button>
          <button data-rm="${item.id}" style="margin-left:12px;color:#f97373">Remover</button>
        </div>
      </div>
    </li>
  `).join('') || '<li class="muted">Carrinho vazio</li>';
  
  miniCartTotal.textContent = formatBRL(calcTotal());
  renderCounts();
}

// 🎯 FUNÇÃO REUTILIZÁVEL PARA AMBOS OS GRIDS
async function handleProductCardClick(e) {
  // Clique no card (ver detalhes)
  const card = e.target.closest('.card');
  if (card && !e.target.closest('[data-add]') && !e.target.closest('[data-wish]')) {
    const slug = card.dataset.slug;
    if (slug) location.href = `product.html?slug=${slug}`;
    return;
  }

  // Adicionar ao carrinho
  const addId = e.target.closest('[data-add]')?.dataset.add;
  if (addId) {
    const { data } = await supabase.from('products').select('id,title,price,image_path,thumbnail,stock').eq('id', addId).single();
    if (!data) return toast('Produto não encontrado');
    if (data.stock !== null && data.stock <= 0) return toast('Sem estoque');
    
    const exists = CART.find(i => i.id === data.id);
    if (exists) exists.qty++;
    else CART.push({ 
      id: data.id, 
      title: data.title, 
      price: Number(data.price), 
      image: data.thumbnail || data.image_path, 
      qty: 1 
    });
    
    saveCart();
    toast('Produto adicionado ao carrinho ✅');
  }

  // Favoritar
  const wid = e.target.closest('[data-wish]')?.dataset.wish;
  if (wid) {
    const id = Number(wid);
    if (WISHLIST.includes(id)) WISHLIST = WISHLIST.filter(i => i !== id);
    else WISHLIST.push(id);
    
    saveWish();
    toast('Favoritos atualizados');
    loadProducts(searchInput.value);
  }
}

// 🎯 ATACHAR EVENT LISTENER A AMBOS OS GRIDS
productsGrid?.addEventListener('click', handleProductCardClick);
featuredGrid?.addEventListener('click', handleProductCardClick);

// Wishlist popup
wishlistBtn?.addEventListener('click', async () => {
  if (!WISHLIST.length) return toast('Nenhum favorito');
  
  const { data } = await supabase.from('products').select('id,title,price,image_path,thumbnail,slug').in('id', WISHLIST).limit(100);
  if (!data) return toast('Erro ao carregar favoritos');
  
  const html = data.map(p => `
    <div style="display:flex;gap:10px;padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)">
      <img src="${getPublicUrl(p.thumbnail || p.image_path)}" style="width:56px;height:56px;object-fit:cover"/>
      <div style="flex:1"><strong>${p.title}</strong><div>R$ ${formatBRL(p.price)}</div></div>
      <div><a href="product.html?slug=${encodeURIComponent(p.slug)}" class="btn-ghost">Ver</a></div>
    </div>
  `).join('');
  
  const w = window.open('', 'Favoritos', 'width=600,height=700');
  w.document.write(`
    <!DOCTYPE html>
    <html><head><title>Favoritos — DrinkValley</title>
    <style>body{background:#071224;color:#fff;font-family:Inter;padding:12px;overflow:auto}</style>
    </head><body><h2>Favoritos</h2>${html}</body></html>
  `);
});

// Mini-cart controls
miniCartBtn?.addEventListener('click', () => miniCart.setAttribute('aria-hidden', 'false'));
closeMiniCart?.addEventListener('click', () => miniCart.setAttribute('aria-hidden', 'true'));

miniCartItems?.addEventListener('click', (e) => {
  const id = e.target.dataset.decr || e.target.dataset.incr || e.target.dataset.rm;
  if (!id) return;
  
  if (e.target.dataset.decr) { 
    const item = CART.find(i => i.id == id); 
    if (item.qty > 1) setQty(item.id, item.qty - 1); 
  }
  if (e.target.dataset.incr) { 
    const item = CART.find(i => i.id == id); 
    setQty(item.id, item.qty + 1); 
  }
  if (e.target.dataset.rm) { 
    removeFromCart(Number(id)); 
  }
});

function setQty(id, qty) { 
  CART = CART.map(i => i.id === id ? ({ ...i, qty }) : i); 
  saveCart(); 
}

function removeFromCart(id) { 
  CART = CART.filter(i => i.id !== id); 
  saveCart(); 
}

// 🎯 FINALIZAR COMPRA → WHATSAPP DIRETO
goCheckout?.addEventListener('click', () => {
  if (!CART.length) return toast('Carrinho vazio');
  
  let message = `🍾 *NOVO PEDIDO* DrinkValley%0A%0A`;
  CART.forEach((item, idx) => {
    message += `${idx + 1}. ${encodeURIComponent(item.title)} — ${item.qty}x R$ ${formatBRL(item.price)}%0A`;
  });
  message += `%0A*Total: R$ ${formatBRL(calcTotal())}*%0A%0A`;
  message += `✅ Pedido enviado pelo cliente. Aguardando confirmação.`;
  
  const WHATS = '5551998811587';
  window.open(`https://wa.me/${WHATS}?text=${message}`, '_blank');
  
  CART = [];
  saveCart();
  miniCart.setAttribute('aria-hidden', 'true');
  toast('Pedido enviado via WhatsApp ✅');
});

// Filters
searchInput?.addEventListener('input', () => loadProducts(searchInput.value, filterCategory.value, filterPrice.value, filterOrder.value));
filterCategory?.addEventListener('change', () => loadProducts(searchInput.value, filterCategory.value, filterPrice.value, filterOrder.value));
filterPrice?.addEventListener('change', () => loadProducts(searchInput.value, filterCategory.value, filterPrice.value, filterOrder.value));
filterOrder?.addEventListener('change', () => loadProducts(searchInput.value, filterCategory.value, filterPrice.value, filterOrder.value));

// Initial load
renderMiniCart();
renderCounts();
loadCategories();
loadProducts();

// Data loading functions
async function loadCategories() {
  const { data } = await supabase.from('categories').select('*').order('name');
  if (!data) return;
  
  filterCategory.innerHTML = `<option value="">Todas categorias</option>` + data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  
  const grid = document.querySelector('#categories-grid');
  if (grid) {
    grid.innerHTML = data.map(c => `
      <a class="category-card" href="#" style="background-image:url('images/category-${c.id}.jpg')">
        <h3>${c.name}</h3>
      </a>
    `).join('');
  }
}

async function loadProducts(q = '', categoryId = '', priceRange = '', order = 'featured') {
  productsGrid.innerHTML = '<p style="text-align:center;margin-top:40px;">Carregando produtos...</p>';
  
  const select = 'id,title,price,compare_at_price,image_path,thumbnail,slug,is_featured,category_id,created_at';
  let builder = supabase.from('products').select(select).ilike('title', `%${q}%`);
  
  if (categoryId) builder = builder.eq('category_id', categoryId);
  
  if (priceRange) {
    const [min, max] = priceRange.split('-').map(Number);
    builder = builder.gte('price', min).lte('price', max);
  }
  
  if (order === 'price_asc') builder = builder.order('price', { ascending: true });
  else if (order === 'price_desc') builder = builder.order('price', { ascending: false });
  else if (order === 'new') builder = builder.order('created_at', { ascending: false });
  else builder = builder.order('is_featured', { ascending: false });
  
  const { data, error } = await builder.limit(300);
  
  if (error) { 
    console.error(error); 
    productsGrid.innerHTML = '<p style="color:red;text-align:center;">Erro ao carregar produtos</p>'; 
    return; 
  }
  
  const featured = data.filter(p => p.is_featured).slice(0, 6);
  featuredGrid.innerHTML = featured.map(productCard).join('') || '<p class="muted">Nenhum destaque</p>';
  productsGrid.innerHTML = data.map(productCard).join('') || '<p class="muted">Nenhum produto</p>';
}