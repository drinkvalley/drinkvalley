// utils.js - Funções compartilhadas entre todos os módulos
export const Utils = {
  // LocalStorage seguro
  storage: {
    get(key, fallback = []) {
      try {
        return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  // Formatação
  formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  },

  // Toast notification
  toast(message, duration = window.DRINKVALLEY_CONFIG?.toastDuration || 3000) {
    const toastEl = document.getElementById('toast');
    if (!toastEl) {
      const div = document.createElement('div');
      div.id = 'toast';
      div.className = 'toast hidden';
      document.body.appendChild(div);
      return Utils.toast(message, duration); // Retry
    }

    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    requestAnimationFrame(() => toastEl.classList.add('show'));

    setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.classList.add('hidden'), 300);
    }, duration);
  },

  // Skeleton loader
  createSkeleton(count = window.DRINKVALLEY_CONFIG?.skeletonItems || 12) {
    return Array(count).fill(0).map(() => `
      <div class="card skeleton">
        <div class="skeleton-image"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
      </div>
    `).join('');
  },

  // Debounce
  debounce(func, wait) {
    let timeout;
    return function executed(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Get public URL
  getPublicUrl(path) {
    if (!path) return 'https://via.placeholder.com/400x500?text=Imagem';
    return `${window.ENV.SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
  },

  // SEO Meta tags
  updateMetaTags({ title, description, image }) {
    document.title = title;
    
    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // Open Graph
    const updateOG = (property, content) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.property = property;
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    updateOG('og:title', title);
    updateOG('og:description', description);
    updateOG('og:image', image);
  }
};