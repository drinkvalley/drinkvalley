// app.js (leia comentários)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// COLE AQUI SUAS CHAVES DO SUPABASE
const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const productsGrid = document.getElementById('products-grid');
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeCart = document.getElementById('close-cart');
const cartCount = document.getElementById('cart-count');
const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');

let CART = JSON.parse(localStorage.getItem('cart_v1') || '[]');

function saveCart(){ localStorage.setItem('cart_v1', JSON.stringify(CART)); renderCart(); }
function formatBRL(v){ return Number(v).toFixed(2).replace('.',','); }
function calcTotal(){ return CART.reduce((s,i)=> s + (i.price * i.qty), 0); }

function getPublicUrl(path){
  if(!path) return 'https://via.placeholder.com/200x300?text=Imagem';
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

function productCard(p){
  const compare = p.compare_at_price ? `<div class="compare">R$ ${formatBRL(p.compare_at_price)}</div>` : '';
  const badge = p.compare_at_price ? `<div class="badge">↓ ${Math.round((1 - (p.price/p.compare_at_price))*100)}%</div>` : '';
  return `
  <article class="card" role="article" aria-label="${p.title}">
    ${badge}
    <img src="${getPublicUrl(p.image_path)}" loading="lazy" alt="${p.title}">
    <div class="product-title">${p.title}</div>
    ${compare}
    <div class="price">R$ ${formatBRL(p.price)}</div>
    <div class="card-footer">
      <button data-add="${p.id}" aria-label="Adicionar ${p.title} ao carrinho">Adicionar</button>
      <a href="#" style="margin-left:auto">Ver</a>
    </div>
  </article>`;
}

function renderCart(){
  cartCount.textContent = CART.reduce((s,i)=> s + i.qty, 0);
  cartItemsEl.innerHTML = CART.map(item => `
    <li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6">
      <img src="${getPublicUrl(item.image)}" alt="${item.title}" style="width:56px;height:56px;object-fit:cover;border-radius:6px"/>
      <div style="flex:1">
        <div style="font-weight:600">${item.title}</div>
        <div>R$ ${formatBRL(item.price)}</div>
        <div style="margin-top:6px">
          <button data-decr="${item.id}">-</button>
          <span style="margin:0 8px">${item.qty}</span>
          <button data-incr="${item.id}">+</button>
          <button data-rm="${item.id}" style="margin-left:12px;color:#d94634">Remover</button>
        </div>
      </div>
    </li>
  `).join('');
  cartTotalEl.textContent = formatBRL(calcTotal());
}

productsGrid.addEventListener('click', (e)=>{
  const addId = e.target.closest('[data-add]')?.dataset.add;
  if(addId){
    (async ()=>{
      const { data } = await supabase.from('products').select('id,title,price,image_path').eq('id', addId).single();
      const exists = CART.find(i=>i.id===data.id);
      if(exists) exists.qty++;
      else CART.push({id:data.id, title:data.title, price: Number(data.price), image: data.image_path, qty:1});
      saveCart();
    })();
  }
});

cartBtn.addEventListener('click', ()=> cartModal.setAttribute('aria-hidden','false'));
closeCart.addEventListener('click', ()=> cartModal.setAttribute('aria-hidden','true'));

cartItemsEl.addEventListener('click', (e)=>{
  const id = e.target.dataset.decr || e.target.dataset.incr || e.target.dataset.rm;
  if(!id) return;
  if(e.target.dataset.decr){ const item = CART.find(i=>i.id==id); if(item.qty>1) setQty(item.id, item.qty -1); }
  if(e.target.dataset.incr){ const item = CART.find(i=>i.id==id); setQty(item.id, item.qty +1); }
  if(e.target.dataset.rm){ removeFromCart(Number(id)) }
});

function setQty(id, qty){ CART = CART.map(i=> i.id===id?({...i, qty}):i); saveCart(); }
function removeFromCart(id){ CART = CART.filter(i=>i.id!==id); saveCart(); }

document.getElementById('checkout-btn').addEventListener('click', async ()=>{
  if (!CART.length) return alert('Carrinho vazio');

  const total = calcTotal();

  // Inserir pedido no Supabase
  const { data, error } = await supabase
    .from('orders')
    .insert([{ user_id: null, total, status: 'pending', shipping_address: {} }])
    .select()
    .single();

  if (error) {
    alert('Erro ao criar pedido');
    console.error(error);
    return;
  }

  const items = CART.map(i => ({
    order_id: data.id,
    product_id: i.id,
    quantity: i.qty,
    unit_price: i.price
  }));

  const { error: itErr } = await supabase.from('order_items').insert(items);
  if (itErr) {
    alert('Erro ao salvar itens');
    console.error(itErr);
    return;
  }

  // Montar mensagem para WhatsApp
  let message = '🍾 *Novo pedido via BebaBem!*%0A%0A';
  CART.forEach((item, idx) => {
    message += `${idx + 1}. ${encodeURIComponent(item.title)} — ${item.qty}x R$ ${formatBRL(item.price)}%0A`;
  });
  message += `%0ATotal: *R$ ${formatBRL(total)}*%0A%0A`;
  message += '✅ Pedido registrado no sistema.';

  // Limpar carrinho
  const WHATSAPP_NUMBER = '5551998811587';
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  CART = [];
  saveCart();

  // Abrir WhatsApp em nova aba/janela
  window.open(whatsappUrl, '_blank');
});

document.getElementById('search').addEventListener('input',(e)=> loadProducts(e.target.value));

async function loadProducts(q=''){
  productsGrid.innerHTML = '<p>Carregando...</p>';
  const { data, error } = await supabase.from('products').select('id,title,price,compare_at_price,image_path').ilike('title', `%${q}%`).order('is_featured',{ascending:false}).limit(50);
  if(error){ productsGrid.innerHTML = '<p>Erro ao carregar</p>'; console.error(error); return; }
  productsGrid.innerHTML = data.map(productCard).join('');
}

loadProducts();
renderCart();
