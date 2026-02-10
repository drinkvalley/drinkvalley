// product.js - página de detalhe com carrossel para bebidas e pods
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const params = new URLSearchParams(location.search);
const slug = params.get('slug');
const el = document.getElementById('product-detail');

let CART = JSON.parse(localStorage.getItem('cart_v1') || '[]');
function saveCart(){ localStorage.setItem('cart_v1', JSON.stringify(CART)); updateCartCount(); }
function formatBRL(v){ return Number(v).toFixed(2).replace('.',','); }
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
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function load(){
  if(!slug){ el.innerHTML = '<p class="not-found">Produto não encontrado</p>'; return; }
  el.innerHTML = '<div class="loading">Carregando produto...</div>';
  
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).single();
  if(error || !data){ el.innerHTML = '<p class="not-found">Produto não encontrado</p>'; console.error(error); return; }

  // fetch images related
  const { data: imgs } = await supabase.from('product_images').select('image_path').eq('product_id', data.id).order('position', {ascending:true});
  const images = (imgs && imgs.length) ? imgs.map(i=>i.image_path) : (data.image_path ? [data.image_path] : []);

  // Identificar se é pod ou bebida
  const isPod = data.pod_flavor || data.pod_strength || data.pod_puffs;
  
  // Informações adicionais do produto
  let specs = [];
  
  if (isPod) {
    // ESPECIFICAÇÕES DE PODS
    if (data.pod_flavor) specs.push({ label: 'Sabor', value: data.pod_flavor });
    if (data.pod_strength) specs.push({ label: 'Força', value: data.pod_strength });
    if (data.pod_puffs) specs.push({ label: 'Puffs', value: `${data.pod_puffs} puffs` });
    if (data.pod_capacity) specs.push({ label: 'Capacidade', value: `${data.pod_capacity}ml` });
  } else {
    // ESPECIFICAÇÕES DE BEBIDAS
    if (data.volume_ml) specs.push({ label: 'Volume', value: `${data.volume_ml}ml` });
    if (data.abv) specs.push({ label: 'Teor Alcoólico', value: `${data.abv}% ABV` });
  }
  
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
        ${images.map((img, idx)=>`
          <div class="carousel-item ${idx===0?'active':''}" data-index="${idx}">
            <img src="${getPublicUrl(img)}" alt="${data.title}" />
          </div>
        `).join('')}
        ${images.length === 0 ? `
          <div class="carousel-item active">
            <img src="${getPublicUrl(null)}" alt="Produto sem imagem" />
          </div>
        ` : ''}
      </div>
      
      <div class="carousel-thumbnails">
        ${images.map((img, idx)=>`
          <div class="thumb-item ${idx===0?'active':''}" data-index="${idx}">
            <img src="${getPublicUrl(img)}" alt="Miniatura ${idx+1}" />
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="product-info">
      <div class="product-header">
        <h1 class="product-title">${data.title}</h1>
        ${category ? `<span class="product-category">${category.name}</span>` : ''}
        ${isPod ? '<span class="product-type-badge pod-badge">💨 POD</span>' : '<span class="product-type-badge drink-badge">🍾 BEBIDA</span>'}
      </div>
      
      <div class="product-pricing">
        <span class="price">R$ ${formatBRL(data.price)}</span>
        ${data.compare_at_price ? `<span class="compare-price">R$ ${formatBRL(data.compare_at_price)}</span>` : ''}
      </div>
      
      <div class="product-specs">
        ${specs.map(spec => `
          <div class="spec-item">
            <span class="spec-label">${spec.label}:</span>
            <span class="spec-value">${spec.value}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="product-description">
        <h3>Descrição</h3>
        <p>${data.description || 'Sem descrição disponível.'}</p>
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
        ${isPod ? `
          <div class="warning-info">
            <span class="warning-icon">⚠️</span>
            <span>Produto com nicotina. Apenas para maiores de 18 anos.</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Carousel functionality
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

  // Add to cart
  document.getElementById('add-to-cart')?.addEventListener('click', ()=>{
    if (data.stock <= 0) return;
    
    const exists = CART.find(i=>i.id===data.id);
    if(exists) exists.qty++;
    else CART.push({
      id:data.id, 
      title:data.title, 
      price: Number(data.price), 
      image: images[0] || data.image_path, 
      qty:1
    });
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
  loadRelatedProducts(data.category_id, data.id, isPod);
  updateCartCount();
}

async function loadRelatedProducts(category_id, currentProductId, isPod){
  console.log('🔍 Buscando produtos relacionados...');
  console.log('📦 Categoria ID:', category_id);
  console.log('🆔 Produto atual ID:', currentProductId);
  console.log('💨 É pod?', isPod);
  
  if (!category_id) {
    console.log('❌ category_id vazio');
    return;
  }
  
  try {
    // Buscar produtos da mesma categoria, excluindo o atual
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, slug, price, image_path, category_id, pod_flavor, volume_ml')
      .eq('category_id', category_id)
      .eq('is_archived', false)
      .neq('id', currentProductId)
      .limit(4);
      
    if (error) {
      console.log('❌ Erro Supabase:', error);
      return;
    }
    
    console.log('✅ Produtos encontrados:', products);
    
    if (!products || products.length === 0) {
      console.log('📭 Nenhum produto relacionado encontrado');
      document.getElementById('related-products-grid').innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 40px;">
          Nenhum produto similar encontrado nesta categoria.
        </div>
      `;
      return;
    }
    
    const grid = document.getElementById('related-products-grid');
    grid.innerHTML = products.map(product => {
      const isProductPod = product.pod_flavor || product.volume_ml === null;
      const typeBadge = isProductPod ? '<div class="badge pod-badge">💨 POD</div>' : '<div class="badge drink-badge">🍾</div>';
      
      return `
        <div class="card related-card">
          <a href="/product.html?slug=${product.slug}" class="card-link">
            <div class="card-thumb">
              <img src="${getPublicUrl(product.image_path)}" alt="${product.title}" />
              ${typeBadge}
            </div>
            <h3 class="product-title">${product.title}</h3>
            <div class="price">R$ ${formatBRL(product.price)}</div>
          </a>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.log('💥 Erro geral:', err);
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
  const productId = new URLSearchParams(location.search).get('slug');
  
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('slug', productId)
    .single();
    
  if (!product) return;
  
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
  miniCart.setAttribute('aria-hidden', 'false');
});

document.getElementById('close-mini-cart')?.addEventListener('click', () => {
  const miniCart = document.getElementById('mini-cart');
  miniCart.setAttribute('aria-hidden', 'true');
});

load();w