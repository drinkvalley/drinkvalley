import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://qepishfrgwynpuazirmj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGlzaGZyZ3d5bnB1YXppcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgyNDEsImV4cCI6MjA3ODM3NDI0MX0.MQ-qoQESAaXk_rzYaemvP3pXHySp8u4hH3GW-7YT5_g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// DOM refs
const loginForm = document.getElementById('login-form');
const adminArea = document.getElementById('admin-area');
const newProductForm = document.getElementById('new-product-form');
const productsList = document.getElementById('products-list');
const archivedList = document.getElementById('archived-list');
const categorySelect = newProductForm?.querySelector('select[name="category_id"]');
const countProducts = document.getElementById('count-products');
const countOrders = document.getElementById('count-orders');
const countSales = document.getElementById('count-sales');

let selectedFiles = new Array(5).fill(null);
let currentEditingProduct = null;
let draggedElement = null;

// Login
loginForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    alert('Erro no login: ' + error.message);
    return;
  }
  
  loginForm.style.display = 'none';
  adminArea.style.display = 'block';
  
  loadDashboard();
  loadProducts();
  loadArchivedProducts();
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// Dashboard
async function loadDashboard() {
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('archived', false);
  if (countProducts) countProducts.textContent = count || 0;
  if (countOrders) countOrders.textContent = '0';
  if (countSales) countSales.textContent = '0.00';
}

