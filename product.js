// product.js - DrinkValley v3.0 (página de produto - somente bebidas)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const params = new URLSearchParams(location.search);
const slug = params.get('slug');
const el = document.getElementById('product-detail');

let CART = JSON.parse(localStorage.getItem('cart_v1') || '[]');

function saveCart(){ 
  localStorage.setItem('cart_v1', JSON.stringify(CART)); 
  updateCartCount(); 
  renderMiniCart(); 
}

function formatBRL(v){ 
  return Number(v).toFixed(2).replace('.',','); 
}

function updateCartCount(){ 
  document.querySelectorAll('#cart-count').forEach(n=> n.textContent = CART.reduce((s,i)=> s + i.qty, 0)); 
}

function getPublicUrl(path){ 
  if(!path) return 'https://via.placeholder.com/400x600/1a1a1a/666?text=Produto+sem+imagem'; 
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.classList.add('hidden'), 200);
  }, 2500);
}

function renderMiniCart() {
  const miniCartItems = document.getElementById('mini-cart-items');
  const miniCartTotal = document.getElementById('mini-cart-total');
  
  if (!miniCartItems || !miniCartTotal) return;
  
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
  
  miniCartTotal.textContent = formatBRL(CART.reduce((s, i) => s + (i.price * i.qty), 0));
}

