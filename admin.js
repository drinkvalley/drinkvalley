import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Substitua
const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const loginForm = document.getElementById('login-form');
const adminArea = document.getElementById('admin-area');
const newProductForm = document.getElementById('new-product-form');
const productsList = document.getElementById('products-list');
const categorySelect = newProductForm?.querySelector('select[name="category_id"]');
const previewImages = document.getElementById('preview-images');
const imagesInput = document.getElementById('product-images');
const countProducts = document.getElementById('count-products');
const countOrders = document.getElementById('count-orders');
const countSales = document.getElementById('count-sales');

let selectedFiles = [];

imagesInput?.addEventListener('change', (e)=>{
  previewImages.innerHTML = '';
  selectedFiles = Array.from(e.target.files || []);
  selectedFiles.forEach(f=>{
    const url = URL.createObjectURL(f);
    const img = document.createElement('img');
    img.src = url;
    img.style.width = '70px';
    img.style.height = '70px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';
    previewImages.appendChild(img);
  });
});

loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error){ alert('Erro ao logar'); console.error(error); return; }
  adminArea.style.display = 'block';
  loginForm.style.display = 'none';
  await loadCategories(); await loadProducts(); await loadDashboard();
});

document.getElementById('logout-btn').addEventListener('click', async ()=>{
  await supabase.auth.signOut();
  adminArea.style.display = 'none';
  loginForm.style.display = 'block';
});

async function loadDashboard(){
  const [{ data:prod }, { data:orders }, { data:sales }] = await Promise.all([
    supabase.from('products').select('id'),
    supabase.from('orders').select('id'),
    supabase.rpc('sum_orders_total')
  ]);
  countProducts.textContent = prod?.length || 0;
  countOrders.textContent = orders?.length || 0;
  countSales.textContent = (sales && sales[0] && sales[0].sum) ? Number(sales[0].sum).toFixed(2) : '0.00';
}

async function loadCategories(){
  const { data } = await supabase.from('categories').select('*').order('name');
  if(!data) { categorySelect.innerHTML = '<option value="">Sem categorias</option>'; return; }
  categorySelect.innerHTML = '<option value="">Escolha categoria</option>' + data.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadProducts(){
  const { data } = await supabase.from('products').select('*').order('created_at',{ascending:false});
  if(!data) { productsList.innerHTML = '<p>Erro ao carregar</p>'; return; }
  productsList.innerHTML = data.map(p=>`
    <div style="display:flex;gap:12px;align-items:center;padding:10px;border-radius:10px;margin-bottom:8px;background:linear-gradient(180deg,#071225,#071224);border:1px solid rgba(255,255,255,0.03)">
      <img src="${SUPABASE_URL}/storage/v1/object/public/product-images/${p.image_path}" style="width:70px;height:70px;object-fit:cover;border-radius:8px"/>
      <div style="flex:1">
        <div><strong>${p.title}</strong> ${p.is_featured?'<small style="color:#ffd28a;margin-left:8px">Destaque</small>':''}</div>
        <div style="color:var(--muted)">R$ ${Number(p.price).toFixed(2)} • Estoque: ${p.stock ?? '—'}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button data-edit="${p.id}" class="btn-primary">Editar</button>
        <button data-del="${p.id}" class="btn-ghost">Excluir</button>
      </div>
    </div>
  `).join('');
}

newProductForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(!selectedFiles.length){ alert('Escolha pelo menos 1 imagem'); return; }
  // create product first with placeholder image_path (we will update main image)
  const payload = {
    title: newProductForm.title.value,
    slug: newProductForm.slug.value,
    description: newProductForm.description.value,
    price: parseFloat(newProductForm.price.value),
    compare_at_price: newProductForm.compare_at_price.value ? parseFloat(newProductForm.compare_at_price.value) : null,
    volume_ml: newProductForm.volume_ml.value ? parseInt(newProductForm.volume_ml.value) : null,
    abv: newProductForm.abv.value ? parseFloat(newProductForm.abv.value) : null,
    category_id: newProductForm.category_id.value ? parseInt(newProductForm.category_id.value) : null,
    stock: newProductForm.stock.value ? parseInt(newProductForm.stock.value) : null,
    image_path: null,
    thumbnail: null,
    is_featured: newProductForm.querySelector('[name="is_featured"]').checked
  };
  const { data: product, error } = await supabase.from('products').insert([payload]).select().single();
  if(error || !product){ alert('Erro ao criar produto'); console.error(error); return; }

  // upload images
  const uploaded = [];
  for(let i=0;i<selectedFiles.length;i++){
    const file = selectedFiles[i];
    const filePath = `${Date.now()}_${i}_${file.name}`;
    const up = await supabase.storage.from('product-images').upload(filePath, file);
    if(up.error){ console.error('Erro upload', up.error); continue; }
    uploaded.push({ image_path: filePath, position: i });
    // insert in product_images table
    await supabase.from('product_images').insert([{ product_id: product.id, image_path: filePath, position: i }]);
    // for first image set product.image_path and separate thumbnail
    if(i===0){
      await supabase.from('products').update({ image_path: filePath, thumbnail: filePath }).eq('id', product.id);
    }
  }

  alert('Produto cadastrado com imagens!');
  newProductForm.reset();
  previewImages.innerHTML = '';
  selectedFiles = [];
  loadProducts();
  loadDashboard();
});

// edit / delete
productsList?.addEventListener('click', async (e)=>{
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.del;
  if(editId){
    const { data } = await supabase.from('products').select('*').eq('id', editId).single();
    if(!data) return alert('Produto não encontrado');
    const title = prompt('Título', data.title);
    if(title === null) return;
    const price = prompt('Preço (ex: 25.50)', data.price);
    if(price === null) return;
    const stock = prompt('Estoque (unidades)', data.stock ?? 0);
    if(stock === null) return;
    const isFeatured = confirm('Marcar como destaque? OK=Sim, Cancel=Não');
    const { error } = await supabase.from('products').update({
      title, price: parseFloat(price), stock: parseInt(stock), is_featured: isFeatured
    }).eq('id', editId);
    if(error){ alert('Erro ao atualizar'); console.error(error); return; }
    alert('Atualizado');
    loadProducts();
    loadDashboard();
  }
  if(delId){
    if(!confirm('Deseja realmente excluir este produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', delId);
    if(error){ alert('Erro ao excluir'); console.error(error); return; }
    alert('Excluído');
    loadProducts();
    loadDashboard();
  }
});

// initial
loadCategories();
