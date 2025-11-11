// app.js (Versão 2.0)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// SUBSTITUA estas constantes pelas suas credenciais
const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// DOM
const productsGrid = document.getElementById('products-grid');
const featuredGrid = document.getElementById('featured-grid');
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeCart = document.getElementById('close-cart');
const cartCount = document.getElementById('cart-count');
const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const checkoutModal = document.getElementById('checkout-modal');
const checkoutBody = document.getElementById('checkout-body');
const closeCheckout = document.getElementById('close-checkout');
const searchInput = document.getElementById('search');
const filterCategory = document.getElementById('filter-category');
const filterOrder = document.getElementById('filter-order');
const wishlistBtn = document.getElementById('wishlist-btn');
const wishCountEl = document.getElementById('wish-count');

const newsletterForm = document.getElementById('newsletter-form');
const newsletterMsg = document.getElementById('newsletter-msg');

document.getElementById('current-year').textContent = new Date().getFullYear();

// State
let CART = JSON.parse(localStorage.getItem('cart_v1') || '[]');
let WISHLIST = JSON.parse(localStorage.getItem('wish_v1') || '[]');

// Utilities
function saveCart(){ localStorage.setItem('cart_v1', JSON.stringify(CART)); renderCart(); }
function saveWish(){ localStorage.setItem('wish_v1', JSON.stringify(WISHLIST)); renderWish(); }
function formatBRL(v){ return Number(v).toFixed(2).replace('.',','); }
function calcTotal(){ return CART.reduce((s,i)=> s + (i.price * i.qty), 0); }
function getPublicUrl(path){ if(!path) return 'https://via.placeholder.com/200x300?text=Imagem'; return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`; }

function productCard(p){
  const compare = p.compare_at_price ? `<div class="compare">R$ ${formatBRL(p.compare_at_price)}</div>` : '';
  const badge = p.is_featured ? `<div class="badge">DESTAQUE</div>` : '';
  const wished = WISHLIST.includes(p.id) ? '♥' : '♡';
  return `
  <article class="card" role="article" aria-label="${p.title}" data-id="${p.id}">
    ${badge}
    <img src="${getPublicUrl(p.image_path)}" loading="lazy" alt="${p.title}">
    <div class="product-title">${p.title}</div>
    ${compare}
    <div class="price">R$ ${formatBRL(p.price)}</div>
    <div class="card-footer">
      <button data-add="${p.id}" class="btn-primary">Adicionar</button>
      <a href="product.html?slug=${encodeURIComponent(p.slug)}" style="margin-left:auto;color:var(--muted)">Ver</a>
      <button data-wish="${p.id}" class="btn-ghost" title="Favoritar">${wished}</button>
    </div>
  </article>`;
}

function renderCart(){
  cartCount.textContent = CART.reduce((s,i)=> s + i.qty, 0);
  cartItemsEl.innerHTML = CART.map(item => `
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
  `).join('') || '<li style="color:var(--muted)">Carrinho vazio</li>';
  cartTotalEl.textContent = formatBRL(calcTotal());
}
function renderWish(){
  wishCountEl.textContent = WISHLIST.length;
  wishlistBtn.title = `Favoritos (${WISHLIST.length})`;
}

// Events: add product
productsGrid.addEventListener('click', async (e)=>{
  const addId = e.target.closest('[data-add]')?.dataset.add;
  if(addId){
    const { data } = await supabase.from('products').select('id,title,price,image_path,stock').eq('id', addId).single();
    if(!data) return alert('Produto não encontrado');
    if(data.stock !== null && data.stock !== undefined && data.stock <= 0) return alert('Produto sem estoque');
    const exists = CART.find(i=>i.id===data.id);
    if(exists) exists.qty++;
    else CART.push({id:data.id, title:data.title, price: Number(data.price), image: data.image_path, qty:1});
    saveCart();
  }
});

// wish toggle
productsGrid.addEventListener('click', (e)=>{
  const wid = e.target.closest('[data-wish]')?.dataset.wish;
  if(wid){
    const id = Number(wid);
    if(WISHLIST.includes(id)) WISHLIST = WISHLIST.filter(i=>i!==id);
    else WISHLIST.push(id);
    saveWish();
    loadProducts(searchInput.value);
  }
});

// cart UI
cartBtn?.addEventListener('click', ()=> cartModal.setAttribute('aria-hidden','false'));
closeCart?.addEventListener('click', ()=> cartModal.setAttribute('aria-hidden','true'));
cartItemsEl.addEventListener('click', (e)=>{
  const id = e.target.dataset.decr || e.target.dataset.incr || e.target.dataset.rm;
  if(!id) return;
  if(e.target.dataset.decr){ const item = CART.find(i=>i.id==id); if(item.qty>1) setQty(item.id, item.qty -1); }
  if(e.target.dataset.incr){ const item = CART.find(i=>i.id==id); setQty(item.id, item.qty +1); }
  if(e.target.dataset.rm){ removeFromCart(Number(id)) }
});
function setQty(id, qty){ CART = CART.map(i=> i.id===id?({...i, qty}):i); saveCart(); }
function removeFromCart(id){ CART = CART.filter(i=>i.id!==id); saveCart(); }

// checkout flow
document.getElementById('checkout-btn').addEventListener('click', async ()=>{
  if (!CART.length) return alert('Carrinho vazio');

  const total = calcTotal();

  // enviar pedido ao Supabase (status pending)
  const { data, error } = await supabase
    .from('orders')
    .insert([{ user_id: null, total, status: 'pending', shipping_address: {} }])
    .select()
    .single();
  if (error) { alert('Erro ao criar pedido'); console.error(error); return; }

  const items = CART.map(i => ({
    order_id: data.id,
    product_id: i.id,
    quantity: i.qty,
    unit_price: i.price
  }));
  const { error: itErr } = await supabase.from('order_items').insert(items);
  if (itErr) { alert('Erro ao salvar itens'); console.error(itErr); return; }

  openCheckoutModal(data.id);
});

function openCheckoutModal(orderId){
  checkoutModal.classList.remove('hidden');
  checkoutModal.setAttribute('aria-hidden','false');
  const total = calcTotal();
  checkoutBody.innerHTML = `
    <p>Pedido <strong>#${orderId}</strong> — Total: R$ ${formatBRL(total)}</p>
    <div style="display:flex;gap:10px;margin-top:14px">
      <button id="pay-pix" class="btn-primary">Pagar com PIX</button>
      <button id="pay-whats" class="btn-ghost">Pagar via WhatsApp</button>
    </div>
    <div id="pix-area" style="margin-top:12px"></div>
  `;
  document.getElementById('pay-pix').addEventListener('click', ()=> startPixPayment(orderId));
  document.getElementById('pay-whats').addEventListener('click', ()=> sendWhats(orderId));
}
closeCheckout?.addEventListener('click', ()=> {
  checkoutModal.classList.add('hidden');
  checkoutModal.setAttribute('aria-hidden','true');
});

function sendWhats(orderId){
  let message = `🍾 Pedido DrinkValley #${orderId}%0A%0A`;
  CART.forEach((item, idx) => {
    message += `${idx + 1}. ${encodeURIComponent(item.title)} — ${item.qty}x R$ ${formatBRL(item.price)}%0A`;
  });
  message += `%0ATotal: *R$ ${formatBRL(calcTotal())}*%0A%0A`;
  message += '✅ Pedido registrado no sistema.';
  const WHATS = '5551998811587';
  const url = `https://wa.me/${WHATS}?text=${message}`;
  CART = []; saveCart();
  window.open(url, '_blank');
  checkoutModal.classList.add('hidden');
  checkoutModal.setAttribute('aria-hidden','true');
}

