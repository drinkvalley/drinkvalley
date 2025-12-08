import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// refs
const loginForm = document.getElementById('login-form');
const adminArea = document.getElementById('admin-area');
const newProductForm = document.getElementById('new-product-form');
const productsList = document.getElementById('products-list');
const categorySelect = newProductForm.querySelector('select[name="category_id"]');
const countProducts = document.getElementById('count-products');
const countOrders = document.getElementById('count-orders');
const countSales = document.getElementById('count-sales');

let selectedFiles = new Array(5).fill(null);
let currentEditingProduct = null;
let draggedElement = null;

// Cria slots de imagem
function createImageSlots(containerId, editable = true) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.className = 'image-slot';
    slot.dataset.index = i;
    if (editable) {
      slot.draggable = true;
    }
    
    slot.innerHTML = `
      <div class="placeholder">
        <span>Imagem ${i + 1}</span>
      </div>
      <img style="display:none;">
      <button type="button" class="remove-btn" onclick="removeImage(${i}, '${containerId}')">×</button>
      <input type="file" accept="image/*" style="display:none;">
    `;
    
    slot.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && editable) {
        slot.querySelector('input[type="file"]').click();
      }
    });
    
    const fileInput = slot.querySelector('input[type="file"]');
    fileInput.addEventListener('change', (e) => {
      handleImageSelect(i, containerId, e);
    });
    
    if (editable) {
      // Eventos de drag and drop
      slot.addEventListener('dragstart', handleDragStart);
      slot.addEventListener('dragover', handleDragOver);
      slot.addEventListener('drop', handleDrop);
      slot.addEventListener('dragend', handleDragEnd);
      slot.addEventListener('dragenter', handleDragEnter);
      slot.addEventListener('dragleave', handleDragLeave);
    }
    
    container.appendChild(slot);
  }
}

// Drag and drop handlers
function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
  e.dataTransfer.setData('drag-index', this.dataset.index);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (draggedElement !== this) {
    const draggedIndex = parseInt(draggedElement.dataset.index);
    const targetIndex = parseInt(this.dataset.index);
    
    // Troca o conteúdo dos slots
    const draggedImg = draggedElement.querySelector('img');
    const draggedPlaceholder = draggedElement.querySelector('.placeholder');
    const draggedHasImage = draggedElement.classList.contains('has-image');
    const draggedSrc = draggedImg.src;
    const draggedDisplay = draggedImg.style.display;
    const draggedPlaceholderDisplay = draggedPlaceholder.style.display;
    
    const targetImg = this.querySelector('img');
    const targetPlaceholder = this.querySelector('.placeholder');
    const targetHasImage = this.classList.contains('has-image');
    const targetSrc = targetImg.src;
    const targetDisplay = targetImg.style.display;
    const targetPlaceholderDisplay = targetPlaceholder.style.display;
    
    // Troca imagens
    targetImg.src = draggedSrc;
    targetImg.style.display = draggedDisplay;
    targetPlaceholder.style.display = draggedPlaceholderDisplay;
    
    draggedImg.src = targetSrc;
    draggedImg.style.display = targetDisplay;
    draggedPlaceholder.style.display = targetPlaceholderDisplay;
    
    // Troca classes
    if (draggedHasImage) {
      this.classList.add('has-image');
    } else {
      this.classList.remove('has-image');
    }
    
    if (targetHasImage) {
      draggedElement.classList.add('has-image');
    } else {
      draggedElement.classList.remove('has-image');
    }
    
    // Troca os dados dos arquivos
    const containerId = this.closest('.image-slots').id;
    if (containerId === 'image-slots') {
      const temp = selectedFiles[draggedIndex];
      selectedFiles[draggedIndex] = selectedFiles[targetIndex];
      selectedFiles[targetIndex] = temp;
    } else if (containerId === 'edit-image-slots' && currentEditingProduct) {
      if (!currentEditingProduct.tempFiles) currentEditingProduct.tempFiles = {};
      if (!currentEditingProduct.originalFiles) currentEditingProduct.originalFiles = {};
      
      // Troca arquivos temporários
      const temp = currentEditingProduct.tempFiles[draggedIndex];
      currentEditingProduct.tempFiles[draggedIndex] = currentEditingProduct.tempFiles[targetIndex];
      currentEditingProduct.tempFiles[targetIndex] = temp;
      
      // Troca imagens existentes
      const original = currentEditingProduct.originalFiles[draggedIndex];
      currentEditingProduct.originalFiles[draggedIndex] = currentEditingProduct.originalFiles[targetIndex];
      currentEditingProduct.originalFiles[targetIndex] = original;
      
      // Troca dados dos slots
      const draggedData = {
        existingImage: draggedElement.dataset.existingImage,
        imageId: draggedElement.dataset.imageId
      };
      
      draggedElement.dataset.existingImage = this.dataset.existingImage;
      draggedElement.dataset.imageId = this.dataset.imageId;
      
      this.dataset.existingImage = draggedData.existingImage;
      this.dataset.imageId = draggedData.imageId;
    }
  }
  
  this.classList.remove('drag-over');
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.image-slot').forEach(slot => {
    slot.classList.remove('drag-over');
  });
}