// Load categories
async function loadCategories() {
  const { data } = await supabase.from('categories').select('*').order('name');
  if (!data || !categorySelect) return;
  
  categorySelect.innerHTML = `<option value="">Selecione...</option>` + 
    data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// Image slots
function createImageSlots(containerId, editable = true) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.className = 'image-slot';
    slot.dataset.index = i;
    if (editable) slot.draggable = true;
    
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
    fileInput.addEventListener('change', (e) => handleImageSelect(i, containerId, e));
    
    if (editable) {
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

// Drag handlers
function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter() {
  this.classList.add('drag-over');
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) e.stopPropagation();
  
  if (draggedElement !== this) {
    const draggedIndex = parseInt(draggedElement.dataset.index);
    const targetIndex = parseInt(this.dataset.index);
    
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
    
    targetImg.src = draggedSrc;
    targetImg.style.display = draggedDisplay;
    targetPlaceholder.style.display = draggedPlaceholderDisplay;
    
    draggedImg.src = targetSrc;
    draggedImg.style.display = targetDisplay;
    draggedPlaceholder.style.display = targetPlaceholderDisplay;
    
    if (draggedHasImage) this.classList.add('has-image');
    else this.classList.remove('has-image');
    
    if (targetHasImage) draggedElement.classList.add('has-image');
    else draggedElement.classList.remove('has-image');
    
    const containerId = this.closest('.image-slots').id;
    if (containerId === 'image-slots') {
      const temp = selectedFiles[draggedIndex];
      selectedFiles[draggedIndex] = selectedFiles[targetIndex];
      selectedFiles[targetIndex] = temp;
    } else if (containerId === 'edit-image-slots' && currentEditingProduct) {
      if (!currentEditingProduct.tempFiles) currentEditingProduct.tempFiles = {};
      if (!currentEditingProduct.originalFiles) currentEditingProduct.originalFiles = {};
      
      const temp = currentEditingProduct.tempFiles[draggedIndex];
      currentEditingProduct.tempFiles[draggedIndex] = currentEditingProduct.tempFiles[targetIndex];
      currentEditingProduct.tempFiles[targetIndex] = temp;
      
      const original = currentEditingProduct.originalFiles[draggedIndex];
      currentEditingProduct.originalFiles[draggedIndex] = currentEditingProduct.originalFiles[targetIndex];
      currentEditingProduct.originalFiles[targetIndex] = original;
      
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

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.image-slot').forEach(slot => slot.classList.remove('drag-over'));
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
    if (currentEditingProduct.tempFiles) delete currentEditingProduct.tempFiles[index];
    if (slot.dataset.existingImage) {
      delete slot.dataset.existingImage;
      delete slot.dataset.imageId;
    }
  }
}

// Load active products
async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error(error);
    productsList.innerHTML = '<p style="text-align:center;color:var(--muted)">Erro ao carregar produtos</p>';
    return;
  }
  
  if (!data || data.length === 0) {
    productsList.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">Nenhum produto ativo</p>';
    return;
  }
  
  productsList.innerHTML = data.map(p => {
    const thumb = p.thumbnail || p.image_path;
    const thumbUrl = thumb ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${thumb}` : 'https://via.placeholder.com/60';
    
    return `
      <details class="admin-card">
        <summary>
          <img src="${thumbUrl}" alt="${p.title}">
          <strong>${p.title}</strong>
          <span class="muted">R$ ${Number(p.price).toFixed(2)}</span>
        </summary>
        <div class="admin-form">
          <div><strong>Slug:</strong> ${p.slug}</div>
          <div><strong>Estoque:</strong> ${p.stock || 0}</div>
          ${p.is_featured ? '<div style="color: var(--accent);">⭐ Em Destaque</div>' : ''}
          
          <div id="images-${p.id}" class="image-preview-grid"></div>
          
          <div class="actions">
            <button class="btn-secondary" onclick="openImageEdit(${p.id})">Editar Imagens</button>
            <button class="btn-secondary" data-archive="${p.id}" style="background:rgba(168,85,247,0.2);border-color:rgba(168,85,247,0.4);color:#c084fc">Arquivar</button>
            <button class="btn-danger" data-del="${p.id}">Excluir</button>
          </div>
        </div>
      </details>
    `;
  }).join('');
  
  data.forEach(p => loadProductImages(p.id));
  attachActiveProductsListeners();
}

// Load archived products
async function loadArchivedProducts() {
  if (!archivedList) return;
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('archived', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error(error);
    archivedList.innerHTML = '<p style="text-align:center;color:var(--muted)">Erro ao carregar arquivados</p>';
    return;
  }
  
  if (!data || data.length === 0) {
    archivedList.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px;font-style:italic">📭 Nenhum produto arquivado</p>';
    return;
  }
  
  archivedList.innerHTML = data.map(p => {
    const thumb = p.thumbnail || p.image_path;
    const thumbUrl = thumb ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${thumb}` : 'https://via.placeholder.com/60';
    
    return `
      <details class="admin-card" style="opacity:0.7">
        <summary>
          <img src="${thumbUrl}" alt="${p.title}" style="filter:grayscale(50%)">
          <strong>${p.title}</strong>
          <span class="muted">R$ ${Number(p.price).toFixed(2)}</span>
        </summary>
        <div class="admin-form">
          <div><strong>Slug:</strong> ${p.slug}</div>
          <div><strong>Estoque:</strong> ${p.stock || 0}</div>
          ${p.is_featured ? '<div style="color: var(--accent);">⭐ Em Destaque</div>' : ''}
          <div style="background:rgba(168,85,247,0.1);padding:8px;border-radius:8px;margin:12px 0;color:#c084fc;font-size:0.9rem">
            🗄️ <strong>Produto Arquivado</strong> - Não aparece na loja
          </div>
          
          <div id="images-archived-${p.id}" class="image-preview-grid"></div>
          
          <div class="actions">
            <button class="btn-primary" data-unarchive="${p.id}" style="flex:1">✅ Desarquivar</button>
            <button class="btn-danger" data-del="${p.id}">Excluir</button>
          </div>
        </div>
      </details>
    `;
  }).join('');
  
  data.forEach(p => loadProductImages(p.id, true));
  attachArchivedProductsListeners();
}

// Attach event listeners to active products
function attachActiveProductsListeners() {
  document.querySelectorAll('[data-archive]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Deseja arquivar este produto?\n\nEle não aparecerá mais na loja, mas você poderá desarquivá-lo depois.')) return;
      const id = btn.dataset.archive;
      const { error } = await supabase.from('products').update({ archived: true }).eq('id', id);
      if (error) return alert('Erro ao arquivar: ' + error.message);
      alert('✅ Produto arquivado com sucesso!');
      loadProducts();
      loadArchivedProducts();
      loadDashboard();
    });
  });
  
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('⚠️ ATENÇÃO! Deseja realmente EXCLUIR este produto PERMANENTEMENTE?\n\nEsta ação não pode ser desfeita!\n\nSe quiser apenas remover da loja, use "Arquivar" em vez de excluir.')) return;
      const id = btn.dataset.del;
      
      const { data: images } = await supabase.from('product_images').select('image_path').eq('product_id', id);
      if (images) {
        for (const img of images) {
          await supabase.storage.from('product-images').remove([img.image_path]);
        }
        await supabase.from('product_images').delete().eq('product_id', id);
      }
      
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) return alert('Erro ao excluir: ' + error.message);
      alert('🗑️ Produto excluído permanentemente!');
      loadProducts();
      loadArchivedProducts();
      loadDashboard();
    });
  });
}