function startPixPayment(orderId){
  const total = calcTotal();
  const payload = `PIX|DRINKVALLEY|${orderId}|${total.toFixed(2)}`; // Simulação — substitua por PSP real
  const qrUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(payload)}`;
  const pixArea = document.getElementById('pix-area');
  pixArea.innerHTML = `
    <p>Valor: <strong>R$ ${formatBRL(total)}</strong></p>
    <img src="${qrUrl}" alt="QR PIX" style="display:block;margin:10px 0;max-width:100%"/>
    <div style="display:flex;gap:8px">
      <input id="pix-code" style="flex:1;padding:8px;border-radius:8px;background:#07122a;border:1px solid rgba(255,255,255,0.03);color:inherit" value="${payload}" readonly />
      <button id="copy-pix" class="btn-primary">Copiar</button>
    </div>
    <p class="muted" style="margin-top:8px">Confirme o pagamento e clique em "Já paguei".</p>
    <button id="confirm-paid" class="btn-primary" style="margin-top:10px">Já paguei (confirmar)</button>
  `;
  document.getElementById('copy-pix').addEventListener('click', ()=> navigator.clipboard.writeText(payload).then(()=> alert('Código PIX copiado')));
  document.getElementById('confirm-paid').addEventListener('click', async ()=>{
    const { error } = await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);
    if(error){ alert('Erro ao confirmar pagamento'); console.error(error); return; }
    alert('Pagamento marcado como confirmado. Obrigado!');
    CART = []; saveCart();
    checkoutModal.classList.add('hidden');
    checkoutModal.setAttribute('aria-hidden','true');
  });
}

// search, filters
searchInput.addEventListener('input', (e)=> loadProducts(e.target.value, filterCategory.value, filterOrder.value));
filterCategory.addEventListener('change', ()=> loadProducts(searchInput.value, filterCategory.value, filterOrder.value));
filterOrder.addEventListener('change', ()=> loadProducts(searchInput.value, filterCategory.value, filterOrder.value));

// newsletter
newsletterForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = e.target.email.value.trim();
  if(!email) return;
  const { error } = await supabase.from('newsletters').insert([{ email }]);
  if(error){ newsletterMsg.textContent = 'Erro ao assinar.'; console.error(error); return; }
  newsletterMsg.textContent = 'Inscrito com sucesso!';
  e.target.reset();
});

// initial render
renderCart();
renderWish();
loadCategories();
loadProducts();

async function loadCategories(){
  const { data } = await supabase.from('categories').select('*').order('name');
  if(!data) return;
  filterCategory.innerHTML = `<option value="">Todas categorias</option>` + data.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadProducts(q='', categoryId='', order='featured'){
  productsGrid.innerHTML = '<p>Carregando...</p>';
  const select = 'id,title,price,compare_at_price,image_path,slug,is_featured,stock,category_id';
  let builder = supabase.from('products').select(select).ilike('title', `%${q}%`);
  if(categoryId) builder = builder.eq('category_id', categoryId);
  // order
  if(order === 'price_asc') builder = builder.order('price', { ascending: true });
  else if(order === 'price_desc') builder = builder.order('price', { ascending: false });
  else if(order === 'new') builder = builder.order('created_at', { ascending: false });
  else builder = builder.order('is_featured', { ascending: false });
  const { data, error } = await builder.limit(200);
  if(error){ productsGrid.innerHTML = '<p>Erro ao carregar</p>'; console.error(error); return; }

  const featured = data.filter(p=>p.is_featured).slice(0,6);
  featuredGrid.innerHTML = featured.map(productCard).join('') || '<p class="muted">Nenhum destaque</p>';
  productsGrid.innerHTML = data.map(productCard).join('') || '<p class="muted">Nenhum produto</p>';
}

// load wishlist items into a view (optional modal)
wishlistBtn?.addEventListener('click', async ()=>{
  if(!WISHLIST.length){ alert('Nenhum favorito'); return; }
  const { data } = await supabase.from('products').select('id,title,price,image_path,slug').in('id', WISHLIST).limit(100);
  if(!data) return alert('Não foi possível carregar favoritos');
  // quick modal
  const html = data.map(p=>`<div style="display:flex;gap:10px;padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)">
    <img src="${getPublicUrl(p.image_path)}" style="width:56px;height:56px;object-fit:cover"/>
    <div style="flex:1"><strong>${p.title}</strong><div>R$ ${formatBRL(p.price)}</div></div>
    <div><a href="product.html?slug=${encodeURIComponent(p.slug)}" class="btn-ghost">Ver</a></div>
  </div>`).join('');
  const w = window.open('', 'Favoritos', 'width=600,height=700');
  w.document.body.style.background = '#071224';
  w.document.body.style.color = '#fff';
  w.document.title = 'Favoritos — DrinkValley';
  w.document.body.innerHTML = `<h2 style="font-family:Inter;padding:12px">Favoritos</h2>${html}`;
});

// update wishlist counts etc
renderWish();