// Handle image selection
function handleImageSelect(index, containerId, event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const slot = document.querySelector(`#${containerId} .image-slot[data-index="${index}"]`);
  const img = slot.querySelector('img');
  const placeholder = slot.querySelector('.placeholder');
  
  const reader = new FileReader();
  reader.onload = (e) => {
    img.src = e.target.result;
    img.style.display = 'block';
    placeholder.style.display = 'none';
    slot.classList.add('has-image');
  };
  reader.readAsDataURL(file);
  
  if (containerId === 'image-slots') {
    selectedFiles[index] = file;
  } else if (containerId === 'edit-image-slots') {
    if (!currentEditingProduct.tempFiles) currentEditingProduct.tempFiles = {};
    currentEditingProduct.tempFiles[index] = file;
    
    // Remove a flag de imagem existente se houver um arquivo novo
    if (slot.dataset.existingImage) {
      delete slot.dataset.existingImage;
      delete slot.dataset.imageId;
    }
  }
}

// Remove image
function removeImage(index, containerId) {
  event.stopPropagation();
  
  const slot = document.querySelector(`#${containerId} .image-slot[data-index="${index}"]`);
  const img = slot.querySelector('img');
  const placeholder = slot.querySelector('.placeholder');
  const fileInput = slot.querySelector('input[type="file"]');
  
  img.style.display = 'none';
  placeholder.style.display = 'flex';
  slot.classList.remove('has-image');
  fileInput.value = '';
  
  if (containerId === 'image-slots') {
    selectedFiles[index] = null;
  } else if (containerId === 'edit-image-slots') {
    if (currentEditingProduct.tempFiles) {
      currentEditingProduct.tempFiles[index] = null;
    }
    // Remove dados de imagem existente
    delete slot.dataset.existingImage;
    delete slot.dataset.imageId;
  }
}

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
  createImageSlots('image-slots');
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

        <div class="image-preview-grid" id="images-${p.id}">
          <!-- Imagens serão carregadas aqui -->
        </div>

        <button type="button" class="edit-images-btn" onclick="openImageEdit('${p.id}')">
          📷 Editar Imagens
        </button>

        <div class="actions">
          <button type="submit" class="btn-primary">Salvar</button>
          <button type="button" class="btn-danger" data-del="${p.id}">Excluir</button>
        </div>
      </form>
    </details>
  `).join('');

  // Carrega imagens para cada produto
  for (const product of data) {
    await loadProductImages(product.id);
  }

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

// Carrega imagens do produto
async function loadProductImages(productId) {
  const { data: images } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('position');

  const container = document.getElementById(`images-${productId}`);
  if (!container) return;

  container.innerHTML = images?.map(img => `
    <div class="image-preview-item">
      <img src="${SUPABASE_URL}/storage/v1/object/public/product-images/${img.image_path}" alt="Imagem do produto">
    </div>
  `).join('') || '';
}

// Abre modal de edição de imagens
async function openImageEdit(productId) {
  currentEditingProduct = { 
    id: productId, 
    tempFiles: {},
    originalFiles: {}
  };
  
  const modal = document.getElementById('image-edit-modal');
  modal.style.display = 'block';
  
  createImageSlots('edit-image-slots');
  
  // Carrega imagens existentes
  const { data: images } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('position');
  
  if (images) {
    images.forEach((img, index) => {
      const slot = document.querySelector(`#edit-image-slots .image-slot[data-index="${index}"]`);
      const imgEl = slot.querySelector('img');
      const placeholder = slot.querySelector('.placeholder');
      
      imgEl.src = `${SUPABASE_URL}/storage/v1/object/public/product-images/${img.image_path}`;
      imgEl.style.display = 'block';
      placeholder.style.display = 'none';
      slot.classList.add('has-image');
      slot.dataset.existingImage = img.image_path;
      slot.dataset.imageId = img.id;
      
      // Salva estado original
      currentEditingProduct.originalFiles[index] = {
        image_path: img.image_path,
        id: img.id
      };
    });
  }
}