async function load(){
  if(!slug){ 
    el.innerHTML = '<p class="not-found">Produto não encontrado</p>'; 
    return; 
  }
  
  el.innerHTML = '<div class="loading">Carregando produto...</div>';
  
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).single();
  
  if(error || !data){ 
    el.innerHTML = '<p class="not-found">Produto não encontrado</p>'; 
    console.error(error); 
    return; 
  }

  // Buscar imagens do produto
  const { data: imgs } = await supabase
    .from('product_images')
    .select('image_path')
    .eq('product_id', data.id)
    .order('position', {ascending:true});
    
  const images = (imgs && imgs.length) ? imgs.map(i=>i.image_path) : (data.image_path ? [data.image_path] : []);

  // Especificações do produto (apenas bebidas)
  let specs = [];
  
  if (data.volume_ml) specs.push({ label: 'Volume', value: `${data.volume_ml}ml` });
  if (data.abv) specs.push({ label: 'Teor Alcoólico', value: `${data.abv}% ABV` });
  if (data.origin) specs.push({ label: 'Origem', value: data.origin });

  // Buscar categoria
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', data.category_id)
    .single();

  el.innerHTML = `
    <div class="product-gallery">
      <div class="carousel" id="carousel-main">
        ${images.length > 0 ? images.map((img, idx)=>`
          <div class="carousel-item ${idx===0?'active':''}" data-index="${idx}">
            <img src="${getPublicUrl(img)}" alt="${data.title}" />
          </div>
        `).join('') : `
          <div class="carousel-item active">
            <img src="${getPublicUrl(null)}" alt="Produto sem imagem" />
          </div>
        `}
      </div>
      
      ${images.length > 1 ? `
        <div class="carousel-thumbnails">
          ${images.map((img, idx)=>`
            <div class="thumb-item ${idx===0?'active':''}" data-index="${idx}">
              <img src="${getPublicUrl(img)}" alt="Miniatura ${idx+1}" />
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
    
    <div class="product-info">
      <div class="product-header">
        <h1 class="product-title">${data.title}</h1>
        ${category ? `<span class="product-category">${category.name}</span>` : ''}
      </div>
      
      <div class="product-pricing">
        <span class="price">R$ ${formatBRL(data.price)}</span>
        ${data.compare_at_price ? `<span class="compare-price">R$ ${formatBRL(data.compare_at_price)}</span>` : ''}
      </div>
      
      ${specs.length > 0 ? `
        <div class="product-specs">
          ${specs.map(spec => `
            <div class="spec-item">
              <span class="spec-label">${spec.label}:</span>
              <span class="spec-value">${spec.value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="product-description">
        <h3>Descrição</h3>
        <p>${data.description || 'Bebida de qualidade premium.'}</p>
      </div>
      
      <div class="product-stock">
        ${data.stock > 0 ? 
          `<span class="in-stock">✓ Em estoque (${data.stock} unidades)</span>` : 
          `<span class="out-of-stock">✗ Produto indisponível</span>`
        }
      </div>
      
      <div class="product-actions">
        <button id="add-to-cart" class="btn-primary btn-large" ${data.stock <= 0 ? 'disabled' : ''}>
          ${data.stock > 0 ? '🛒 Adicionar ao Carrinho' : 'Produto Indisponível'}
        </button>
        <button id="fav-btn" class="btn-ghost btn-large">❤️ Favoritar</button>
      </div>
      
      <div class="product-extra">
        <div class="shipping-info">
          <span class="shipping-icon">🚚</span>
          <span>Frete grátis para compras acima de R$ 200</span>
        </div>
        <div class="payment-info">
          <span class="payment-icon">💳</span>
          <span>Parcele em até 12x sem juros</span>
        </div>
      </div>
    </div>
  `;

  // Carousel functionality
  if (images.length > 1) {
    const carouselItems = document.querySelectorAll('.carousel-item');
    const thumbnails = document.querySelectorAll('.thumb-item');
    
    thumbnails.forEach((thumb, index) => {
      thumb.addEventListener('click', () => {
        carouselItems.forEach(item => item.classList.remove('active'));
        thumbnails.forEach(item => item.classList.remove('active'));
        
        carouselItems[index].classList.add('active');
        thumbnails[index].classList.add('active');
      });
    });
  }

  // Add to cart
  document.getElementById('add-to-cart')?.addEventListener('click', ()=>{
    if (data.stock <= 0) return;
    
    const exists = CART.find(i=>i.id===data.id);
    if(exists) {
      exists.qty++;
    } else {
      CART.push({
        id: data.id, 
        title: data.title, 
        price: Number(data.price), 
        image: images[0] || data.image_path, 
        qty: 1
      });
    }
    saveCart();
    showToast('✓ Produto adicionado ao carrinho!');
  });

  // Favorite
  document.getElementById('fav-btn')?.addEventListener('click', ()=>{
    let WISHLIST = JSON.parse(localStorage.getItem('wish_v1') || '[]');
    if(WISHLIST.includes(data.id)) {
      WISHLIST = WISHLIST.filter(i=>i!==data.id);
      showToast('Produto removido dos favoritos');
    } else {
      WISHLIST.push(data.id);
      showToast('Produto adicionado aos favoritos');
    }
    localStorage.setItem('wish_v1', JSON.stringify(WISHLIST));
  });

  loadReviews(data.id);
  loadRelatedProducts(data.category_id, data.id);
  updateCartCount();
  renderMiniCart();
}

async function loadRelatedProducts(category_id, currentProductId){
  const grid = document.getElementById('related-products-grid');
  if (!grid) return;
  
  if (!category_id) {
    grid.innerHTML = '';
    return;
  }
  
  try {
    // Buscar produtos da mesma categoria, não arquivados, excluindo o produto atual
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, slug, price, compare_at_price, image_path, thumbnail, category_id, stock, archived, is_featured')
      .eq('category_id', category_id)
      .eq('archived', false)
      .neq('id', currentProductId)
      .order('is_featured', { ascending: false })
      .limit(8);
      
    if (error) {
      console.error('Erro ao buscar produtos relacionados:', error);
      grid.innerHTML = '';
      return;
    }
    
    if (!products || products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">
          Nenhum produto similar encontrado.
        </div>
      `;
      return;
    }
    
    grid.innerHTML = products.map(product => {
      const imgPath = product.thumbnail || product.image_path;
      const badge = product.is_featured ? '<div class="badge">DESTAQUE</div>' : '';
      const compare = product.compare_at_price ? `<div class="compare">R$ ${formatBRL(product.compare_at_price)}</div>` : '';
      
      return `
        <article class="card" role="article">
          <a href="/product.html?slug=${encodeURIComponent(product.slug)}" style="text-decoration:none;color:inherit;">
            ${badge}
            <div class="card-thumb">
              <img src="${getPublicUrl(imgPath)}" alt="${product.title}" loading="lazy"/>
            </div>
            <div class="product-title">${product.title}</div>
            ${compare}
            <div class="price">R$ ${formatBRL(product.price)}</div>
          </a>
        </article>
      `;
    }).join('');
    
  } catch (err) {
    console.error('Erro ao carregar produtos relacionados:', err);
    grid.innerHTML = '';
  }
}

async function loadReviews(productId){
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at',{ascending:false})
    .limit(20);
    
  const el = document.getElementById('reviews');
  if (!el) return;
  
  if(!data || !data.length){ 
    el.innerHTML = '<div class="no-reviews">Seja o primeiro a avaliar este produto.</div>'; 
    return; 
  }
  
  el.innerHTML = data.map(r=>`
    <div class="review-item">
      <div class="review-header">
        <strong>${r.name}</strong>
        <div class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
      </div>
      ${r.comment ? `<div class="review-comment">${r.comment}</div>` : ''}
    </div>
  `).join('');
}

// Review form
document.getElementById('review-form')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const form = e.target;
  const productSlug = new URLSearchParams(location.search).get('slug');
  
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('slug', productSlug)
    .single();
    
  if (!product) {
    showToast('Erro ao enviar avaliação');
    return;
  }
  
  const payload = { 
    product_id: product.id, 
    name: form.name.value, 
    rating: parseInt(form.rating.value), 
    comment: form.comment.value 
  };
  
  const { error } = await supabase.from('reviews').insert([payload]);
  
  if(error){ 
    showToast('Erro ao enviar avaliação'); 
    console.error(error); 
    return; 
  }
  
  showToast('✓ Avaliação enviada com sucesso!');
  form.reset();
  loadReviews(product.id);
});

// Cart toggle
document.getElementById('cart-toggle')?.addEventListener('click', () => {
  const miniCart = document.getElementById('mini-cart');
  if (miniCart) miniCart.setAttribute('aria-hidden', 'false');
});

document.getElementById('close-mini-cart')?.addEventListener('click', () => {
  const miniCart = document.getElementById('mini-cart');
  if (miniCart) miniCart.setAttribute('aria-hidden', 'true');
});

// Mini cart controls
document.getElementById('mini-cart-items')?.addEventListener('click', (e) => {
  const id = e.target.dataset.decr || e.target.dataset.incr || e.target.dataset.rm;
  if (!id) return;
  
  if (e.target.dataset.decr) { 
    const item = CART.find(i => i.id == id); 
    if (item && item.qty > 1) {
      item.qty--;
      saveCart();
    }
  }
  if (e.target.dataset.incr) { 
    const item = CART.find(i => i.id == id); 
    if (item) {
      item.qty++;
      saveCart();
    }
  }
  if (e.target.dataset.rm) { 
    CART = CART.filter(i => i.id != id);
    saveCart();
  }
});

// Checkout
document.getElementById('go-checkout')?.addEventListener('click', () => {
  if (!CART.length) {
    showToast('Carrinho vazio');
    return;
  }
  
  let message = `🍾 *NOVO PEDIDO* DrinkValley%0A%0A`;
  CART.forEach((item, idx) => {
    message += `${idx + 1}. ${encodeURIComponent(item.title)} — ${item.qty}x R$ ${formatBRL(item.price)}%0A`;
  });
  const total = CART.reduce((s, i) => s + (i.price * i.qty), 0);
  message += `%0A*Total: R$ ${formatBRL(total)}*%0A%0A`;
  message += `✅ Pedido enviado pelo cliente. Aguardando confirmação.`;
  
  const WHATS = '5551998811587';
  window.open(`https://wa.me/${WHATS}?text=${message}`, '_blank');
  
  CART = [];
  saveCart();
  
  const miniCart = document.getElementById('mini-cart');
  if (miniCart) miniCart.setAttribute('aria-hidden', 'true');
  
  showToast('Pedido enviado via WhatsApp ✅');
});

// Iniciar
load();