// Attach event listeners to archived products
function attachArchivedProductsListeners() {
  document.querySelectorAll('[data-unarchive]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Desarquivar este produto?\n\nEle voltará a aparecer na loja imediatamente.')) return;
      const id = btn.dataset.unarchive;
      const { error } = await supabase.from('products').update({ archived: false }).eq('id', id);
      if (error) return alert('Erro ao desarquivar: ' + error.message);
      alert('✅ Produto desarquivado! Agora está visível na loja.');
      loadProducts();
      loadArchivedProducts();
      loadDashboard();
    });
  });
  
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('⚠️ ATENÇÃO! Deseja realmente EXCLUIR este produto PERMANENTEMENTE?\n\nEsta ação não pode ser desfeita!')) return;
      const id = btn.dataset.del;
      
      const { data: images } = await supabase.from('product_images').select('image_path').eq('product_id', id);
      if (images) {
        for (const img of images) {
          await supabase.storage.from('product-images').remove([img.image_path]);
        }
        await supabase.from('product_images').delete().eq('product_id', id);
      }
      
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) return alert('Erro ao excluir: ' + error.message);
      alert('🗑️ Produto excluído permanentemente!');
      loadProducts();
      loadArchivedProducts();
      loadDashboard();
    });
  });
}

// Load product images
async function loadProductImages(productId, isArchived = false) {
  const { data: images } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('position');

  const containerId = isArchived ? `images-archived-${productId}` : `images-${productId}`;
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = images?.map(img => `
    <div class="image-preview-item">
      <img src="${SUPABASE_URL}/storage/v1/object/public/product-images/${img.image_path}" alt="Imagem do produto">
    </div>
  `).join('') || '<p class="muted" style="grid-column:1/-1;text-align:center;font-size:0.85rem">Sem imagens</p>';
}

// Open image edit modal
async function openImageEdit(productId) {
  currentEditingProduct = { 
    id: productId, 
    tempFiles: {},
    originalFiles: {}
  };
  
  const modal = document.getElementById('image-edit-modal');
  modal.style.display = 'block';
  
  createImageSlots('edit-image-slots');
  
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
      
      currentEditingProduct.originalFiles[index] = {
        image_path: img.image_path,
        id: img.id
      };
    });
  }
}

// Save edited images
document.getElementById('save-images')?.addEventListener('click', async () => {
  if (!currentEditingProduct) return;
  
  const { id } = currentEditingProduct;
  const slots = document.querySelectorAll('#edit-image-slots .image-slot');
  const finalOrder = [];
  
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
  
  for (let i = 0; i < finalOrder.length; i++) {
    const item = finalOrder[i];
    let filePath;
    
    if (item.tempFile) {
      filePath = `${Date.now()}_${i}_${item.tempFile.name}`;
      const { error: upError } = await supabase.storage.from('product-images').upload(filePath, item.tempFile);
      if (upError) continue;
    } else if (item.existingImage) {
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
  loadArchivedProducts();
  alert('✅ Imagens reordenadas com sucesso!');
});

// Cancel image edit
document.getElementById('cancel-image-edit')?.addEventListener('click', () => {
  document.getElementById('image-edit-modal').style.display = 'none';
  currentEditingProduct = null;
});

// Create new product
newProductForm?.addEventListener('submit', async e => {
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
    is_featured: newProductForm.querySelector('[name="is_featured"]').checked,
    archived: false
  };
  
  const { data: product, error } = await supabase.from('products').insert([payload]).select().single();
  if (error || !product) return alert('Erro ao criar produto: ' + (error?.message || ''));
  
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
  
  alert('✅ Produto cadastrado com sucesso!');
  newProductForm.reset();
  selectedFiles = new Array(5).fill(null);
  createImageSlots('image-slots');
  loadProducts();
  loadArchivedProducts();
  loadDashboard();
});

// Initial load
loadCategories();
createImageSlots('image-slots');

// Make functions global
window.removeImage = removeImage;
window.openImageEdit = openImageEdit;