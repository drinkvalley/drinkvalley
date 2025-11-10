import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// COLE AQUI SUAS CHAVES DO SUPABASE
const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const loginForm = document.getElementById('login-form');
const adminArea = document.getElementById('admin-area');
const newProductForm = document.getElementById('new-product-form');
const productsList = document.getElementById('products-list');
const categorySelect = newProductForm.querySelector('select[name="category_id"]');

async function loadCategories(){
  const { data } = await supabase.from('categories').select('*').order('name');
  if(data && data.length){
    categorySelect.innerHTML = '<option value="">Escolha categoria</option>' + data.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  } else {
    categorySelect.innerHTML = '<option value="">Sem categorias (crie via Supabase)</option>';
  }
}

loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error){ alert('Erro ao logar'); console.error(error); return; }
  // mostrar admin
  adminArea.style.display = 'block';
  loginForm.style.display = 'none';
  await loadCategories(); await loadProducts();
});

document.getElementById('logout-btn').addEventListener('click', async ()=>{
  await supabase.auth.signOut();
  adminArea.style.display = 'none';
  loginForm.style.display = 'block';
});

async function loadProducts(){
  const { data } = await supabase.from('products').select('*').order('created_at', {ascending:false});
  if(!data) { productsList.innerHTML = '<p>Erro ao carregar produtos</p>'; return; }
  productsList.innerHTML = data.map(p=>`
    <div style="display:flex;gap:10px;align-items:center;padding:8px;border-bottom:1px solid #eee">
      <img src="${SUPABASE_URL}/storage/v1/object/public/product-images/${p.image_path}" style="width:56px;height:56px;object-fit:cover"/>
      <div style="flex:1">
        <div><strong>${p.title}</strong></div>
        <div>R$ ${Number(p.price).toFixed(2)}</div>
      </div>
      <button data-edit="${p.id}">Editar</button>
      <button data-del="${p.id}">Excluir</button>
    </div>
  `).join('');
}

newProductForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const file = document.getElementById('product-image').files[0];
  if(!file){ alert('Escolha imagem'); return; }
  const filePath = `${Date.now()}_${file.name}`;
  const up = await supabase.storage.from('product-images').upload(filePath, file, { cacheControl: '3600', upsert: false });
  if(up.error){ alert('Erro upload'); console.error(up.error); return; }
  const payload = {
    title: newProductForm.title.value,
    slug: newProductForm.slug.value,
    description: newProductForm.description.value,
    price: parseFloat(newProductForm.price.value),
    compare_at_price: newProductForm.compare_at_price.value ? parseFloat(newProductForm.compare_at_price.value) : null,
    volume_ml: newProductForm.volume_ml.value ? parseInt(newProductForm.volume_ml.value) : null,
    abv: newProductForm.abv.value ? parseFloat(newProductForm.abv.value) : null,
    category_id: newProductForm.category_id.value ? parseInt(newProductForm.category_id.value) : null,
    image_path: filePath
  };
  const { error } = await supabase.from('products').insert([payload]);
  if(error){ alert('Erro salvar produto'); console.error(error); return; }
  alert('Produto cadastrado!');
  newProductForm.reset();
  await loadProducts();
});
