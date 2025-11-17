import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// refs
const loginForm = document.getElementById('login-form');
const adminArea = document.getElementById('admin-area');
const newProductForm = document.getElementById('new-product-form');
const productsList = document.getElementById('products-list');
const categorySelect = newProductForm.querySelector('select[name="category_id"]');
const previewImages = document.getElementById('preview-images');
const imagesInput = document.getElementById('product-images');
const countProducts = document.getElementById('count-products');
const countOrders = document.getElementById('count-orders');
const countSales = document.getElementById('count-sales');

let selectedFiles = [];

// preview das imagens do novo produto
imagesInput.addEventListener('change', e => {
  previewImages.innerHTML = '';
  selectedFiles = Array.from(e.target.files || []);
  selectedFiles.forEach(f => {
    const url = URL.createObjectURL(f);
    const img = document.createElement('img');
    img.src = url;
    Object.assign(img.style, { width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px' });
    previewImages.appendChild(img);
  });
});

// login
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginForm.email.value,
    password: loginForm.password.value
  });
  if (error) return alert('Erro ao logar');
  loginForm.style.display = 'none';
  adminArea.style.display = 'block';
  await loadCategories();
  await loadProducts();
  await loadDashboard();
});

// logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  adminArea.style.display = 'none';
  loginForm.style.display = 'block';
});

// dashboard
async function loadDashboard() {
  const [{ data: prod }, { data: orders }, { data: sales }] = await Promise.all([
    supabase.from('products').select('id'),
    supabase.from('orders').select('id'),
    supabase.rpc('sum_orders_total')
  ]);
  countProducts.textContent = prod?.length || 0;
  countOrders.textContent = orders?.length || 0;
  countSales.textContent = (sales && sales[0] && sales[0].sum) ? Number(sales[0].sum).toFixed(2) : '0.00';
}

// categorias (select)
async function loadCategories() {
  const { data } = await supabase.from('categories').select('*').order('name');
  if (!data) return;
  const opts = data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  categorySelect.innerHTML = '<option value="">Escolha categoria</option>' + opts;
}

// listagem com editor inline
async function loadProducts() {
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (!data) return;

  productsList.innerHTML = data.map(p => `
    <details class="admin-card" data-id="${p.id}">
      <summary>
        <img src="${SUPABASE_URL}/storage/v1/object/public/product-images/${p.image_path}" />
        <div>
          <strong>${p.title}</strong>
          <span>R$ ${Number(p.price).toFixed(2)} • Est: ${p.stock ?? '—'}</span>
        </div>
      </summary>

      <form class="admin-form" data-id="${p.id}">
        <label>Título<br><input name="title" value="${p.title}" required></label>
        <label>Slug<br><input name="slug" value="${p.slug}"></label>
        <label>Descrição<br><textarea name="description">${p.description || ''}</textarea></label>

        <div class="grid-3">
          <label>Preço (R$)<br><input name="price" type="number" step="0.01" value="${p.price}" required></label>
          <label>Preço anterior<br><input name="compare_at_price" type="number" step="0.01" value="${p.compare_at_price || ''}"></label>
          <label>Estoque<br><input name="stock" type="number" min="0" value="${p.stock || ''}"></label>
        </div>

        <div class="grid-3">
          <label>Volume (ml)<br><input name="volume_ml" type="number" value="${p.volume_ml || ''}"></label>
          <label>Teor alcoólico (%)<br><input name="abv" type="number" step="0.1" value="${p.abv || ''}"></label>
          <label>Categoria<br>${categorySelect.outerHTML.replace('name="category_id"', `name="category_id"`)}</label>
        </div>

        <label class="check">
          <input type="checkbox" name="is_featured" ${p.is_featured ? 'checked' : ''}> Destaque
        </label>

        <div class="actions">
          <button type="submit" class="btn-primary">Salvar</button>
          <button type="button" class="btn-danger" data-del="${p.id}">Excluir</button>
        </div>
      </form>
    </details>
  `).join('');

  // preenche categorias
  document.querySelectorAll('.admin-form select[name="category_id"]').forEach(sel => {
    sel.value = sel.closest('form').dataset.cat || '';
  });

  // handlers
  document.querySelectorAll('.admin-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const id = form.dataset.id;
      const payload = Object.fromEntries(new FormData(form));
      payload.price = parseFloat(payload.price);
      payload.compare_at_price = payload.compare_at_price ? parseFloat(payload.compare_at_price) : null;
      payload.stock = payload.stock ? parseInt(payload.stock) : null;
      payload.volume_ml = payload.volume_ml ? parseInt(payload.volume_ml) : null;
      payload.abv = payload.abv ? parseFloat(payload.abv) : null;
      payload.category_id = payload.category_id ? parseInt(payload.category_id) : null;
      payload.is_featured = payload.is_featured === 'on';

      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) return alert('Erro ao salvar');
      alert('Produto atualizado!');
      loadProducts();
      loadDashboard();
    });
  });

  document.querySelectorAll('.btn-danger').forEach(btn =>
    btn.addEventListener('click', async e => {
      if (!confirm('Deseja realmente excluir este produto?')) return;
      const id = btn.dataset.del;
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) return alert('Erro ao excluir');
      loadProducts();
      loadDashboard();
    })
  );
}

// cadastro novo produto
newProductForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!selectedFiles.length) return alert('Escolha pelo menos 1 imagem');

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
  if (error || !product) return alert('Erro ao criar produto');

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    const filePath = `${Date.now()}_${i}_${file.name}`;
    const { error: upError } = await supabase.storage.from('product-images').upload(filePath, file);
    if (upError) continue;
    await supabase.from('product_images').insert([{ product_id: product.id, image_path: filePath, position: i }]);
    if (i === 0) await supabase.from('products').update({ image_path: filePath, thumbnail: filePath }).eq('id', product.id);
  }

  alert('Produto cadastrado com imagens!');
  newProductForm.reset();
  previewImages.innerHTML = '';
  selectedFiles = [];
  loadProducts();
  loadDashboard();
});

// carga inicial
loadCategories();