// Salva imagens editadas
document.getElementById('save-images')?.addEventListener('click', async () => {
  if (!currentEditingProduct) return;
  
  const { id } = currentEditingProduct;
  const slots = document.querySelectorAll('#edit-image-slots .image-slot');
  const finalOrder = [];
  
  // Coleta a ordem final dos slots
  slots.forEach((slot, index) => {
    const hasImage = slot.classList.contains('has-image');
    const existingImage = slot.dataset.existingImage;
    const imageId = slot.dataset.imageId;
    const tempFile = currentEditingProduct.tempFiles?.[index];
    
    if (hasImage) {
      finalOrder.push({
        index,
        hasImage: true,
        existingImage,
        imageId,
        tempFile,
        slot: slot
      });
    }
  });
  
  if (finalOrder.length === 0) {
    document.getElementById('image-edit-modal').style.display = 'none';
    return;
  }
  
  // Deleta todas as imagens antigas e recria na nova ordem
  const { data: oldImages } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', id);
  
  if (oldImages) {
    for (const img of oldImages) {
      await supabase.storage.from('product-images').remove([img.image_path]);
    }
    await supabase.from('product_images').delete().eq('product_id', id);
  }
  
  // Salva na nova ordem
  for (let i = 0; i < finalOrder.length; i++) {
    const item = finalOrder[i];
    let filePath;
    
    if (item.tempFile) {
      // Upload novo arquivo
      filePath = `${Date.now()}_${i}_${item.tempFile.name}`;
      const { error: upError } = await supabase.storage.from('product-images').upload(filePath, item.tempFile);
      if (upError) continue;
    } else if (item.existingImage) {
      // Reusa imagem existente
      filePath = item.existingImage;
    } else {
      continue;
    }
    
    await supabase.from('product_images').insert([{
      product_id: id,
      image_path: filePath,
      position: i
    }]);
    
    if (i === 0) {
      await supabase.from('products').update({
        image_path: filePath,
        thumbnail: filePath
      }).eq('id', id);
    }
  }
  
  document.getElementById('image-edit-modal').style.display = 'none';
  loadProducts();
  alert('Imagens reordenadas com sucesso!');
});

// Cancela edição de imagens
document.getElementById('cancel-image-edit')?.addEventListener('click', () => {
  document.getElementById('image-edit-modal').style.display = 'none';
  currentEditingProduct = null;
});

// cadastro novo produto
newProductForm.addEventListener('submit', async e => {
  e.preventDefault();
  
  const hasImages = selectedFiles.some(f => f);
  if (!hasImages) return alert('Escolha pelo menos 1 imagem');
  
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
  
  const validFiles = selectedFiles.filter(f => f);
  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    const filePath = `${Date.now()}_${i}_${file.name}`;
    const { error: upError } = await supabase.storage.from('product-images').upload(filePath, file);
    if (upError) continue;
    
    await supabase.from('product_images').insert([{
      product_id: product.id,
      image_path: filePath,
      position: i
    }]);
    
    if (i === 0) {
      await supabase.from('products').update({
        image_path: filePath,
        thumbnail: filePath
      }).eq('id', product.id);
    }
  }
  
  alert('Produto cadastrado com imagens!');
  newProductForm.reset();
  selectedFiles = new Array(5).fill(null);
  createImageSlots('image-slots');
  loadProducts();
  loadDashboard();
});

// carga inicial
loadCategories();

// Torna as funções globais para serem chamadas pelos eventos onclick
window.removeImage = removeImage;
window.openImageEdit = openImageEdit;